/**
 * Delete command - delete a tunnel and its DNS records
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { readConfig, generateTunnelName } from '../lib/config.ts';
import { getCredentials, getRootDomain, listDomains } from '../lib/credentials.ts';
import { CloudflareAPI } from '../lib/api.ts';
import { deleteDnsRecordForDomain, listDnsRecordsForTunnel } from '../lib/dns.ts';
import {
  stopService,
  deleteTunnelCredentials,
  deleteTunnelConfig,
  isServiceInstalled,
} from '../lib/service.ts';
import { removeAccess } from '../lib/access.ts';
import type { Tunnel } from '../types/index.ts';

/**
 * Delete a specific tunnel by name or from package.json config
 */
export async function deleteCommand(tunnelNameArg?: string | boolean): Promise<void> {
  console.log('');

  let tunnelName: string;
  let forward: string | undefined;
  let rootDomain: string;

  // Determine tunnel name
  if (tunnelNameArg && typeof tunnelNameArg === 'string') {
    // Tunnel name provided as argument
    tunnelName = tunnelNameArg;
    if (!tunnelName.startsWith('tuna-')) {
      tunnelName = `tuna-${tunnelName}`;
    }
  } else {
    // Try to read from package.json
    try {
      const config = await readConfig();
      forward = config.forward;
      tunnelName = generateTunnelName(forward);
    } catch {
      // No config found, ask user to specify
      console.error(chalk.red('No tunnel name specified and no tuna config in package.json.'));
      console.log(chalk.dim('\nUsage: tuna --delete <tunnel-name>'));
      console.log(chalk.dim('Or run from a directory with tuna config in package.json.\n'));
      process.exit(1);
    }
  }

  // Get root domain - either from forward or ask user
  if (forward) {
    rootDomain = getRootDomain(forward);
  } else {
    // Get all configured domains
    const domains = await listDomains();

    if (domains.length === 0) {
      console.error(chalk.red('No credentials configured.'));
      console.log(chalk.dim('Run: tuna --login\n'));
      process.exit(1);
    }

    if (domains.length === 1) {
      rootDomain = domains[0];
    } else {
      const { domain } = await inquirer.prompt([
        {
          type: 'list',
          name: 'domain',
          message: 'Select domain for this tunnel:',
          choices: domains,
        },
      ]);
      rootDomain = domain;
    }
  }

  // Get credentials
  const credentials = await getCredentials(rootDomain);
  if (!credentials) {
    console.error(chalk.red(`No credentials found for ${rootDomain}`));
    console.log(chalk.dim('Run: tuna --login\n'));
    process.exit(1);
  }

  // Find the tunnel
  const spinner = ora('Finding tunnel...').start();
  const api = new CloudflareAPI(credentials);

  let tunnel: Tunnel | undefined;
  try {
    const tunnels = await api.listTunnels();
    tunnel = tunnels.find((t) => t.name === tunnelName && !t.deleted_at);
  } catch (error) {
    spinner.fail('Failed to fetch tunnels');
    console.error(chalk.red(`\nError: ${(error as Error).message}\n`));
    process.exit(1);
  }

  if (!tunnel) {
    spinner.fail(`Tunnel not found: ${tunnelName}`);
    console.log(chalk.dim('\nRun: tuna --list to see all tunnels.\n'));
    process.exit(1);
  }

  spinner.stop();

  // Get DNS records for this tunnel
  let dnsRecords: string[] = [];
  try {
    dnsRecords = await listDnsRecordsForTunnel(credentials, tunnel.id, rootDomain);
  } catch {
    // Ignore errors
  }

  // Show what will be deleted
  console.log(chalk.yellow('The following will be deleted:\n'));
  console.log(`  Tunnel: ${chalk.cyan(tunnel.name)}`);
  console.log(`  ID: ${chalk.dim(tunnel.id)}`);

  if (dnsRecords.length > 0) {
    console.log(`  DNS records: ${dnsRecords.join(', ')}`);
  }

  console.log('');

  // Confirm deletion
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to delete this tunnel?',
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.dim('\nDeletion cancelled.\n'));
    return;
  }

  // Delete process
  const deleteSpinner = ora('Deleting tunnel...').start();

  try {
    // 1. Stop service if running
    deleteSpinner.text = 'Stopping service...';
    if (isServiceInstalled()) {
      await stopService();
    }

    // 2. Delete Access application (if exists)
    deleteSpinner.text = 'Removing access control...';
    for (const record of dnsRecords) {
      try {
        await removeAccess(credentials, record);
      } catch {
        // Ignore errors - may not have permissions or app doesn't exist
      }
    }

    // 3. Delete DNS records
    deleteSpinner.text = 'Deleting DNS records...';
    for (const record of dnsRecords) {
      await deleteDnsRecordForDomain(credentials, record);
    }

    // 4. Delete tunnel from Cloudflare
    deleteSpinner.text = 'Deleting tunnel...';
    await api.deleteTunnel(tunnel.id);

    // 5. Delete local files
    deleteSpinner.text = 'Cleaning up local files...';
    deleteTunnelCredentials(tunnel.id);
    deleteTunnelConfig(tunnel.id);

    // 6. Uninstall service if no other tunnels
    // (We leave the service installed for now - user can manually uninstall)

    deleteSpinner.succeed('Tunnel deleted');
    console.log('');
    console.log(chalk.green(`✓ Tunnel ${tunnelName} has been deleted.\n`));
  } catch (error) {
    deleteSpinner.fail('Failed to delete tunnel');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    console.log(chalk.yellow('\nPartial deletion may have occurred.'));
    console.log(chalk.dim('Check: tuna --list\n'));
    process.exit(1);
  }
}
