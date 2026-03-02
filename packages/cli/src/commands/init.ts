/**
 * Init command - interactive project setup
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { readFile, writeFile } from 'fs/promises';
import { findPackageJson } from '../lib/config.ts';
import { listDomains, getCredentials } from '../lib/credentials.ts';

interface InitAnswers {
  subdomain: string;
  port: number;
  useEnvVar: boolean;
  enableAccess: boolean;
  accessRules?: string;
}

/**
 * Interactive init flow to setup tuna config in package.json
 */
export async function initCommand(): Promise<void> {
  console.log(chalk.blue('\n🐟 Tuna Project Setup\n'));

  // Check for package.json
  const pkgPath = await findPackageJson();
  if (!pkgPath) {
    console.error(chalk.red('Error: No package.json found.'));
    console.log(chalk.dim('Run this command from your project directory.'));
    console.log(chalk.dim('\nTo create a new project:'));
    console.log(chalk.cyan('  npm init -y'));
    process.exit(1);
  }

  // Read existing package.json
  const pkgContent = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);

  // Check if tuna config already exists
  if (pkg.tuna) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Tuna config already exists. Overwrite?',
        default: false,
      },
    ]);

    if (!overwrite) {
      console.log(chalk.dim('Keeping existing config.'));
      return;
    }
  }

  // Try to get stored credentials to suggest domain
  let storedDomain: string | undefined;
  try {
    // Check if we have any credentials stored
    const domains = await listDomains();
    if (domains.length > 1) {
      // Multiple profiles available - let user choose
      const choices = await Promise.all(
        domains.map(async (d) => {
          const creds = await getCredentials(d);
          const label = creds?.accountName
            ? `${creds.accountName} (${d})`
            : d;
          return { name: label, value: d };
        })
      );

      const { selectedDomain } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedDomain',
          message: 'Select Cloudflare profile:',
          choices,
        },
      ]);

      const creds = await getCredentials(selectedDomain);
      if (creds) {
        storedDomain = creds.domain;
      }
    } else if (domains.length === 1) {
      // Use the single configured domain
      const creds = await getCredentials(domains[0]);
      if (creds) {
        storedDomain = creds.domain;
      }
    }
  } catch {
    // No credentials stored, that's fine
  }

  // Check if credentials are set up
  if (!storedDomain) {
    console.log(chalk.yellow('No Cloudflare credentials found.'));
    console.log(chalk.dim('Run `tuna --login` first to set up your credentials.\n'));
    
    const { continueAnyway } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueAnyway',
        message: 'Continue with setup anyway?',
        default: true,
      },
    ]);

    if (!continueAnyway) {
      console.log(chalk.dim('\nRun `tuna --login` then `tuna --init`'));
      return;
    }
  }

  const domainSuffix = storedDomain ? `.${storedDomain}` : '.example.com';
  const projectName = pkg.name || 'my-app';

  // Interactive prompts
  const answers = await inquirer.prompt<InitAnswers>([
    {
      type: 'confirm',
      name: 'useEnvVar',
      message: 'Use $USER variable for unique subdomains per developer?',
      default: true,
    },
    {
      type: 'input',
      name: 'subdomain',
      message: (answers) => 
        answers.useEnvVar 
          ? `Subdomain pattern (will become $USER-<pattern>${domainSuffix}):`
          : `Full subdomain (will become <subdomain>${domainSuffix}):`,
      default: projectName.replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Subdomain is required';
        }
        if (!/^[a-z0-9][a-z0-9-]*$/i.test(input.trim())) {
          return 'Subdomain must start with a letter/number and contain only letters, numbers, and hyphens';
        }
        return true;
      },
    },
    {
      type: 'number',
      name: 'port',
      message: 'Local port to forward:',
      default: 3000,
      validate: (input: number) => {
        if (isNaN(input) || input < 1 || input > 65535) {
          return 'Port must be between 1 and 65535';
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'enableAccess',
      message: 'Enable Zero Trust Access control?',
      default: false,
    },
    {
      type: 'input',
      name: 'accessRules',
      message: 'Access rules (comma-separated emails or @domains):',
      when: (answers) => answers.enableAccess,
      default: storedDomain ? `@${storedDomain}` : '@yourcompany.com',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'At least one access rule is required';
        }
        return true;
      },
    },
  ]);

  // Build the forward domain
  const subdomain = answers.subdomain.trim().toLowerCase();
  const forward = answers.useEnvVar
    ? `$USER-${subdomain}${domainSuffix}`
    : `${subdomain}${domainSuffix}`;

  // Build config
  const tunaConfig: Record<string, unknown> = {
    forward,
    port: answers.port,
  };

  if (answers.enableAccess && answers.accessRules) {
    tunaConfig.access = answers.accessRules
      .split(',')
      .map((rule) => rule.trim())
      .filter((rule) => rule.length > 0);
  }

  // Update package.json
  const spinner = ora('Updating package.json...').start();

  try {
    pkg.tuna = tunaConfig;
    
    // Preserve formatting by using 2-space indent
    const newContent = JSON.stringify(pkg, null, 2) + '\n';
    await writeFile(pkgPath, newContent, 'utf-8');
    
    spinner.succeed('Configuration saved to package.json');
  } catch (error) {
    spinner.fail('Failed to update package.json');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    process.exit(1);
  }

  // Show result
  console.log(chalk.green('\n✓ Tuna configured!\n'));
  console.log(chalk.dim('Added to package.json:'));
  console.log(chalk.cyan(JSON.stringify({ tuna: tunaConfig }, null, 2)));

  // Show next steps
  console.log(chalk.dim('\nNext steps:'));
  if (!storedDomain) {
    console.log(chalk.dim('  1. Run: ') + chalk.cyan('tuna --login'));
    console.log(chalk.dim('  2. Update the domain in package.json'));
    console.log(chalk.dim('  3. Run: ') + chalk.cyan('tuna npm run dev'));
  } else {
    console.log(chalk.dim('  Run: ') + chalk.cyan('tuna npm run dev'));
  }

  // Show example URL
  const exampleUser = process.env.USER || 'alice';
  const exampleUrl = answers.useEnvVar
    ? `https://${exampleUser}-${subdomain}${domainSuffix}`
    : `https://${subdomain}${domainSuffix}`;
  
  console.log(chalk.dim('\nYour tunnel URL will be:'));
  console.log(chalk.cyan(`  ${exampleUrl}`));
  
  if (answers.useEnvVar) {
    console.log(chalk.dim(`\n  (Each developer gets their own URL based on $USER)`));
  }
  console.log();
}
