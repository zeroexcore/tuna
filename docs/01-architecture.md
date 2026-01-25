# Architecture

## Repository Structure

This is a monorepo managed with pnpm workspaces and Turborepo:

```
tuna/
├── packages/
│   ├── cli/                     # tuna CLI (published to npm as "tuna")
│   │   ├── src/
│   │   │   ├── index.ts        # CLI entry point
│   │   │   ├── commands/       # Command handlers
│   │   │   ├── lib/            # Core libraries
│   │   │   └── types/          # TypeScript types
│   │   ├── tests/              # Test files
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── docs/                    # Documentation site (Vocs)
│   │   ├── docs/pages/         # MDX documentation pages
│   │   ├── vocs.config.ts      # Vocs configuration
│   │   ├── wrangler.toml       # Cloudflare Workers deployment
│   │   └── package.json
│   │
│   └── web/                     # Landing page (Vite + React + Tailwind)
│       ├── src/                 # React source
│       ├── vite.config.ts
│       ├── wrangler.toml       # Cloudflare Workers deployment
│       └── package.json
│
├── docs/                        # Development documentation (this folder)
├── .github/workflows/           # CI/CD pipelines
│   ├── ci.yml                  # Lint, typecheck, test on PRs
│   └── release.yml             # npm publish + Cloudflare deploy on tags
├── eslint.config.js            # Workspace ESLint config
├── .prettierrc                 # Workspace Prettier config
├── turbo.json                  # Turborepo task config
├── pnpm-workspace.yaml         # pnpm workspace config
└── package.json                # Root package with workspace scripts
```

## System Components

### 1. CLI Entry Point (`packages/cli/src/index.ts`)

The main entry point that determines whether to run a management command or wrap a user command.

```typescript
async function main() {
  const args = process.argv.slice(2);
  
  // Check for management flags first
  if (args[0]?.startsWith('--')) {
    switch (args[0]) {
      case '--init':
        return initCommand();
      case '--login':
        return loginCommand();
      case '--list':
        return listCommand();
      case '--stop':
        return stopCommand();
      case '--delete':
        return deleteCommand(args[1]);
      case '--help':
        return showHelp();
      case '--version':
        return showVersion();
      default:
        console.error(`Unknown flag: ${args[0]}`);
        process.exit(1);
    }
  }
  
  // Default: wrapper command
  return runCommand(args);
}
```

### 2. Credential Manager (`packages/cli/src/lib/credentials.ts`)

Handles secure storage and retrieval of Cloudflare credentials using macOS Keychain.

**Key Functions:**
- `storeCredentials(domain: string, creds: Credentials)` - Store API token and account ID
- `getCredentials(domain: string): Promise<Credentials>` - Retrieve (triggers biometric auth)
- `deleteCredentials(domain: string)` - Remove credentials
- `listDomains(): Promise<string[]>` - List all configured domains
- `getRootDomain(forward: string): string` - Extract root domain from subdomain

**Data Structure:**
```typescript
interface Credentials {
  apiToken: string;      // Cloudflare API token
  accountId: string;     // Cloudflare account ID
  domain: string;        // Root domain (e.g., example.com)
}
```

**Keychain Service Naming:**
- Service: `tuna-credentials-{domain}`
- Account: `{domain}`
- Example: `tuna-credentials-example.com`

### 3. Configuration Manager (`packages/cli/src/lib/config.ts`)

Reads and validates tuna configuration from package.json.

**Key Functions:**
- `findPackageJson(): string | null` - Find package.json in current or parent dirs
- `readConfig(): TunaConfig` - Read and validate tuna config
- `validateConfig(config: TunaConfig)` - Ensure required fields exist
- `interpolateEnvVars(value: string): string` - Interpolate environment variables in config values

**Configuration Schema:**
```typescript
interface TunaConfig {
  forward: string;       // Domain to expose (e.g., my-app.example.com or $USER-app.example.com)
  port: number;          // Local port to forward to
  access?: string[];     // Optional access control rules
}
```

**Environment Variable Interpolation:**
Supports interpolation of environment variables in the `forward` field:
- `$USER` - Current username
- `$HOME` - User's home directory (rarely used in domains)
- `$TUNA_USER` - Custom user identifier (fallback to $USER)

### 4. Cloudflare API Client (`packages/cli/src/lib/api.ts`)

Wrapper around Cloudflare REST API for tunnel, DNS, and Access management. Uses native `fetch` instead of axios.

