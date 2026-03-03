/**
 * Login command - setup Cloudflare credentials
 */

import { exec } from 'node:child_process';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { storeCredentials } from '../lib/credentials.ts';
import { CloudflareAPI } from '../lib/api.ts';
import type { Credentials } from '../types/index.ts';

/**
 * Cloudflare token template URL with pre-filled permissions.
 * @see https://developers.cloudflare.com/fundamentals/api/how-to/account-owned-token-template/
 * @see https://developers.cloudflare.com/fundamentals/api/reference/permissions/
 */
function buildTokenTemplateUrl(): string {
  // Key list: https://cfdata.lol/tools/api-token-url-generator/
  const permissions = [
    { key: 'argotunnel', type: 'edit' },
    { key: 'dns', type: 'edit' },
    { key: 'access', type: 'edit' },
    { key: 'account_settings', type: 'read' },
  ];
  const encoded = encodeURIComponent(JSON.stringify(permissions));
  return `https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=${encoded}&name=tuna&accountId=*&zoneId=all`;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

/**
 * Interactive login flow to setup Cloudflare credentials
 */
export async function loginCommand(): Promise<void> {
  console.log(chalk.blue('\n🔐 Tuna Login\n'));

  const tokenUrl = buildTokenTemplateUrl();

  console.log(
    chalk.dim(
      'Opening Cloudflare dashboard to create an API token with the right permissions...\n',
    ),
  );
  openBrowser(tokenUrl);

  console.log(chalk.dim('  All permissions are pre-filled. Just click "Continue to summary" then "Create Token".\n'));
  console.log(chalk.dim(`  If the browser didn't open, visit:`));
  console.log(chalk.cyan(`  ${tokenUrl}\n`));

  const { apiToken } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiToken',
      message: 'Paste your API token:',
      mask: '*',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'API token is required';
        }
        return true;
      },
    },
  ]);

  const spinner = ora('Validating token...').start();

  let accountId: string;
  let accountName: string;
  try {
    const tempApi = new CloudflareAPI({
      apiToken: apiToken.trim(),
      accountId: '',
      domain: '',
    });

    const accountInfo = await tempApi.validateToken();
    accountId = accountInfo.id;
    accountName = accountInfo.name;
    spinner.succeed(`Token validated (${accountName})`);
  } catch (error) {
    spinner.fail('Invalid token');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    process.exit(1);
  }

  // Fetch available zones and let user pick
  const zonesSpinner = ora('Fetching your domains...').start();

  let domain: string;
  try {
    const api = new CloudflareAPI({
      apiToken: apiToken.trim(),
      accountId,
      domain: '',
    });

    const zones = await api.listZones();

    if (zones.length === 0) {
      zonesSpinner.fail('No domains found');
      console.error(
        chalk.red('\nNo active domains found in your Cloudflare account.'),
      );
      console.log(
        chalk.yellow('Add a domain at https://dash.cloudflare.com first.'),
      );
      process.exit(1);
    }

    zonesSpinner.succeed(`Found ${zones.length} domain${zones.length > 1 ? 's' : ''}`);

    if (zones.length === 1) {
      domain = zones[0].name;
      console.log(chalk.dim(`  Using ${domain}\n`));
    } else {
      const answer = await inquirer.prompt([
        {
          type: 'select',
          name: 'domain',
          message: 'Select your domain:',
          choices: zones.map((z) => ({ name: z.name, value: z.name })),
        },
      ]);
      domain = answer.domain;
    }
  } catch (error) {
    zonesSpinner.fail('Failed to fetch domains');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    process.exit(1);
  }

  const saveSpinner = ora('Saving credentials...').start();

  try {
    const credentials: Credentials = {
      apiToken: apiToken.trim(),
      accountId,
      accountName,
      domain: domain.trim(),
    };

    await storeCredentials(domain.trim(), credentials);
    saveSpinner.succeed('Credentials saved to ~/.config/tuna/');
  } catch (error) {
    saveSpinner.fail('Failed to save credentials');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    process.exit(1);
  }

  console.log(chalk.green('\n✓ Login successful!\n'));
  console.log(chalk.dim('You can now use tuna to create tunnels for this domain.'));
  console.log(chalk.dim('Example:\n'));
  console.log(chalk.dim('  Add to your package.json:'));
  console.log(chalk.cyan('  {'));
  console.log(chalk.cyan('    "tuna": {'));
  console.log(chalk.cyan(`      "forward": "my-app.${domain.trim()}",`));
  console.log(chalk.cyan('      "port": 3000'));
  console.log(chalk.cyan('    }'));
  console.log(chalk.cyan('  }\n'));
  console.log(chalk.dim('  Then run:'));
  console.log(chalk.cyan('  tuna npm run dev\n'));
}
