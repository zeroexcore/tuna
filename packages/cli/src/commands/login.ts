/**
 * Login command - setup Cloudflare credentials
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { storeCredentials } from '../lib/credentials.ts';
import { CloudflareAPI } from '../lib/api.ts';
import type { Credentials } from '../types/index.ts';

/**
 * Interactive login flow to setup Cloudflare credentials
 */
export async function loginCommand(): Promise<void> {
  console.log(chalk.blue('\n🔐 Tuna Login\n'));
  console.log(chalk.dim('Store your Cloudflare credentials securely in ~/.config/tuna/.\n'));

  // Prompt for API token
  console.log(chalk.dim('Create a token at: https://dash.cloudflare.com/profile/api-tokens'));
  console.log(chalk.dim('Required permissions:'));
  console.log(chalk.dim('  • Account → Cloudflare Tunnel → Edit'));
  console.log(chalk.dim('  • Account → Access: Apps and Policies → Edit'));
  console.log(chalk.dim('  • Zone → DNS → Edit'));
  console.log(chalk.dim('  • Account → Account Settings → Read\n'));

  const { apiToken } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiToken',
      message: 'Enter your Cloudflare API token:',
      mask: '*',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'API token is required';
        }
        return true;
      },
    },
  ]);

  // Validate token and get account info
  const spinner = ora('Validating token...').start();

  let accountId: string;
  let accountName: string;
  try {
    // Create a temporary API instance to validate
    const tempApi = new CloudflareAPI({
      apiToken: apiToken.trim(),
      accountId: '', // Will be fetched
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

  // Prompt for domain
  const { domain } = await inquirer.prompt([
    {
      type: 'input',
      name: 'domain',
      message: 'Enter your root domain (e.g., example.com):',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Domain is required';
        }
        // Basic domain validation
        const domainRegex = /^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/i;
        if (!domainRegex.test(input.trim())) {
          return 'Invalid domain format. Enter just the root domain (e.g., example.com)';
        }
        return true;
      },
    },
  ]);

  // Verify domain access
  const domainSpinner = ora('Verifying domain access...').start();

  try {
    const api = new CloudflareAPI({
      apiToken: apiToken.trim(),
      accountId,
      domain: domain.trim(),
    });

    await api.getZoneByName(domain.trim());
    domainSpinner.succeed('Domain verified');
  } catch (error) {
    domainSpinner.fail('Domain verification failed');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    console.log(chalk.yellow('\nMake sure:'));
    console.log(chalk.yellow('  1. The domain is added to your Cloudflare account'));
    console.log(chalk.yellow('  2. Your API token has access to this domain'));
    process.exit(1);
  }

  // Store credentials
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