**Key Functions:**

**Tunnel Operations:**
- `createTunnel(name: string, secret: string): Promise<Tunnel>`
- `listTunnels(): Promise<Tunnel[]>`
- `getTunnel(tunnelId: string): Promise<Tunnel>`
- `deleteTunnel(tunnelId: string): Promise<void>`

**DNS Operations:**
- `createDnsRecord(zoneId: string, record: DnsRecord): Promise<DnsRecord>`
- `listDnsRecords(zoneId: string, name?: string): Promise<DnsRecord[]>`
- `updateDnsRecord(zoneId: string, recordId: string, record: DnsRecord): Promise<DnsRecord>`
- `deleteDnsRecord(zoneId: string, recordId: string): Promise<void>`

**Zone Operations:**
- `getZoneByName(domain: string): Promise<Zone>`
- `listZones(): Promise<Zone[]>`

**Access Operations:**
- `listAccessApplications(): Promise<AccessApplication[]>`
- `getAccessApplicationByDomain(domain: string): Promise<AccessApplication | null>`
- `createAccessApplication(app: AccessApplicationCreate): Promise<AccessApplication>`
- `deleteAccessApplication(appId: string): Promise<void>`
- `listAccessPolicies(appId: string): Promise<AccessPolicy[]>`
- `createAccessPolicy(appId: string, policy: AccessPolicyCreate): Promise<AccessPolicy>`
- `updateAccessPolicy(appId: string, policyId: string, policy: AccessPolicyCreate): Promise<AccessPolicy>`
- `deleteAccessPolicy(appId: string, policyId: string): Promise<void>`

**API Endpoints:**
```
Base: https://api.cloudflare.com/client/v4

Tunnels:
  POST   /accounts/{account_id}/cfd_tunnel
  GET    /accounts/{account_id}/cfd_tunnel
  GET    /accounts/{account_id}/cfd_tunnel/{tunnel_id}
  DELETE /accounts/{account_id}/cfd_tunnel/{tunnel_id}

DNS:
  POST   /zones/{zone_id}/dns_records
  GET    /zones/{zone_id}/dns_records
  PUT    /zones/{zone_id}/dns_records/{record_id}
  DELETE /zones/{zone_id}/dns_records/{record_id}

Zones:
  GET    /zones?name={domain}
  GET    /zones

Access Applications:
  GET    /accounts/{account_id}/access/apps
  POST   /accounts/{account_id}/access/apps
  DELETE /accounts/{account_id}/access/apps/{app_id}

Access Policies:
  GET    /accounts/{account_id}/access/apps/{app_id}/policies
  POST   /accounts/{account_id}/access/apps/{app_id}/policies
  PUT    /accounts/{account_id}/access/apps/{app_id}/policies/{policy_id}
  DELETE /accounts/{account_id}/access/apps/{app_id}/policies/{policy_id}
```

### 5. Cloudflared Manager (`packages/cli/src/lib/cloudflared.ts`)

Manages cloudflared binary installation and execution.

**Key Functions:**
- `isInstalled(): boolean` - Check if cloudflared is in PATH
- `getVersion(): Promise<string>` - Get installed version
- `download(): Promise<string>` - Download cloudflared binary for platform
- `getExecutablePath(): string` - Get path to cloudflared binary
- `exec(args: string[]): Promise<ExecResult>` - Execute cloudflared command

### 6. Service Manager (`packages/cli/src/lib/service.ts`)

Manages cloudflared as a system service (launchd on macOS).

**Key Functions:**
- `installService(tunnelId: string, config: IngressConfig): Promise<void>`
- `updateService(tunnelId: string, config: IngressConfig): Promise<void>`
- `startService(): Promise<void>`
- `stopService(): Promise<void>`
- `restartService(): Promise<void>`
- `uninstallService(): Promise<void>`
- `getServiceStatus(): Promise<ServiceStatus>`

### 7. Access Manager (`packages/cli/src/lib/access.ts`)

Manages Zero Trust Access applications and policies with snapshot-based diffing.

**Key Functions:**
- `parseAccessConfig(access: string[]): ParsedAccessConfig`
- `ensureAccess(credentials, hostname, access): Promise<string | null>`
- `removeAccess(credentials, hostname): Promise<boolean>`
- `getAccessDescription(access: string[]): string`

## File System Structure

