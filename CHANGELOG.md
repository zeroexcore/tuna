# Tuna Changelog

## 0.1.5 - 2026-03-02

### Changed
- **Credential storage**: Replaced keytar (macOS Keychain) with plain JSON files in `~/.config/tuna/credentials/`. Files are created with `0600` permissions. No native dependencies needed.
- **Cross-platform**: Removed macOS-only requirement — tuna now works on Linux and Windows too.

### Removed
- `keytar` dependency (native addon, hard to install)
- Internal `docs/` directory, `.opencode/` agent config, and process docs (`DEPLOYMENT.md`, `SDLC*.md`) — moved out of repo.

## 2026-01-25 - Zero Trust Access Control

### Added

#### New Feature: Config-Driven Access Control
- Support for `access` array in tuna config for Zero Trust access control
- Email domain patterns (`@company.com`) for organization-wide access
- Individual email addresses for specific users
- One-time PIN authentication (no IdP setup required)
- Snapshot-based diffing for efficient policy updates
- Automatic cleanup on tunnel deletion

#### New Files
- **src/lib/access.ts** - Access management with snapshot-based diffing
  - `parseAccessConfig()` - Parse access array into emails and domains
  - `ensureAccess()` - Create/update Access application and policy
  - `removeAccess()` - Remove Access application for hostname
  - `getAccessDescription()` - Human-readable description for display

#### Modified Files
- **src/types/config.ts** - Added `AccessConfig` type (string[])
- **src/types/cloudflare.ts** - Added Access API types
- **src/lib/api.ts** - Added Access API methods (create/list/delete apps and policies)
- **src/commands/run.ts** - Integrated Access setup from config
- **src/commands/delete.ts** - Added Access cleanup on tunnel deletion
- **src/commands/login.ts** - Updated required permissions message

#### Documentation Updated
- **docs/01-architecture.md** - Added Access Manager component
- **docs/00-overview.md** - Added Access feature to overview
- **PLAN.md** - Added Access configuration examples
- **IMPLEMENTATION_STATUS.md** - Added Access feature section

### Configuration Example

```json
{
  "tuna": {
    "forward": "app.example.com",
    "port": 3000,
    "access": ["@company.com", "contractor@gmail.com"]
  }
}
```

### Required API Token Permissions (Updated)

```
- Account → Cloudflare Tunnel → Edit
- Account → Access: Apps and Policies → Edit  ← NEW
- Zone → DNS → Edit
- Account → Account Settings → Read
```

---

## 2026-01-25 - Global CLI Installation

### Changed
- Updated all documentation to use `tuna` command instead of `./src/index.ts`
- Added installation instructions using `pnpm link --global`

### Updated Files
- `IMPLEMENTATION_STATUS.md` - Updated all CLI examples
- `PLAN.md` - Added Quick Start section with installation instructions
- `docs/00-overview.md` - Updated installation and quick start sections
- `docs/03-implementation.md` - Updated development workflow

### Installation
```bash
# Install dependencies
pnpm install

# Link globally
pnpm link --global

# Use from anywhere
tuna --help
```

---

## 2026-01-25 - Implementation Complete: All Phases Done 🎉

### Implemented

#### Phase 4: Cloudflared Management ✅
- **src/lib/cloudflared.ts** - Binary detection, download, and execution
  - `isInstalled()` - Check if cloudflared in PATH or downloaded
  - `getVersion()` - Get installed version
  - `download()` - Download binary for platform (macOS, Linux, Windows)
  - `getExecutablePath()` - Path to binary
  - `exec()` - Execute cloudflared commands
  - `ensureDirectories()` - Create ~/.tuna directories
  - Platform detection for correct binary download

#### Phase 5: Service Management ✅
- **src/lib/dns.ts** - DNS helper functions
  - `ensureDnsRecord()` - Create or update CNAME record
  - `deleteDnsRecordForDomain()` - Remove DNS record
  - `listDnsRecordsForTunnel()` - List all domains for a tunnel
  - `validateDnsRecord()` - Check if DNS is properly configured

- **src/lib/service.ts** - launchd service management
  - `generateIngressConfig()` - Create YAML config
  - `writeIngressConfig()` - Save config to file
  - `saveTunnelCredentials()` - Save tunnel credentials
  - `installService()` - Install launchd service
  - `uninstallService()` - Remove launchd service
  - `startService()`, `stopService()`, `restartService()`
  - `getServiceStatus()` - Check if service running

#### Phase 6: Commands ✅
- **src/commands/login.ts** - Interactive credential setup
  - Prompts for API token and domain
  - Validates token with Cloudflare API
  - Stores credentials in `~/.config/tuna/`

- **src/commands/run.ts** - Main wrapper command
  - Reads config from package.json
  - Creates tunnel if needed
  - Ensures DNS record
  - Installs/starts service
  - Spawns wrapped command with stdio inheritance
  - Forwards signals to child process

