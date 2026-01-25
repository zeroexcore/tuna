# Tuna - Cloudflare Tunnel Wrapper

This is a CLI tool that wraps development commands with automatic Cloudflare tunnel setup, enabling developers to expose local servers with a single command while handling tunnel creation, DNS configuration, and credential management.

## Project Structure

```
tuna/
├── docs/                      # Comprehensive documentation (3,400+ lines)
│   ├── 00-overview.md         # Project overview and philosophy
│   ├── 01-architecture.md     # Technical architecture
│   ├── 02-commands.md         # CLI command specifications
│   ├── 03-implementation.md   # Phase-by-phase implementation plan
│   ├── 04-api-reference.md    # Cloudflare API details (incl. Access)
│   ├── 05-team-collaboration.md # Environment variable interpolation
│   └── README.md              # Documentation index
├── src/                       # Source code (TypeScript)
│   ├── index.ts              # CLI entry point
│   ├── commands/             # Command handlers (login, run, list, stop, delete)
│   ├── lib/                  # Core libraries (credentials, config, api, access, service)
│   └── types/                # TypeScript type definitions
├── PLAN.md                    # Quick reference guide
├── CHANGELOG.md               # Documentation changelog
└── .opencode/
    ├── AGENTS.md             # This file
    └── skills/               # OpenCode skills for development
```

## Documentation-First Approach

**CRITICAL:** Before implementing ANY feature, ALWAYS check the relevant documentation:

1. **Read docs in order:** 00-overview.md → 01-architecture.md → 02-commands.md → 03-implementation.md
2. **Follow the implementation plan:** `docs/03-implementation.md` has 7 phases - complete them sequentially
3. **Reference architecture:** `docs/01-architecture.md` contains detailed specifications for all components
4. **Match command specs:** `docs/02-commands.md` defines exact behavior for all CLI commands
5. **Understand API:** `docs/04-api-reference.md` documents all Cloudflare API interactions
6. **Team features:** `docs/05-team-collaboration.md` explains environment variable interpolation

**The documentation is the source of truth. Code should match documentation exactly.**

## Technology Stack

- **Runtime:** Node.js 18+ / TypeScript (strict mode, ESM)
- **Execution:** tsx (no build step, direct TypeScript execution)
- **Package Manager:** pnpm (NOT npm or yarn)
- **CLI Framework:** Commander.js
- **Process Management:** execa (child process wrapping)
- **Credential Storage:** keytar (macOS Keychain with biometric auth)
- **API Client:** axios (Cloudflare REST API)
- **UI:** chalk (colors), ora (spinners), inquirer (prompts)
- **Config:** YAML for cloudflared, JSON for package.json
- **Service:** cloudflared as launchd service (macOS)

## Key Features

1. **Secure Credentials:** API tokens in macOS Keychain with biometric auth, NEVER in package.json
2. **Environment Variables:** Support $USER, $TUNA_USER, $HOME in forward config for team collaboration
3. **Transparent Wrapper:** Proxy all stdio (stdin/stdout/stderr) from wrapped command
4. **Persistent Tunnels:** Run as system service, survive terminal restarts
5. **Automatic DNS:** Create/update CNAME records via Cloudflare API
6. **Simple Config:** Just `forward` and `port` in package.json
7. **Zero Trust Access:** Config-driven access control via `access` array with email domains and individual emails

## Code Standards

### TypeScript
- Use strict mode (configured in tsconfig.json)
- Use ESM modules (`import`/`export`, NOT `require`)
- Add shebang to CLI entry point: `#!/usr/bin/env tsx`
- No build step - use tsx to run TypeScript directly
- Use `pnpm typecheck` to validate types (tsc --noEmit)
- Define interfaces in `src/types/`
- Avoid `any` type - use proper types
- Use async/await, not callbacks
- Export types for reusability
- Use `.ts` extension in imports when needed

### Error Handling
- Descriptive error messages with recovery instructions
- Use chalk for colored output (red for errors, yellow for warnings)
- Log errors with context
- Handle Cloudflare API errors gracefully (401, 403, 404, 429, 5xx)

