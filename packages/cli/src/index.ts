#!/usr/bin/env -S npx tsx
/**
 * Tuna - Cloudflare Tunnel Wrapper for Development Servers
 * CLI entry point
 */

import chalk from 'chalk';
import { loginCommand } from './commands/login.ts';
import { initCommand } from './commands/init.ts';
import { runCommand } from './commands/run.ts';
import { listCommand } from './commands/list.ts';
import { stopCommand } from './commands/stop.ts';
import { deleteCommand } from './commands/delete.ts';

const version = '0.1.0';

function showHelp(): void {
  console.log(`
${chalk.bold('tuna')} - Cloudflare Tunnel Wrapper for Development Servers

${chalk.dim('Usage:')}
  tuna [options]
  tuna <command> [args...]

${chalk.dim('Options:')}
  --init           Interactive project setup
  --login          Setup Cloudflare credentials
  --list           List all tunnels
  --stop           Stop cloudflared service
  --delete [name]  Delete tunnel (from config or by name)
  --version, -V    Show version
  --help, -h       Show this help

${chalk.dim('Examples:')}
  $ tuna --init                     Interactive project setup
  $ tuna --login                    Setup Cloudflare credentials
  $ tuna npm run dev                Run dev server with tunnel
  $ tuna vite dev --port 3000       Run vite with tunnel
  $ tuna --list                     List all tunnels
  $ tuna --stop                     Stop cloudflared service
  $ tuna --delete                   Delete tunnel from package.json
  $ tuna --delete my-tunnel         Delete specific tunnel

${chalk.dim('Configuration:')}
  Add to your package.json:
  {
    "tuna": {
      "forward": "my-app.example.com",
      "port": 3000
    }
  }

  For team collaboration (unique subdomains per user):
  {
    "tuna": {
      "forward": "$USER-api.example.com",
      "port": 3000
    }
  }
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // No arguments - show help
  if (args.length === 0) {
    showHelp();
    return;
  }

  const firstArg = args[0];

  try {
    // Handle management commands (flags)
    if (firstArg === '--help' || firstArg === '-h') {
      showHelp();
      return;
    }

    if (firstArg === '--version' || firstArg === '-V') {
      console.log(version);
      return;
    }

    if (firstArg === '--init') {
      await initCommand();
      return;
    }

    if (firstArg === '--login') {
      await loginCommand();
      return;
    }

    if (firstArg === '--list') {
      await listCommand();
      return;
    }

    if (firstArg === '--stop') {
      await stopCommand();
      return;
    }

    if (firstArg === '--delete') {
      // Optional tunnel name as second argument
      const tunnelName = args[1];
      await deleteCommand(tunnelName);
      return;
    }

    // Check for unknown flags
    if (firstArg.startsWith('--')) {
      console.error(chalk.red(`Unknown option: ${firstArg}`));
      console.log(chalk.dim('Run: tuna --help'));
      process.exit(1);
    }

    // Default: wrapper command
    // All arguments are passed to the wrapped command
    await runCommand(args);
  } catch (error) {
    console.error(chalk.red('Error:'), (error as Error).message);
    process.exit(1);
  }
}

main();