- **src/commands/list.ts** - List tunnels
  - Shows all tunnels for configured domains
  - Displays status and DNS records
  - Color-coded output

- **src/commands/stop.ts** - Stop service
  - Stops cloudflared launchd service

- **src/commands/delete.ts** - Delete tunnel
  - Confirms before deletion
  - Removes tunnel, DNS records, and local files

- **src/index.ts** - CLI entry point
  - Manual argument parsing for clean wrapper support
  - Help text with examples

#### Phase 7: Testing & Verification ✅
- All TypeScript compiles without errors
- All 23 unit tests passing
- CLI commands tested manually
- Shebang updated for proper tsx execution

### Files Created

**New Source Files:**
- src/lib/cloudflared.ts - Binary management (~260 lines)
- src/lib/dns.ts - DNS helper (~150 lines)
- src/lib/service.ts - Service management (~300 lines)
- src/commands/login.ts - Login command (~120 lines)
- src/commands/run.ts - Run command (~180 lines)
- src/commands/list.ts - List command (~140 lines)
- src/commands/stop.ts - Stop command (~40 lines)
- src/commands/delete.ts - Delete command (~170 lines)

**Updated Files:**
- src/index.ts - Rewrote for manual arg parsing
- IMPLEMENTATION_STATUS.md - Updated to reflect completion

### Metrics

- **Total Lines of Code:** ~1,500 (src/)
- **Tests:** 23 (all passing)
- **Type Errors:** 0
- **Phases Complete:** 7/7 (100%)

### CLI Commands

```bash
tuna --login              # Setup Cloudflare credentials
tuna <command>            # Run command with tunnel
tuna --list               # List all tunnels
tuna --stop               # Stop cloudflared service
tuna --delete [name]      # Delete tunnel
tuna --help               # Show help
tuna --version            # Show version
```

---

## 2026-01-23 - Implementation Progress: Phases 1-3 Complete

### Implemented

#### Phase 1: Project Setup ✅
- Initialized pnpm project with all dependencies
- Configured TypeScript for ESM with noEmit
- Set up vitest for testing with coverage
- Created directory structure (src/, tests/)
- CLI entry point with shebang working

#### Phase 2: Type Definitions ✅
- Created complete TypeScript interfaces
- src/types/config.ts - Configuration types
- src/types/cloudflare.ts - API and tunnel types
- src/types/index.ts - Central exports

#### Phase 3: Core Libraries ✅
- **Config Module** (src/lib/config.ts) - TESTED
  - Environment variable interpolation ($USER, $TUNA_USER, $HOME)
  - Configuration validation
  - Tunnel name generation
  - 23 unit tests, all passing
- **Credentials Module** (src/lib/credentials.ts)
  - File-based credential storage in `~/.config/tuna/`
  - Secure credential storage
  - Restrictive file permissions (0600)
- **API Client** (src/lib/api.ts)
  - Complete Cloudflare API wrapper
  - Tunnel operations (create, list, get, delete)
  - DNS operations (create, list, update, delete)
  - Zone lookup
  - Automatic retry on rate limiting
  - User-friendly error messages

#### Testing Infrastructure
- Vitest configured with globals and coverage
- Unit tests for config module (23 tests passing)
- Test commands: `pnpm test`, `pnpm test:run`, `pnpm test:ui`
- Type checking: `pnpm typecheck`

### Files Created

