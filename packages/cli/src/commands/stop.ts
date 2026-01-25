/**
 * Stop command - stop the cloudflared service
 */

import chalk from 'chalk';
import ora from 'ora';
import { stopService, getServiceStatus, isServiceInstalled } from '../lib/service.ts';

/**
 * Stop the cloudflared service
 */
export async function stopCommand(): Promise<void> {
  console.log('');

  // Check if service is installed
  if (!isServiceInstalled()) {
    console.log(chalk.yellow('Cloudflared service is not installed.'));
    console.log(chalk.dim('Run tuna with a command to set up a tunnel first.\n'));
    return;
  }

  // Check current status
  const status = await getServiceStatus();

  if (!status.running) {
    console.log(chalk.yellow('Cloudflared service is not running.\n'));
    return;
  }

  // Stop the service
  const spinner = ora('Stopping cloudflared service...').start();

  try {
    await stopService();
    spinner.succeed('Cloudflared service stopped');
    console.log('');
    console.log(chalk.dim('Your tunnels are no longer active.'));
    console.log(chalk.dim('Run tuna with a command to start them again.\n'));
  } catch (error) {
    spinner.fail('Failed to stop service');
    console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
    process.exit(1);
  }
}