### Configuration
- ALWAYS interpolate environment variables in `forward` field
- Interpolate BEFORE validation
- Priority: $TUNA_USER → $USER → 'unknown'
- Validate interpolated values for DNS safety
- Tunnel naming: `tuna-{sanitized-forward}` (after interpolation)

### API Integration
- Use CloudflareAPI class from `src/lib/api.ts`
- Implement exponential backoff for rate limiting
- Retry failed requests up to 3 times
- Cache responses when possible

## Implementation Phases

Complete phases in order (defined in `docs/03-implementation.md`):

1. **Phase 1:** Project Setup - Initialize with pnpm, tsx, ESM config
2. **Phase 2:** Type Definitions - Create interfaces in `src/types/`
3. **Phase 3:** Core Libraries - credentials.ts, config.ts, api.ts
4. **Phase 4:** Cloudflared Management - Binary download and execution
5. **Phase 5:** Service Management - Install as launchd service
6. **Phase 6:** Commands - Implement login, run, list, stop, delete
7. **Phase 7:** Polish - Error handling, help text, testing

**Current Status:** Check which files exist in `src/` to determine current phase.

**Important:** No build step! Use tsx to execute TypeScript directly. The bin field in package.json points to `src/index.ts` with a shebang.

## Command Structure

Management commands use `--` flags to avoid ambiguity with wrapped commands:

- `tuna --login` - Setup Cloudflare credentials (store in Keychain)
- `tuna <command> [args...]` - Wrap any dev command with tunnel
- `tuna --list` - List all tunnels for configured account
- `tuna --stop` - Stop cloudflared service
- `tuna --delete [name]` - Delete tunnel and DNS records

## Environment Variable Interpolation

Critical feature for team collaboration (see `docs/05-team-collaboration.md`):

**Example config:**
```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

**Result:**
- Alice (USER=alice) gets `alice-api.example.com`
- Bob (USER=bob) gets `bob-api.example.com`
- No conflicts! Each developer has their own tunnel.

**Implementation:**
```typescript
function interpolateEnvVars(value: string): string {
  return value
    .replace(/\$TUNA_USER/g, process.env.TUNA_USER || process.env.USER || 'unknown')
    .replace(/\$USER/g, process.env.USER || 'unknown')
    .replace(/\$HOME/g, process.env.HOME || '~');
}
```

This happens in `src/lib/config.ts` BEFORE validation.

## File Locations

```
macOS Keychain:
  tuna-credentials-example.com    # API token + account ID (encrypted)

~/.tuna/
  tunnels/
    {tunnel-id}.json              # Tunnel credentials
  config-{tunnel-id}.yml          # Cloudflared ingress config
  bin/
    cloudflared                   # Downloaded binary (optional)

package.json:
  {
    "type": "module",               # ESM mode
    "bin": {
      "tuna": "./src/index.ts"      # Direct TypeScript with shebang
    },
    "tuna": {
      "forward": "$USER-api.example.com",
      "port": 3000,
      "access": ["@company.com"]    # Optional: Zero Trust access control
    }
  }
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Fresh project installation with pnpm
- [ ] `tuna --login` with valid/invalid tokens
- [ ] Environment variable interpolation ($USER, $TUNA_USER)
- [ ] Multiple users with same config (no conflicts)
- [ ] Wrapped commands (vite, next, node, python)
- [ ] Stdio passthrough (colors, interactive prompts)
- [ ] Signal handling (Ctrl+C)
- [ ] All management commands (--list, --stop, --delete)
- [ ] Error scenarios (no config, invalid domain, port in use)
- [ ] Type checking with `pnpm typecheck`

### Edge Cases
- Username with special characters
- Empty environment variables
- No package.json found
- Missing tuna config
- Cloudflare API failures
- Keychain access denied

## Common Patterns

