/**
 * Run command - main wrapper that sets up tunnel and runs the child command
 */

import chalk from 'chalk';
import ora from 'ora';
import { execa, type ExecaError } from 'execa';
import { randomBytes } from 'crypto';
import { readConfig, generateTunnelName } from '../lib/config.ts';
import { getCredentials, getRootDomain } from '../lib/credentials.ts';
import { CloudflareAPI } from '../lib/api.ts';
import { isInstalled, download, ensureDirectories } from '../lib/cloudflared.ts';
import {
  generateIngressConfig,
  writeIngressConfig,
  saveTunnelCredentials,
  tunnelCredentialsExist,
  installService,
  isServiceInstalled,
  updateServiceConfig,
} from '../lib/service.ts';
import { ensureDnsRecord } from '../lib/dns.ts';
import { ensureAccess, getAccessDescription } from '../lib/access.ts';
import type { Tunnel, AccessConfig } from '../types/index.ts';

/**
 * Main run command - sets up tunnel and executes wrapped command
 */
export async function runCommand(args: string[]): Promise<void> {
  // Read config from package.json
  let config: { forward: string; port: number; access?: AccessConfig };
  try {
    config = await readConfig();
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }

  const { forward, port, access } = config;
  const rootDomain = getRootDomain(forward);
  const tunnelName = generateTunnelName(forward);

  // Get credentials
  const spinner = ora('Authenticating...').start();

  const credentials = await getCredentials(rootDomain);
  if (!credentials) {
    spinner.fail('Not logged in');
    console.error(chalk.red(`\nNo credentials found for ${rootDomain}`));
    console.log(chalk.yellow('Run: tuna --login'));
    process.exit(1);
  }

  spinner.text = 'Checking cloudflared...';

  // Ensure cloudflared is installed
  if (!isInstalled()) {
    spinner.text = 'Downloading cloudflared...';
    try {
      await download((percent) => {
        spinner.text = `Downloading cloudflared... ${percent}%`;
      });
      spinner.succeed('cloudflared downloaded');
      spinner.start('Setting up tunnel...');
    } catch (error) {
      spinner.fail('Failed to download cloudflared');
      console.error(chalk.red(`\nError: ${(error as Error).message}`));
      console.log(chalk.yellow('\nYou can install manually:'));
      console.log(chalk.yellow('  brew install cloudflared'));
      process.exit(1);
    }
  }

  ensureDirectories();

  // Initialize API client
  const api = new CloudflareAPI(credentials);

  // Check if tunnel exists
  spinner.text = 'Checking tunnel...';
  let tunnel: Tunnel | undefined;

  try {
    const tunnels = await api.listTunnels();
    tunnel = tunnels.find((t) => t.name === tunnelName && !t.deleted_at);
  } catch (error) {
    spinner.fail('Failed to check tunnels');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    process.exit(1);
  }

  // Create tunnel if it doesn't exist
  if (!tunnel) {
    spinner.text = 'Creating tunnel...';
    try {
      // Generate tunnel secret (32 bytes, base64 encoded)
      const tunnelSecret = randomBytes(32).toString('base64');

      tunnel = await api.createTunnel(tunnelName, tunnelSecret);

      // Save tunnel credentials
      saveTunnelCredentials(tunnel.id, credentials.accountId, tunnelSecret);

      spinner.succeed(`Tunnel created: ${tunnelName}`);
      spinner.start('Setting up DNS...');
    } catch (error) {
      spinner.fail('Failed to create tunnel');
      console.error(chalk.red(`\nError: ${(error as Error).message}`));
      process.exit(1);
    }
  } else {
    // Check if we have local credentials
    if (!tunnelCredentialsExist(tunnel.id)) {
      spinner.fail('Tunnel exists but local credentials missing');
      console.error(
        chalk.red('\nThe tunnel exists on Cloudflare but local credentials are missing.')
      );
      console.log(chalk.yellow('Options:'));
      console.log(chalk.yellow('  1. Delete the tunnel and let tuna recreate it:'));
      console.log(chalk.cyan(`     tuna --delete ${tunnelName}`));
      console.log(chalk.yellow('  2. Manually recreate the credentials file'));
      process.exit(1);
    }
    spinner.succeed(`Using existing tunnel: ${tunnelName}`);
    spinner.start('Setting up DNS...');
  }

  // Ensure DNS record
  try {
    await ensureDnsRecord(credentials, forward, tunnel.id);
    spinner.succeed('DNS configured');
    spinner.start('Starting service...');
  } catch (error) {
    spinner.fail('Failed to configure DNS');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    process.exit(1);
  }

  // Generate and write ingress config
  const ingressConfig = generateIngressConfig(tunnel.id, forward, port);
  writeIngressConfig(tunnel.id, ingressConfig);

  // Install or update service - always restart to pick up config changes
  try {
    if (!isServiceInstalled()) {
      await installService(tunnel.id);
      spinner.succeed('Service installed');
    } else {
      await updateServiceConfig(tunnel.id);
      spinner.succeed('Service restarted');
    }
  } catch (error) {
    console.log(error);
    spinner.fail('Failed to start service');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    process.exit(1);
  }

  // Setup Zero Trust Access if configured
  let accessConfigured = false;
  if (access && access.length > 0) {
    spinner.start('Configuring access control...');
    try {
      await ensureAccess(credentials, forward, access);
      accessConfigured = true;
      spinner.succeed('Access control configured');
    } catch (error) {
      spinner.fail('Failed to configure access control');
      console.error(chalk.red(`\nError: ${(error as Error).message}`));
      console.log(chalk.yellow('\nTunnel is active but without access control.'));
      console.log(chalk.yellow('Your API token may need additional permissions:'));
      console.log(chalk.yellow('  - Account → Access: Apps and Policies → Edit'));
    }
  } else {
    // No access config - remove any existing Access app
    try {
      await ensureAccess(credentials, forward, undefined);
    } catch {
      // Ignore errors when removing - may not have permissions or app doesn't exist
    }
  }

  // Display tunnel info
  console.log('');
  console.log(chalk.green('✓ Tunnel active'));
  console.log(chalk.cyan(`  https://${forward}`), chalk.dim(`→ localhost:${port}`));
  if (accessConfigured && access) {
    console.log(chalk.dim(`  Access: ${getAccessDescription(access)}`));
  }
  console.log('');

  // Execute wrapped command
  if (args.length === 0) {
    // No command to run, just setup tunnel
    console.log(chalk.dim('Tunnel is running. Press Ctrl+C to exit.'));

    // Keep process alive
    await new Promise(() => {}); // Never resolves
    return;
  }

  const [command, ...commandArgs] = args;

  console.log(chalk.dim(`Running: ${command} ${commandArgs.join(' ')}\n`));

  try {
    // Spawn child process with stdio inheritance
    const childProcess = execa(command, commandArgs, {
      stdio: 'inherit',
      env: {
        ...process.env,
        TUNA_TUNNEL_URL: `https://${forward}`,
        TUNA_TUNNEL_ID: tunnel.id,
      },
    });

    // Forward signals to child
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    for (const signal of signals) {
      process.on(signal, () => {
        childProcess.kill(signal);
      });
    }

    const result = await childProcess;
    process.exit(result.exitCode ?? 0);
  } catch (error) {
    const execaError = error as ExecaError;

    // If command not found
    if (execaError.code === 'ENOENT') {
      console.error(chalk.red(`\nCommand not found: ${command}`));
      process.exit(127);
    }

    // Exit with child's exit code
    process.exit(execaError.exitCode ?? 1);
  }
}
