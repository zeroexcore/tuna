# Tuna - Cloudflare Tunnel Wrapper

## Overview

Tuna is a CLI tool that wraps development commands with automatic Cloudflare tunnel setup and Zero Trust access control. It allows developers to expose local development servers to the internet with a single command, handling all the complexity of tunnel creation, DNS configuration, credential management, and access policies.

## Core Concept

Instead of manually setting up Cloudflare tunnels, users can simply prefix their dev command with `tuna`:

```bash
# Before (manual setup required)
$ cloudflared tunnel create my-tunnel
$ cloudflared tunnel route dns my-tunnel my-app.example.com
$ cloudflared tunnel run my-tunnel &
$ # Configure Zero Trust Access in Cloudflare dashboard...
$ vite dev --port 3000

# After (automatic)
$ tuna vite dev --port 3000
```

Tuna automatically:

1. Creates a Cloudflare tunnel
2. Sets up DNS records
3. Installs cloudflared as a system service (launchd)
4. Configures Zero Trust Access policies (if specified)
5. Starts the tunnel
6. Wraps the development command
7. Proxies all stdio transparently

## Key Features

### 1. Secure Credential Storage

- Credentials stored in macOS Keychain (not in package.json)
- Biometric authentication required
- No secrets in version control

### 2. Zero Configuration Overhead

- Minimal config in package.json:
  ```json
  {
    "tuna": {
      "forward": "my-app.example.com",
      "port": 3000
    }
  }
  ```
- **Team-friendly**: Environment variable interpolation prevents subdomain conflicts
  ```json
  {
    "tuna": {
      "forward": "$USER-api.example.com",
      "port": 3000
    }
  }
  ```

  - `$USER-api.example.com` → `alice-api.example.com` for Alice
  - `$USER-api.example.com` → `bob-api.example.com` for Bob

### 3. Zero Trust Access Control

- Restrict tunnel access by email or email domain:
  ```json
  {
    "tuna": {
      "forward": "$USER-api.example.com",
      "port": 3000,
      "access": ["@company.com", "contractor@gmail.com"]
    }
  }
  ```
- `@company.com` - allows any email ending in @company.com
- `contractor@gmail.com` - allows specific email address
- Users authenticate via Cloudflare Access (One-time PIN by default)
- Config-driven: changes to `access` array sync automatically

### 4. Transparent Wrapper

- All stdio passes through (colors, progress bars, etc.)
- Exits with same code as wrapped command
- Works with any dev tool (vite, next, node, python, etc.)

### 5. Persistent Tunnels

- Tunnels run as system services (launchd on macOS)
- Survive terminal/process restarts
- No need to keep tuna process running

### 6. Simple Management

- `tuna --init` - Interactive project setup
- `tuna --list` - View all tunnels
- `tuna --stop` - Stop service
- `tuna --delete` - Clean up completely

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Terminal                       │
│                                                          │
│  $ tuna vite dev --port 3000                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  v
┌─────────────────────────────────────────────────────────┐
│                    Tuna CLI                              │
│                                                          │
│  1. Read package.json (forward, port, access)           │
│  2. Get credentials from Keychain (biometric)           │
│  3. Create/update tunnel via Cloudflare API             │
│  4. Install cloudflared service                         │
│  5. Create DNS records                                  │
│  6. Configure Zero Trust Access (if access[] defined)   │
│  7. Spawn child process (vite)                          │
│  8. Proxy stdio                                         │
└─────────────┬──────────────────┬────────────────────────┘
              │                  │
              v                  v
┌─────────────────────┐   ┌──────────────────────────────┐
│  Cloudflared        │   │  Development Server          │
│  Service (daemon)   │   │  (vite, next, node, etc.)    │
│                     │   │                              │
│  - Runs in bg       │   │  - Runs as child process     │
│  - Multiple ingress │   │  - stdio proxied through     │
│  - Persistent       │   │  - Stopped with Ctrl+C       │
└─────────┬───────────┘   └──────────────────────────────┘
          │
          v
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Edge Network                     │
│                                                          │
│  my-app.example.com → Zero Trust → tunnel → localhost   │
└─────────────────────────────────────────────────────────┘
```

## Use Cases

1. **Team collaboration** - Multiple developers working on same project without subdomain conflicts
2. **Secure sharing** - Share local dev server with specific people via email-based access
3. **Test webhooks** - Receive webhooks from external services
4. **Mobile testing** - Test on real devices without network config
5. **OAuth callbacks** - Test OAuth flows with real providers
6. **Cross-browser testing** - Use BrowserStack/Sauce Labs with local dev
7. **Client demos** - Securely show work-in-progress to specific clients

## Technical Stack

- **Runtime**: Node.js 18+ / TypeScript (tsx, no build step)
- **Package Manager**: pnpm
- **Process Management**: execa
- **Credential Storage**: keytar (macOS Keychain)
- **API Client**: Native fetch (Cloudflare API)
- **UI**: chalk, ora, inquirer
- **Config**: js-yaml (for cloudflared config)

## Security

- API tokens stored in macOS Keychain with encryption
- Biometric authentication required for credential access
- No credentials in package.json or environment variables
- Credentials scoped per domain (example.com vs another.com)
- Zero Trust Access policies for fine-grained access control

## Platform Support

**Current (v0.1)**: macOS only

- Keychain for credential storage
- launchd for service management

**Roadmap**: Linux and Windows support

- Linux: libsecret + systemd
- Windows: Credential Manager + Windows Service

## Installation

```bash
# Install globally from npm
npm install -g @zeroexcore/tuna
# or
pnpm add -g @zeroexcore/tuna