### Module Imports (ESM)
```typescript
// Good - ESM with .ts extension
import { readConfig } from './lib/config.ts';
import type { TunaConfig } from './types/config.ts';

// Bad - CommonJS
const { readConfig } = require('./lib/config');
```

### CLI Entry Point
```typescript
#!/usr/bin/env tsx
// src/index.ts

import { program } from 'commander';

async function main() {
  // CLI logic
}

main().catch(console.error);
```

### Reading Configuration
```typescript
// Good - interpolates env vars and validates
const config = await readConfig();
const tunnel = await createTunnel(config.forward);

// Bad - doesn't interpolate
const pkg = JSON.parse(fs.readFileSync('package.json'));
const tunnel = await createTunnel(pkg.tuna.forward); // Missing interpolation!
```

### Error Messages
```typescript
// Good - helpful with recovery
throw new Error(
  'No package.json found.\n' +
  'Run this command from your project directory.'
);

// Bad - vague
throw new Error('File not found');
```

### Async Operations
```typescript
// Good - async/await
async function createTunnel(): Promise<Tunnel> {
  const tunnel = await api.createTunnel(name, secret);
  return tunnel;
}

// Bad - callbacks
function createTunnel(callback) { ... }
```

## Security Checklist

Before committing code that handles:

### Credentials
- [ ] Never log credentials
- [ ] Never store in files (except Keychain via keytar)
- [ ] Always use keytar for storage/retrieval
- [ ] Never pass in URLs visible to user

### User Input
- [ ] Validate domain format after interpolation
- [ ] Sanitize for DNS operations
- [ ] Check for command injection in wrapped commands
- [ ] Validate port numbers (1-65535)

### Environment Variables
- [ ] Check for valid characters after interpolation
- [ ] Provide safe fallbacks ('unknown')
- [ ] Warn about invalid values

## Required Cloudflare API Permissions

When users create API tokens, they need:
- **Account** → Cloudflare Tunnel → Edit
- **Account** → Access: Apps and Policies → Edit
- **Zone** → DNS → Edit
- **Account** → Account Settings → Read

## Common Issues & Solutions

1. **"No package.json found"** → Run from project directory
2. **"Not logged in"** → Run `tuna --login`
3. **"Invalid domain format"** → Check username has special chars, use $TUNA_USER
4. **"Port already in use"** → Kill process or change port
5. **"Touch ID keeps prompting"** → Keychain entry corrupted, delete and re-login
6. **"cloudflared not found"** → Should auto-download, or `brew install cloudflared`

## User Experience Guidelines

- Use emojis sparingly (🔐 for auth, ✓ for success, ✗ for error)
- Show progress with ora spinners
- Use chalk colors: green (success), red (error), yellow (warning), blue (info)
- Display tunnel URL prominently when active
- Keep error messages helpful with recovery steps
- Validate input before proceeding
- Exit with same code as child process

## Available Skills

Use the `skill` tool to load these when needed:

- **implement-phase** - Guide for implementing next development phase
- **test-env-vars** - Test environment variable interpolation feature
- **debug-tunnel** - Diagnose and fix tunnel issues
- **add-feature** - Add new features following project conventions

## Resources

- **Project Docs:** `docs/` folder (start with README.md)
- **Quick Reference:** `PLAN.md`
- **API Docs:** `docs/04-api-reference.md`
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/
- **Cloudflare API:** https://developers.cloudflare.com/api/

## When Implementing

1. Read relevant documentation first
2. Follow existing patterns in codebase
3. Use ESM imports/exports (NOT CommonJS)
4. Add shebang `#!/usr/bin/env tsx` to CLI entry point
5. Use pnpm (NOT npm or yarn)
6. No build step - tsx runs TypeScript directly
7. Run `pnpm typecheck` to validate types
8. Implement with proper types
9. Add error handling with helpful messages
10. Test manually with checklist
11. Update CHANGELOG.md
12. Ensure code matches documentation

**Remember: This is a CLI tool for developers. Prioritize developer experience (DX). Errors should be helpful, not just informative.**