**Source Code:**
- src/index.ts - CLI entry point with Commander.js
- src/types/*.ts - Type definitions (3 files)
- src/lib/config.ts - Config management
- src/lib/credentials.ts - Credential file management
- src/lib/api.ts - Cloudflare API client

**Tests:**
- tests/unit/config.test.ts - 23 unit tests
- vitest.config.ts - Test configuration

**Documentation:**
- IMPLEMENTATION_STATUS.md - Detailed progress tracker

### Metrics

- **Lines of Code:** ~500
- **Tests:** 23 (all passing)
- **Test Coverage:** Config module complete
- **Type Errors:** 0
- **Phases Complete:** 3/7 (43%)

### Next Steps

- Phase 4: Cloudflared Management (binary download/execution)
- Phase 5: Service Management (launchd integration)
- Phase 6: Commands (implement all CLI commands)
- Phase 7: Polish (testing, docs, README)

---

## 2026-01-23 - Package Manager and Build System Update

### Changed

#### Build System
- **Switched from npm to pnpm** for package management
- **Removed build step** - Use tsx to execute TypeScript directly
- **Type checking only** - Use `pnpm typecheck` (tsc --noEmit)
- **ESM configuration** - Use "type": "module" in package.json
- **Direct execution** - bin field points to `src/index.ts` with shebang

#### Package Manager
- All `npm` commands replaced with `pnpm`
- Updated dependency installation instructions
- Updated lock file reference (pnpm-lock.yaml)

#### TypeScript Configuration
- Changed module from "commonjs" to "ESNext"
- Changed moduleResolution to "bundler"
- Added "noEmit": true (no compilation output)
- Added "allowImportingTsExtensions": true
- Removed "outDir" and "declaration" (not needed)

#### Entry Point
- src/index.ts uses shebang: `#!/usr/bin/env tsx`
- Direct TypeScript execution via tsx
- No dist/ directory

#### Documentation Updates
- docs/00-overview.md - Updated installation and quick start
- docs/03-implementation.md - Updated all npm commands to pnpm
- docs/03-implementation.md - Removed build step instructions
- docs/03-implementation.md - Updated tsconfig.json
- docs/03-implementation.md - Updated package.json structure
- PLAN.md - Updated all examples
- .opencode/AGENTS.md - Updated technology stack and patterns
- .opencode/skills/implement-phase/SKILL.md - Updated Phase 1
- .opencode/skills/test-env-vars/SKILL.md - Updated test setup

### Added
- tsx as dependency for direct TypeScript execution
- ESM module import examples in documentation
- Shebang requirement in documentation
- pnpm-specific commands and patterns

### Technical Details

**Before (npm + build):**
```json
{
  "main": "dist/index.js",
  "bin": {
    "tuna": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

**After (pnpm + tsx):**
```json
{
  "type": "module",
  "bin": {
    "tuna": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm typecheck"
  }
}
```

**src/index.ts:**
```typescript
#!/usr/bin/env tsx

import { program } from 'commander';
// ... rest of code
```

---

## 2026-01-23 - Environment Variable Interpolation Feature

### Added

#### New Feature: Environment Variable Interpolation
- Support for `$USER`, `$TUNA_USER`, and `$HOME` in `forward` configuration field
- Enables team collaboration without subdomain conflicts
- Automatic interpolation before tunnel creation and DNS setup

#### New Documentation
- **docs/05-team-collaboration.md** (484 lines)
  - Comprehensive guide to team collaboration
  - Problem statement and solution
  - Configuration examples
  - Best practices and troubleshooting
  - Migration guide
  - FAQ with common scenarios

### Modified

#### docs/00-overview.md
- Added team collaboration to core features
- Updated configuration examples with environment variables
- Added team collaboration to use cases (#1)
- Updated comparison table with team collaboration row

#### docs/01-architecture.md
- Added `interpolateEnvVars()` function specification
- Documented interpolation logic with examples
- Updated configuration schema to show env var support
- Added validation for interpolated values
- Added error handling for unresolved variables

#### docs/02-commands.md
- Added team collaboration configuration examples
- Updated tunnel naming documentation with interpolation
- Added environment variable interpolation error handling
- Updated `tuna --list` output examples with user-specific tunnels
- Added note about interpolation in tunnel naming

#### docs/03-implementation.md
- Added `interpolateEnvVars()` implementation code
- Updated `readConfig()` to interpolate before validation
- Added validation for unresolved variables
- Included complete code examples

#### docs/README.md
- Added entry for new 05-team-collaboration.md document
- Updated documentation structure section

#### PLAN.md
- Added environment variable interpolation to key decisions table
- Updated configuration examples with team collaboration scenario
- Added supported variables documentation
- Updated usage examples with user-specific tunnels

### Summary

**Total Changes:**
- Files created: 1
- Files modified: 6
- Lines added: ~900+
- Total documentation: 3,476 lines

**Key Implementation:**
```typescript
function interpolateEnvVars(value: string): string {
  return value
    .replace(/\$TUNA_USER/g, process.env.TUNA_USER || process.env.USER || 'unknown')
    .replace(/\$USER/g, process.env.USER || 'unknown')
    .replace(/\$HOME/g, process.env.HOME || '~');
}
```

**Configuration Example:**
```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

**Result:**
- Alice gets: `alice-api.example.com`
- Bob gets: `bob-api.example.com`
- No conflicts, same config file!

---

## 2026-01-23 - Initial Documentation

### Added

- Complete project documentation (2,578 lines)
- docs/00-overview.md - Project overview
- docs/01-architecture.md - Technical architecture
- docs/02-commands.md - CLI specifications
- docs/03-implementation.md - Implementation plan
- docs/04-api-reference.md - Cloudflare API reference
- docs/README.md - Documentation index
- PLAN.md - Quick reference guide

### Features Documented

1. Secure credential storage in `~/.config/tuna/`
2. Zero configuration overhead with package.json
3. Transparent command wrapping
4. Persistent tunnels as system services
5. Simple management commands
6. Automatic DNS configuration
7. Cloudflare API integration

---

## Future Changes

Track future documentation updates here.
