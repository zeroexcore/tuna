/**
 * List command - display all tunnels for configured domains
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { listDomains, getCredentials } from '../lib/credentials.ts';
import { CloudflareAPI } from '../lib/api.ts';
import { listDnsRecordsForTunnel } from '../lib/dns.ts';
import type { Tunnel } from '../types/index.ts';

/**
 * Format tunnel status with color
 */
function formatStatus(status: Tunnel['status']): string {
  switch (status) {
    case 'healthy':
      return chalk.green('● healthy');
    case 'degraded':
      return chalk.yellow('● degraded');
    case 'down':
      return chalk.red('● down');
    case 'inactive':
      return chalk.dim('○ inactive');
    default:
      return chalk.dim('○ unknown');
  }
}

/**
 * Format tunnel name (highlight tuna- tunnels)
 */
function formatTunnelName(name: string): string {
  if (name.startsWith('tuna-')) {
    return chalk.cyan(name);
  }
  return chalk.dim(name);
}

/**
 * List all tunnels for configured domains
 */
export async function listCommand(): Promise<void> {
  // Get all configured domains
  const domains = await listDomains();

  if (domains.length === 0) {
    console.log(chalk.yellow('\nNo credentials configured.'));
    console.log(chalk.dim('Run: tuna --login\n'));
    return;
  }

  // If multiple domains, let user choose
  let selectedDomain: string;

  if (domains.length === 1) {
    selectedDomain = domains[0];
  } else {
    const { domain } = await inquirer.prompt([
      {
        type: 'list',
        name: 'domain',
        message: 'Select domain:',
        choices: domains,
      },
    ]);
    selectedDomain = domain;
  }

  // Get credentials
  const spinner = ora('Fetching tunnels...').start();

  const credentials = await getCredentials(selectedDomain);
  if (!credentials) {
    spinner.fail('Failed to get credentials');
    console.error(chalk.red(`\nNo credentials found for ${selectedDomain}`));
    return;
  }

  // Fetch tunnels
  const api = new CloudflareAPI(credentials);
  let tunnels: Tunnel[];

  try {
    tunnels = await api.listTunnels();
    // Filter out deleted tunnels
    tunnels = tunnels.filter((t) => !t.deleted_at);
  } catch (error) {
    spinner.fail('Failed to fetch tunnels');
    console.error(chalk.red(`\nError: ${(error as Error).message}`));
    return;
  }

  spinner.stop();

  // Separate tuna tunnels from others
  const tunaTunnels = tunnels.filter((t) => t.name.startsWith('tuna-'));
  const otherTunnels = tunnels.filter((t) => !t.name.startsWith('tuna-'));

  console.log('');
  console.log(chalk.bold(`TUNNELS for ${selectedDomain}`), chalk.dim(`(${tunnels.length} total)`));
  console.log('');

  if (tunaTunnels.length === 0 && otherTunnels.length === 0) {
    console.log(chalk.dim('  No tunnels found.\n'));
    return;
  }

  // Display tuna tunnels
  if (tunaTunnels.length > 0) {
    console.log(chalk.dim('  Tuna Tunnels:'));

    for (const tunnel of tunaTunnels) {
      // Try to get DNS records for this tunnel
      let dnsRecords: string[] = [];
      try {
        dnsRecords = await listDnsRecordsForTunnel(credentials, tunnel.id, selectedDomain);
      } catch {
        // Ignore DNS lookup errors
      }

      const name = formatTunnelName(tunnel.name);
      const status = formatStatus(tunnel.status);
      const domains = dnsRecords.length > 0 ? dnsRecords.join(', ') : chalk.dim('no DNS');

      console.log(`    ${name}`);
      console.log(`      ${status}  ${domains}`);
    }
    console.log('');
  }

  // Display other tunnels (non-tuna)
  if (otherTunnels.length > 0) {
    console.log(chalk.dim('  Other Tunnels:'));

    for (const tunnel of otherTunnels) {
      const name = formatTunnelName(tunnel.name);
      const status = formatStatus(tunnel.status);

      console.log(`    ${name}  ${status}`);
    }
    console.log('');
  }

  // Show connection info for active tunnels
  const activeTunnels = tunaTunnels.filter((t) => t.status === 'healthy');
  if (activeTunnels.length > 0) {
    console.log(chalk.dim('  Active connections:'));
    for (const tunnel of activeTunnels) {
      if (tunnel.connections && tunnel.connections.length > 0) {
        for (const conn of tunnel.connections) {
          console.log(chalk.dim(`    ${tunnel.name}: ${conn.colo_name} (${conn.origin_ip})`));
        }
      }
    }
    console.log('');
  }
}
