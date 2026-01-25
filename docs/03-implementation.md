# Implementation Plan

## Phase 1: Project Setup

### 1.1 Initialize Project

```bash
cd tuna
pnpm init
pnpm add -D typescript @types/node tsx
npx tsc --init
```

### 1.2 TypeScript Configuration

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 1.3 Project Structure

```
tuna/
├── docs/                      # Documentation (completed)
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # Command handlers
│   │   ├── login.ts
│   │   ├── run.ts
│   │   ├── list.ts
│   │   ├── stop.ts
│   │   └── delete.ts
│   ├── lib/                  # Core libraries
│   │   ├── credentials.ts
│   │   ├── config.ts
│   │   ├── api.ts
│   │   ├── cloudflared.ts
│   │   ├── service.ts
│   │   ├── process.ts
│   │   └── dns.ts
│   └── types/                # TypeScript types
│       ├── config.ts
│       ├── cloudflare.ts
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### 1.4 Install Dependencies

```bash
pnpm add \
  commander \
  execa \
  axios \
  keytar \
  chalk \
  ora \
  inquirer \
  find-up \
  js-yaml

pnpm add -D \
  typescript \
  tsx \
  @types/inquirer \
  @types/js-yaml \
  @types/node
```

### 1.5 Package.json Configuration

```json
{
  "name": "tuna",
  "version": "1.0.0",
  "description": "Cloudflare Tunnel Wrapper for Development Servers",
  "type": "module",
  "bin": {
    "tuna": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "dev": "tsx watch src/index.ts",
    "prepublishOnly": "pnpm typecheck"
  },
  "keywords": ["cloudflare", "tunnel", "dev", "ngrok", "localtunnel"],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## Phase 2: Type Definitions

### 2.1 Configuration Types

**src/types/config.ts:**
```typescript
export interface TunaConfig {
  forward: string;  // Domain to expose
  port: number;     // Local port
}

export interface PackageJson {
  name?: string;
  version?: string;
  tuna?: TunaConfig;
  [key: string]: any;
}
```

### 2.2 Cloudflare API Types

**src/types/cloudflare.ts:**
```typescript
export interface Credentials {
  apiToken: string;
  accountId: string;
  domain: string;
}

export interface Tunnel {
  id: string;
  name: string;
  created_at: string;
  deleted_at?: string;
  status: 'healthy' | 'down' | 'degraded';
  connections?: Connection[];
}

export interface Connection {
  id: string;
  client_id: string;
  colo_name: string;
  opened_at: string;
  origin_ip: string;
}

export interface DnsRecord {
  id?: string;
  type: 'CNAME' | 'A' | 'AAAA';
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
}

export interface Zone {
  id: string;
  name: string;
  status: string;
}

export interface IngressRule {
  hostname?: string;
  service: string;
}

export interface IngressConfig {
  tunnel: string;
  credentials_file: string;
  ingress: IngressRule[];
}

export interface ServiceStatus {
  running: boolean;
  pid?: number;
}
```

---

## Phase 3: Core Libraries

### 3.1 Credential Manager

**src/lib/credentials.ts:**
```typescript
import keytar from 'keytar';

const SERVICE_PREFIX = 'tuna-credentials-';

export interface Credentials {
  apiToken: string;
  accountId: string;
  domain: string;
}

export async function storeCredentials(
  domain: string,
  creds: Credentials
): Promise<void> {
  const service = SERVICE_PREFIX + domain;
  const password = JSON.stringify(creds);
  await keytar.setPassword(service, domain, password);
}

export async function getCredentials(
  domain: string
): Promise<Credentials | null> {
  const service = SERVICE_PREFIX + domain;
  const password = await keytar.getPassword(service, domain);
  
  if (!password) {
    return null;
  }
  
  return JSON.parse(password);
}

export async function deleteCredentials(domain: string): Promise<boolean> {
  const service = SERVICE_PREFIX + domain;
  return await keytar.deletePassword(service, domain);
}

export async function listDomains(): Promise<string[]> {
  const credentials = await keytar.findCredentials(SERVICE_PREFIX);
  return credentials.map(c => c.account);
}

export function getRootDomain(forward: string): string {
  const parts = forward.split('.');
  if (parts.length < 2) {
    throw new Error(`Invalid domain: ${forward}`);
  }
  return parts.slice(-2).join('.');
}
```

### 3.2 Config Manager

**src/lib/config.ts:**
```typescript
import { findUp } from 'find-up';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { PackageJson, TunaConfig } from '../types/config';

export async function findPackageJson(): Promise<string | null> {
  return await findUp('package.json');
}

export async function readConfig(): Promise<TunaConfig> {
  const pkgPath = await findPackageJson();
  
  if (!pkgPath) {
    throw new Error('No package.json found. Run from project directory.');
  }
  
  const content = await readFile(pkgPath, 'utf-8');
  const pkg: PackageJson = JSON.parse(content);
  
  if (!pkg.tuna) {
    throw new Error(
      'No "tuna" config in package.json. Add:\n' +
      '{\n' +
      '  "tuna": {\n' +
      '    "forward": "my-app.example.com",\n' +
      '    "port": 3000\n' +
      '  }\n' +
      '}'
    );
  }
  
  // Interpolate environment variables in forward field
  const interpolatedConfig = {
    ...pkg.tuna,
    forward: interpolateEnvVars(pkg.tuna.forward)
  };
  
  validateConfig(interpolatedConfig);
  return interpolatedConfig;
}

export function interpolateEnvVars(value: string): string {
  // Interpolate environment variables
  // Priority: TUNA_USER > USER > 'unknown'
  return value
    .replace(/\$TUNA_USER/g, process.env.TUNA_USER || process.env.USER || 'unknown')
    .replace(/\$USER/g, process.env.USER || 'unknown')
    .replace(/\$HOME/g, process.env.HOME || '~');
}

export function validateConfig(config: TunaConfig): void {
  if (!config.forward) {
    throw new Error('Missing "forward" in tuna config');
  }
  
  if (!config.port) {
    throw new Error('Missing "port" in tuna config');
  }
  
  if (typeof config.port !== 'number') {
    throw new Error('"port" must be a number');
  }
  
  if (config.port < 1 || config.port > 65535) {
    throw new Error('"port" must be between 1 and 65535');
  }
  
  // Basic domain validation (after interpolation)
  const domainRegex = /^[a-z0-9][a-z0-9-_.]*\.[a-z]{2,}$/i;
  if (!domainRegex.test(config.forward)) {
    throw new Error(`Invalid domain format: ${config.forward}`);
  }
  
  // Ensure no unresolved variables remain
  if (config.forward.includes('$')) {
    throw new Error(
      `Unresolved environment variables in forward field: ${config.forward}\n` +
      'Supported: $USER, $TUNA_USER, $HOME'
    );
  }
}
```

### 3.3 Cloudflare API Client

**src/lib/api.ts:**
```typescript
import axios, { AxiosInstance } from 'axios';
import type { Tunnel, DnsRecord, Zone, Credentials } from '../types/cloudflare';

const BASE_URL = 'https://api.cloudflare.com/client/v4';

export class CloudflareAPI {
  private client: AxiosInstance;
  private accountId: string;
  
  constructor(credentials: Credentials) {
    this.accountId = credentials.accountId;
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${credentials.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  // Validate token and get account ID
  async validateToken(): Promise<string> {
    const response = await this.client.get('/user/tokens/verify');
    if (!response.data.success) {
      throw new Error('Invalid API token');
    }
    
    // Get account ID
    const accountsResponse = await this.client.get('/accounts');
    const accounts = accountsResponse.data.result;
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    return accounts[0].id;
  }
  
  // Tunnel Operations
  async createTunnel(name: string, secret: string): Promise<Tunnel> {
    const response = await this.client.post(
      `/accounts/${this.accountId}/cfd_tunnel`,
      {
        name,
        tunnel_secret: secret,
        config_src: 'local'
      }
    );
    
    if (!response.data.success) {
      throw new Error(`Failed to create tunnel: ${response.data.errors[0]?.message}`);
    }
    
    return response.data.result;
  }
  
  async listTunnels(): Promise<Tunnel[]> {
    const response = await this.client.get(
      `/accounts/${this.accountId}/cfd_tunnel`
    );
    
    if (!response.data.success) {
      throw new Error('Failed to list tunnels');
    }
    
    return response.data.result;
  }
  
  async getTunnel(tunnelId: string): Promise<Tunnel> {
    const response = await this.client.get(
      `/accounts/${this.accountId}/cfd_tunnel/${tunnelId}`
    );
    
    if (!response.data.success) {
      throw new Error('Tunnel not found');
    }
    
    return response.data.result;
  }
  
  async deleteTunnel(tunnelId: string): Promise<void> {
    const response = await this.client.delete(
      `/accounts/${this.accountId}/cfd_tunnel/${tunnelId}`
    );
    
    if (!response.data.success) {
      throw new Error('Failed to delete tunnel');
    }
  }
  
  // Zone Operations
  async getZoneByName(domain: string): Promise<Zone> {
    const response = await this.client.get('/zones', {
      params: { name: domain }
    });
    
    if (!response.data.success || response.data.result.length === 0) {
      throw new Error(`Zone not found: ${domain}`);
    }
    
    return response.data.result[0];
  }
  
  // DNS Operations
  async createDnsRecord(zoneId: string, record: DnsRecord): Promise<DnsRecord> {
    const response = await this.client.post(
      `/zones/${zoneId}/dns_records`,
      record
    );
    
    if (!response.data.success) {
      throw new Error('Failed to create DNS record');
    }
    
    return response.data.result;
  }
  
  async listDnsRecords(zoneId: string, name?: string): Promise<DnsRecord[]> {
    const params = name ? { name } : {};
    const response = await this.client.get(
      `/zones/${zoneId}/dns_records`,
      { params }
    );
    
    if (!response.data.success) {
      throw new Error('Failed to list DNS records');
    }
    
    return response.data.result;
  }
  
  async updateDnsRecord(
    zoneId: string,
    recordId: string,
    record: DnsRecord
  ): Promise<DnsRecord> {
    const response = await this.client.put(
      `/zones/${zoneId}/dns_records/${recordId}`,
      record
    );
    
    if (!response.data.success) {
      throw new Error('Failed to update DNS record');
    }
    
    return response.data.result;
  }
  
  async deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
    const response = await this.client.delete(
      `/zones/${zoneId}/dns_records/${recordId}`
    );
    
    if (!response.data.success) {
      throw new Error('Failed to delete DNS record');
    }
  }
}
```

### Implementation continues in phases 4-7...

---

## Phase 4: Cloudflared Management

**Key tasks:**
- Detect cloudflared installation
- Auto-download binary for platform
- Version checking
- Execute cloudflared commands

---

## Phase 5: Service Management

**Key tasks:**
- Generate ingress config YAML
- Install cloudflared service (launchd)
- Start/stop/restart service
- Check service status
- Uninstall service

---

## Phase 6: Command Implementations

**Key tasks:**
- Implement `tuna --login`
- Implement `tuna <command>` wrapper
- Implement `tuna --list`
- Implement `tuna --stop`
- Implement `tuna --delete`

---

## Phase 7: Testing & Polish

**Key tasks:**
- Error handling
- User-friendly messages
- Help documentation
- README
- Testing

---

## Development Workflow

### Installation

```bash
# Install dependencies
pnpm install

# Link globally to make 'tuna' available in PATH
pnpm link --global

# Verify installation
tuna --version
```

### Local Development

```bash
# Type check
pnpm typecheck

# Run tests
pnpm test              # Watch mode
pnpm test:run          # Run once
pnpm test:ui           # UI mode
```

### Testing

```bash
# Test CLI commands
tuna --help
tuna --version
tuna --list
tuna --login

# Create test project
mkdir test-project
cd test-project
pnpm init

# Add tuna config to package.json:
{
  "tuna": {
    "forward": "test.example.com",
    "port": 3000
  }
}

# Test commands
tuna echo "hello"
tuna --delete
```

---

## Deployment

### npm Package

```bash
# Type check
pnpm typecheck

# Publish
pnpm publish
```

### Version Management

```bash
# Patch (1.0.0 → 1.0.1)
pnpm version patch

# Minor (1.0.0 → 1.1.0)
pnpm version minor

# Major (1.0.0 → 2.0.0)
pnpm version major
```

---

## Next Steps After Phase 1

1. Implement credential management (Phase 2)
2. Implement config reading (Phase 2)
3. Implement Cloudflare API client (Phase 3)
4. Implement cloudflared management (Phase 4)
5. Implement service management (Phase 5)
6. Implement commands (Phase 6)
7. Testing and polish (Phase 7)