# Or use directly with npx
npx @zeroexcore/tuna <command>
```

## Quick Start

```bash
# 1. Login once (stores credentials in Keychain)
tuna --login
# Required permissions:
#   - Account → Cloudflare Tunnel → Edit
#   - Account → Access: Apps and Policies → Edit
#   - Zone → DNS → Edit
#   - Account → Account Settings → Read

# 2. Initialize your project
tuna --init
# Or manually add to package.json:
{
  "tuna": {
    "forward": "$USER-app.example.com",
    "port": 3000,
    "access": ["@mycompany.com"]
  }
}

# 3. Run dev server
tuna vite dev --port 3000
# ✓ Tunnel active: https://alice-app.example.com → localhost:3000
# ✓ Access: @mycompany.com
```

## Configuration Reference

| Field     | Type     | Required | Description                                          |
| --------- | -------- | -------- | ---------------------------------------------------- |
| `forward` | string   | Yes      | Domain to expose (supports $USER, $TUNA_USER, $HOME) |
| `port`    | number   | Yes      | Local port to forward to                             |
| `access`  | string[] | No       | Email addresses and/or domains for access control    |

### Access Config Examples

```json
// Public (no authentication)
{ "forward": "app.example.com", "port": 3000 }

// Restrict to email domain
{ "forward": "app.example.com", "port": 3000, "access": ["@company.com"] }

// Restrict to specific emails
{ "forward": "app.example.com", "port": 3000, "access": ["alice@gmail.com", "bob@gmail.com"] }

// Mixed (domain + specific emails)
{ "forward": "app.example.com", "port": 3000, "access": ["@company.com", "contractor@external.com"] }
```

## Philosophy

Tuna is designed around these principles:

1. **Minimal Configuration** - Just forward, port, and optional access in package.json
2. **Security First** - No secrets in code, Zero Trust access control
3. **Transparent** - Wraps commands without interference
4. **Persistent** - Tunnels survive restarts
5. **Config-driven** - Everything declared in package.json, no manual dashboard work

## Comparison to Alternatives

| Feature                 | Tuna | ngrok | localtunnel | cloudflared         |
| ----------------------- | ---- | ----- | ----------- | ------------------- |
| Free custom domains     | ✅   | ❌    | ❌          | ✅                  |
| Persistent tunnels      | ✅   | ❌    | ❌          | ✅                  |
| Zero config             | ✅   | ❌    | ✅          | ❌                  |
| Secure credentials      | ✅   | ✅    | N/A         | ❌                  |
| Wrapper mode            | ✅   | ❌    | ❌          | ❌                  |
| Team collaboration      | ✅   | ❌    | ❌          | ❌                  |
| Access control (config) | ✅   | ❌    | ❌          | ❌ (dashboard only) |

## Repository Structure

This is a monorepo managed with pnpm workspaces and Turborepo:

```
tuna/
├── packages/
│   ├── cli/                     # tuna CLI (published to npm)
│   │   ├── src/
│   │   │   ├── index.ts        # CLI entry point
│   │   │   ├── commands/       # Command handlers
│   │   │   ├── lib/            # Core libraries
│   │   │   └── types/          # TypeScript types
│   │   └── tests/              # Test files
│   ├── docs/                    # Documentation site (Vocs)
│   └── web/                     # Landing page (Vite + React + Tailwind)
├── docs/                        # Development documentation
├── .github/workflows/           # CI/CD pipelines
├── turbo.json                   # Turborepo config
└── pnpm-workspace.yaml          # Workspace config
```

## License

MIT

## Credits

Built on top of [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) and [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/) infrastructure.