```
~/.tuna/
├── tunnels/
│   ├── {tunnel-id-1}.json        # Tunnel credentials
│   └── {tunnel-id-2}.json
├── config-{tunnel-id-1}.yml      # Cloudflared ingress config
├── config-{tunnel-id-2}.yml
└── bin/
    └── cloudflared               # Downloaded binary (optional)

macOS Keychain:
├── tuna-credentials-example.com  # API token + account ID
└── tuna-credentials-another.com
```

## Data Flow

### `tuna <command>` Execution Flow

```
1. Parse CLI arguments
   ├─ Check if starts with '--' → run management command
   └─ Otherwise → proceed with wrapper

2. Find and read package.json
   ├─ Search current dir and parents
   ├─ Read 'tuna' field
   └─ Validate config (forward, port)

3. Get credentials from Keychain
   ├─ Extract root domain from 'forward'
   ├─ Request biometric auth
   └─ Retrieve apiToken and accountId

4. Check/Create tunnel
   ├─ Generate tunnel name from 'forward'
   ├─ Call Cloudflare API to check if exists
   └─ If not exists:
      ├─ Generate tunnel secret
      ├─ Create tunnel via API
      └─ Save credentials to ~/.tuna/tunnels/{id}.json

5. Install/Update cloudflared service
   ├─ Generate ingress config
   ├─ Write to ~/.tuna/config-{id}.yml
   ├─ Check if service installed
   └─ Install or update service

6. Ensure DNS record
   ├─ Get zone ID for root domain
   ├─ Check if CNAME exists
   └─ Create or update CNAME record

7. Display tunnel info
   └─ Print: "✓ Tunnel active: https://{forward} → localhost:{port}"

8. Spawn child process
   ├─ Execute command with args
   ├─ Pipe all stdio
   └─ Wait for exit

9. Exit
   └─ Return child's exit code
```

## CI/CD Pipeline

### Pull Requests & Main Branch (`.github/workflows/ci.yml`)
- Lint with ESLint
- Type check with TypeScript
- Run tests with Vitest
- Build all packages

### Releases (`.github/workflows/release.yml`)
Triggered on version tags (`v*`):

1. **Publish CLI to npm**
   - Type check and test
   - Publish with `--provenance` flag for supply chain security
   - Uses `NPM_TOKEN` secret

2. **Deploy Docs to Cloudflare**
   - Build Vocs documentation
   - Deploy with Wrangler
   - Uses `CLOUDFLARE_API_TOKEN` secret

3. **Deploy Website to Cloudflare**
   - Build Vite + React app
   - Deploy with Wrangler
   - Uses `CLOUDFLARE_API_TOKEN` secret

## Dependencies

### CLI Package (`packages/cli`)
```json
{
  "dependencies": {
    "execa": "^9.0.0",           // Process management
    "keytar": "^7.9.0",          // Keychain access
    "chalk": "^5.3.0",           // Colors
    "ora": "^9.0.0",             // Spinners
    "inquirer": "^13.0.0",       // Prompts
    "find-up": "^8.0.0",         // Find package.json
    "js-yaml": "^4.1.0"          // YAML config generation
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "tsx": "^4.0.0",
    "vitest": "^4.0.0",
    "@types/node": "^25.0.0"
  }
}
```

### Docs Package (`packages/docs`)
- Vocs for documentation
- React 19
- Deployed to Cloudflare Workers

### Web Package (`packages/web`)
- Vite + React 19
- Tailwind CSS v4
- Lucide React icons
- Deployed to Cloudflare Workers

## Security Considerations

### Credential Storage
- API tokens stored in macOS Keychain with encryption at rest
- Biometric authentication required for each access
- Never stored in package.json or environment variables
- Credentials scoped per domain (isolated)

### Tunnel Secrets
- Generated using crypto.randomBytes(32)
- Stored in ~/.tuna/tunnels/ with 0600 permissions
- Never logged or displayed

### npm Publishing
- Uses `--provenance` flag for supply chain security
- Requires `id-token: write` permission in GitHub Actions
- Cryptographically links published package to source repo

## Testing Strategy

### Unit Tests
- Credential manager (mock Keychain)
- Config reader (fixture package.json files)
- API client (mock HTTP responses)
- DNS manager (mock API calls)

### Integration Tests
- Full flow with test Cloudflare account
- Service installation/management
- DNS record creation/deletion
- Child process wrapping

Run tests:
```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:ui        # Vitest UI
```
