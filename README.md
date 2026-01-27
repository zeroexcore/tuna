# tuna

**Cloudflare Tunnels for humans.** Wrap any dev command with a secure, persistent tunnel.

[![npm version](https://img.shields.io/npm/v/@zeroexcore/tuna.svg)](https://www.npmjs.com/package/@zeroexcore/tuna)
[![CI](https://github.com/zeroexcore/tuna/actions/workflows/ci.yml/badge.svg)](https://github.com/zeroexcore/tuna/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

<!-- TODO: Add demo GIF here -->
<!-- ![tuna demo](./assets/demo.gif) -->

```bash
# Before: Manual tunnel setup nightmare
cloudflared tunnel create my-tunnel
cloudflared tunnel route dns my-tunnel my-app.example.com
cloudflared tunnel run my-tunnel &
vite dev --port 3000

# After: Just prefix with tuna
tuna vite dev --port 3000
```

## Why tuna?

| Feature | tuna | ngrok | localtunnel | cloudflared |
|---------|:----:|:-----:|:-----------:|:-----------:|
| Free custom domains | Yes | No | No | Yes |
| Persistent tunnels | Yes | No | No | Yes |
| Zero config | Yes | No | Yes | No |
| Wrapper mode | Yes | No | No | No |
| Team collaboration | Yes | No | No | No |
| Access control (config) | Yes | No | No | No |
| Secure credential storage | Yes | Yes | N/A | No |

**tuna** gives you the best of Cloudflare Tunnels without the setup complexity:
- **Free custom domains** - Use your own domain, no random URLs
- **Persistent tunnels** - Survives terminal restarts (runs as a service)
- **Team-friendly** - `$USER` variable prevents subdomain conflicts
- **Zero Trust Access** - Restrict by email/domain, defined in config
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

[Create a token →](https://dash.cloudflare.com/profile/api-tokens)

### 2. Configure your project

```bash
tuna --init
```

Or manually add to `package.json`:

```json
{
  "tuna": {
    "forward": "my-app.example.com",
    "port": 3000
  }
}
```

### 3. Run your dev server

```bash
tuna npm run dev
# or
tuna vite dev --port 3000
# or
tuna next dev
```

That's it! Your local server is now available at `https://my-app.example.com`

## Team Collaboration

Use environment variables to give each developer their own subdomain:

```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

- Alice runs `tuna npm run dev` → `https://alice-api.example.com`
- Bob runs `tuna npm run dev` → `https://bob-api.example.com`

No conflicts. No coordination needed.

## Access Control

Restrict who can access your tunnel with Zero Trust:

```json
{
  "tuna": {
    "forward": "staging.example.com",
    "port": 3000,
    "access": ["@mycompany.com", "contractor@gmail.com"]
  }
}
```

- `@mycompany.com` - Allow anyone with a @mycompany.com email
- `contractor@gmail.com` - Allow a specific email address

Users authenticate via Cloudflare Access (email OTP by default).

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

### Options

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `forward` | `string` | Yes | Domain to expose (supports `$USER`, `$TUNA_USER`) |
| `port` | `number` | Yes | Local port to forward |
| `access` | `string[]` | No | Email addresses/domains for access control |

### Examples

```json
// Basic
{
  "tuna": {
    "forward": "app.example.com",
    "port": 3000
  }
}

// Team (unique per developer)
{
  "tuna": {
    "forward": "$USER-app.example.com",
    "port": 3000
  }
}

// With access control
{
  "tuna": {
    "forward": "staging.example.com",
    "port": 3000,
    "access": ["@company.com", "external@gmail.com"]
  }
}
```

## Requirements

- Node.js 18+
- macOS (Linux/Windows support planned)
- A Cloudflare account with a domain

## Use Cases

- **Webhook testing** - Receive webhooks from Stripe, GitHub, etc.
- **OAuth callbacks** - Test OAuth flows with real redirect URLs
- **Mobile testing** - Access your dev server from real devices
- **Client demos** - Share work-in-progress securely
- **Team development** - Everyone gets their own URL
- **Cross-browser testing** - Use with BrowserStack, Sauce Labs

## Security

- **Credentials** stored in macOS Keychain with biometric auth
- **No secrets** in package.json or environment variables
- **Zero Trust Access** for fine-grained access control
- **TLS everywhere** via Cloudflare

## Repository Structure

This is a monorepo containing:

```
packages/
├── cli/     # tuna CLI (published to npm)
├── docs/    # Documentation site (Vocs)
└── web/     # Landing page (Vite + React + Tailwind)
```

## Contributing

Contributions are welcome!

```bash
# Clone and install
git clone https://github.com/zeroexcore/tuna.git
cd tuna
pnpm install

# Development
pnpm dev          # Run all dev servers
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm typecheck    # Type check all packages
pnpm lint         # Lint all packages
pnpm format       # Format with Prettier

# Work on specific package
pnpm --filter tuna dev        # CLI only
pnpm --filter @tuna/docs dev  # Docs only
pnpm --filter @tuna/web dev   # Website only
```

## License

MIT
