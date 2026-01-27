# @zeroexcore/tuna

**Cloudflare Tunnels for humans.** Wrap any dev command with a secure, persistent tunnel.

[![npm version](https://img.shields.io/npm/v/@zeroexcore/tuna.svg)](https://www.npmjs.com/package/@zeroexcore/tuna)
[![CI](https://github.com/zeroexcore/tuna/actions/workflows/ci.yml/badge.svg)](https://github.com/zeroexcore/tuna/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Links

- **Website:** [tuna.oxc.sh](https://tuna.oxc.sh)
- **Documentation:** [docs.tuna.oxc.sh](https://docs.tuna.oxc.sh)
- **GitHub:** [github.com/zeroexcore/tuna](https://github.com/zeroexcore/tuna)

## What is tuna?

tuna wraps your development server commands with automatic Cloudflare Tunnel setup. No more manual tunnel configuration, DNS management, or random ngrok URLs.

```bash
# Before: Manual tunnel setup
cloudflared tunnel create my-tunnel
cloudflared tunnel route dns my-tunnel my-app.example.com
cloudflared tunnel run my-tunnel &
vite dev

# After: Just prefix with tuna
tuna vite dev
```

Your local server is instantly available at `https://my-app.example.com`.

## Features

- **Free custom domains** - Use your own domain, no random URLs
- **Persistent tunnels** - Runs as a service, survives terminal restarts
- **Team collaboration** - `$USER` variable gives each dev their own subdomain
- **Zero Trust Access** - Restrict access by email/domain in config
- **Transparent wrapper** - Colors, TTY, exit codes all preserved

## Installation

```bash
npm install -g @zeroexcore/tuna
# or
pnpm add -g @zeroexcore/tuna
# or
npx @zeroexcore/tuna <command>
```

## Quick Start

### 1. Login to Cloudflare

```bash
tuna --login
```

You'll need a Cloudflare API token with these permissions:
- Account → Cloudflare Tunnel → Edit
- Account → Access: Apps and Policies → Edit
- Zone → DNS → Edit
- Account → Account Settings → Read

### 2. Configure your project

Add to `package.json`:

```json
{
  "tuna": {
    "forward": "my-app.example.com",
    "port": 3000
  }
}
```

Or use the interactive setup:

```bash
tuna --init
```

### 3. Run your dev server

```bash
tuna vite dev
# or
tuna npm run dev
# or
tuna next dev
```

That's it! Your local server is now available at your custom domain.

## Team Collaboration

Use `$USER` to give each developer their own subdomain:

```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

- Alice runs `tuna vite dev` → `https://alice-api.example.com`
- Bob runs `tuna vite dev` → `https://bob-api.example.com`

## Access Control

Restrict who can access your tunnel:

```json
{
  "tuna": {
    "forward": "staging.example.com",
    "port": 3000,
    "access": ["@mycompany.com", "contractor@gmail.com"]
  }
}
```

## Commands

| Command | Description |
|---------|-------------|
| `tuna <command>` | Wrap command with tunnel |
| `tuna --init` | Interactive project setup |
| `tuna --login` | Setup Cloudflare credentials |
| `tuna --list` | List all tunnels |
| `tuna --stop` | Stop cloudflared service |
| `tuna --delete [name]` | Delete tunnel |
| `tuna --help` | Show help |
| `tuna --version` | Show version |

## Configuration

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `forward` | `string` | Yes | Domain to expose (supports `$USER`, `$TUNA_USER`) |
| `port` | `number` | Yes | Local port to forward |
| `access` | `string[]` | No | Email addresses/domains for access control |

## Requirements

- Node.js 18+
- macOS (Linux/Windows support planned)
- A Cloudflare account with a domain

## Security

- **Credentials** stored in macOS Keychain with biometric auth
- **No secrets** in package.json or environment variables
- **Zero Trust Access** for fine-grained access control
- **TLS everywhere** via Cloudflare

## License

MIT - see [LICENSE](https://github.com/zeroexcore/tuna/blob/main/LICENSE) for details.
