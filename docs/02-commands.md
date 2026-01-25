# Command Specifications

## Command: `tuna --login`

**Purpose:** Set up Cloudflare credentials for tunnel management.

### Behavior

1. Prompt user for Cloudflare API token
2. Validate token by making API call
3. Fetch and store account ID
4. Prompt for default domain (e.g., `example.com`)
5. Store credentials in macOS Keychain
6. Display success message with next steps

### Interactive Flow

```
$ tuna --login

🔐 Cloudflare Login

? Enter your Cloudflare API token: ************************************
⠋ Validating token...
✓ Token valid
✓ Account ID: 699d98642c564d2e855e9661899b7252

? Enter your domain (e.g., example.com): oxc.dev
⠋ Storing credentials in Keychain...
✓ Credentials saved (biometric auth required for access)

Next steps:
  1. Add this to your package.json:
     {
       "tuna": {
         "forward": "my-app.oxc.dev",
         "port": 3000
       }
     }
  2. Run: tuna <your-dev-command>
```

### Keychain Storage

- Service: `tuna-credentials-oxc.dev`
- Account: `oxc.dev`
- Password: JSON string containing `{ apiToken, accountId, domain }`

### Error Handling

| Error | Message | Recovery |
|-------|---------|----------|
| Invalid token | `Error: Invalid API token. Please check your token and try again.` | Re-enter token |
| Network error | `Error: Could not connect to Cloudflare API. Check your connection.` | Retry |
| Insufficient permissions | `Error: Token lacks required permissions. See: [url]` | Create new token |
| Keychain denied | `Error: Could not save to Keychain. Check System Preferences > Security.` | Fix permissions |

### API Token Requirements

User must create a token with these permissions:
- **Account** → Cloudflare Tunnel → Edit
- **Account** → Access: Apps and Policies → Edit (required for access control)
- **Zone** → DNS → Edit  
- **Account** → Account Settings → Read

### Exit Codes

- `0` - Success
- `1` - Validation failed
- `2` - Keychain access denied

---

## Command: `tuna <command> [args...]`

**Purpose:** Wrap a development command with automatic Cloudflare tunnel.

### Behavior

1. Find package.json with tuna config
2. Retrieve credentials from Keychain (biometric auth)
3. Create/update Cloudflare tunnel
4. Install cloudflared service with ingress config
5. Create/update DNS record
6. Display tunnel URL
7. Spawn child process with command
8. Proxy all stdio bidirectionally
9. Wait for child to exit
10. Exit with child's exit code

### Examples

```bash
# Vite
tuna vite dev --port 3000

# Next.js
tuna next dev

# Node.js
tuna node server.js

# Python
tuna python -m http.server 8080

# Any npm script
tuna npm run dev
```

### Configuration Required

**Basic configuration:**
```json
{
  "tuna": {
    "forward": "my-app.example.com",
    "port": 3000
  }
}
```

**Team collaboration (with environment variables):**
```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

**With access control:**
```json
{
  "tuna": {
    "forward": "my-app.example.com",
    "port": 3000,
    "access": ["@company.com", "contractor@gmail.com"]
  }
}
```

**Supported environment variables:**
- `$USER` - Current username (e.g., `alice-api.example.com`)
- `$TUNA_USER` - Custom identifier (fallback to `$USER` if not set)
- `$HOME` - Home directory (rarely used in domains)

**Access control patterns:**
- `@domain.com` - Allow all emails from domain (email domain rule)
- `email@example.com` - Allow specific email address

This prevents subdomain conflicts when multiple developers work on the same project.

### Output

```
$ tuna vite dev --port 3000

🔐 Touch ID required to access credentials
[Touch ID prompt appears]

⠋ Setting up tunnel...
✓ Retrieved credentials for example.com
⠋ Creating tunnel 'tuna-my-app-example-com'...
✓ Tunnel created (ID: c1744f8b-faa1-48a4-9e5c-02ac921467fa)
⠋ Installing cloudflared service...
✓ Service installed
⠋ Creating DNS record...
✓ DNS: my-app.example.com → c1744f8b.cfargotunnel.com
⠋ Starting service...
✓ Tunnel active

🌐 https://my-app.example.com → localhost:3000

  VITE v5.0.0  ready in 234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose

[... vite continues normally ...]

^C
✓ Process stopped (tunnel still running)
```

### Stdio Handling

- **stdin**: Piped to child process (interactive commands work)
- **stdout**: Piped from child to tuna stdout (preserves colors/formatting)
- **stderr**: Piped from child to tuna stderr (preserves colors/formatting)
- **TTY**: Preserves TTY mode for interactive prompts

### Signal Handling

| Signal | Behavior |
|--------|----------|
| SIGINT (Ctrl+C) | Forward to child, wait for clean exit |
| SIGTERM | Forward to child, wait for clean exit |
| SIGHUP | Forward to child, wait for clean exit |

### Error Handling

| Error | Message | Recovery |
|-------|---------|----------|
| No package.json | `Error: No package.json found. Run from project directory.` | Navigate to project |
| No tuna config | `Error: No 'tuna' config in package.json. Add configuration.` | Show example |
| No credentials | `Error: Not logged in. Run: tuna --login` | Run --login |
| Port in use | `Error: Port 3000 is already in use.` | Change port or kill process |
| Zone not found | `Error: Domain 'example.com' not found in Cloudflare account.` | Add domain to Cloudflare |
| Biometric failed | `Error: Authentication required to access credentials.` | Retry auth |
| Invalid env var result | `Error: Forward domain contains invalid characters after interpolation.` | Check env vars |

### Tunnel Naming

Format: `tuna-{sanitized-forward}`

**Important:** Forward field is interpolated with environment variables BEFORE sanitization.

Examples:
- `my-app.example.com` → `tuna-my-app-example-com`
- `api-v2.staging.example.com` → `tuna-api-v2-staging-example-com`
- `$USER-api.example.com` (with USER=alice) → `tuna-alice-api-example-com`
- `$USER-api.example.com` (with USER=bob) → `tuna-bob-api-example-com`

**Sanitization:** Replace all non-alphanumeric characters with `-`, lowercase

**This ensures each team member gets their own tunnel and subdomain, preventing conflicts.**

### Exit Codes

- Exits with same code as child process
- `0` if child exits successfully
- `1` if child exits with error
- `130` if interrupted with Ctrl+C (SIGINT)

---

## Command: `tuna --list`

**Purpose:** List all Cloudflare tunnels for configured account(s).

### Behavior

1. If multiple domains configured, prompt to select
2. Retrieve credentials from Keychain (biometric auth)
3. Call Cloudflare API to list tunnels
4. For each tunnel, fetch status and DNS records
5. Display formatted table

### Output

```
$ tuna --list

🔐 Touch ID required
[Touch ID prompt]

TUNNELS for example.com (4)

NAME                           STATUS    DOMAIN                     CREATED
tuna-alice-api-example-com     ● healthy alice-api.example.com     2026-01-23 10:49
tuna-bob-api-example-com       ● healthy bob-api.example.com       2026-01-23 11:15
tuna-my-app-example-com        ● healthy my-app.example.com        2026-01-22 15:30
tuna-staging-example-com       ○ down    staging.example.com       2026-01-20 08:15

● = healthy   ○ = down   ⚠ = degraded

Note: Tunnels with user-specific names (alice, bob) were created using $USER in forward config.
```

### Table Columns

- **NAME**: Tunnel name (generated by tuna)
- **STATUS**: Health status with indicator
  - `● healthy` - Tunnel active with connections
  - `○ down` - Tunnel exists but no connections
  - `⚠ degraded` - Tunnel has issues
- **DOMAIN**: DNS record(s) pointing to tunnel
- **CREATED**: Creation date (YYYY-MM-DD HH:mm)

### Multiple Domains

If user has configured multiple domains:

```
$ tuna --list

Select domain:
  1. example.com (3 tunnels)
  2. another.com (1 tunnel)
> All domains

[Shows combined list]
```

### Error Handling

| Error | Message |
|-------|---------|
| No credentials | `Error: Not logged in. Run: tuna --login` |
| API error | `Error: Could not fetch tunnels. Check your connection.` |
| No tunnels | `No tunnels found for example.com` |

### Exit Codes

- `0` - Success
- `1` - Error

---

## Command: `tuna --stop`

**Purpose:** Stop the cloudflared service.

### Behavior

1. Check if service is running
2. Confirm with user (if interactive)
3. Stop the service
4. Display status

### Output

```
$ tuna --stop

⚠  This will stop the cloudflared service and take all tunnels offline.
? Are you sure? (y/N) y

⠋ Stopping service...
✓ Cloudflared service stopped

Tunnels are offline. Run 'tuna <command>' to restart.
```

### Non-Interactive Mode

```bash
$ tuna --stop --yes
✓ Cloudflared service stopped
```

### Error Handling

| Error | Message |
|-------|---------|
| Service not running | `Service is not running` (exit 0) |
| Permission denied | `Error: Permission denied. Try with sudo?` |

### Exit Codes

- `0` - Success or already stopped
- `1` - Error

---

## Command: `tuna --delete [name]`

**Purpose:** Delete a tunnel, its DNS records, and credentials.

### Behavior

#### With Name

```bash
$ tuna --delete tuna-my-app-example-com
```

1. Retrieve credentials (biometric auth)
2. Confirm with user
3. Stop service if running
4. Delete tunnel via API
5. Delete DNS records
6. Remove local files
7. Uninstall service if no other tunnels

#### Without Name (Current Project)

```bash
$ tuna --delete
```

1. Read package.json in current directory
2. Derive tunnel name from `tuna.forward`
3. Follow same steps as above

### Output

```
$ tuna --delete

🔐 Touch ID required
[Touch ID prompt]

Found tunnel: tuna-my-app-example-com
  Domain: my-app.example.com
  Created: 2026-01-23

⚠  This will:
  - Delete the tunnel
  - Remove DNS records
  - Delete local configuration

? Continue? (y/N) y

⠋ Deleting tunnel...
✓ Tunnel deleted
✓ DNS records removed
✓ Local files removed
✓ Service uninstalled
```

### Confirmation Prompt

- Required in interactive mode
- Skip with `--yes` flag:
  ```bash
  $ tuna --delete --yes
  ```

### Error Handling

| Error | Message |
|-------|---------|
| Tunnel not found | `Error: Tunnel 'name' not found` |
| API error | `Error: Could not delete tunnel. Try again.` |
| No package.json | `Error: No package.json found. Specify tunnel name.` |

### Exit Codes

- `0` - Success
- `1` - Error
- `2` - User cancelled

---

## Command: `tuna --help`

**Purpose:** Display help information.

### Output

```
$ tuna --help

tuna - Cloudflare Tunnel Wrapper for Development Servers

USAGE
  tuna <command> [args...]       Wrap command with tunnel
  tuna --login                   Setup Cloudflare credentials
  tuna --list                    List all tunnels
  tuna --stop                    Stop cloudflared service
  tuna --delete [name]           Delete tunnel
  tuna --help                    Show this help
  tuna --version                 Show version

EXAMPLES
  tuna vite dev --port 3000
  tuna npm run dev
  tuna node server.js

CONFIGURATION
  Add to package.json:
  {
    "tuna": {
      "forward": "my-app.example.com",
      "port": 3000,
      "access": ["@company.com"]  // Optional
    }
  }

SETUP
  1. Run: tuna --login
  2. Enter your Cloudflare API token
  3. Add "tuna" config to package.json
  4. Run: tuna <your-dev-command>

API TOKEN
  Create a token at: https://dash.cloudflare.com/profile/api-tokens
  
  Required permissions:
    - Account → Cloudflare Tunnel → Edit
    - Account → Access: Apps and Policies → Edit
    - Zone → DNS → Edit
    - Account → Account Settings → Read

DOCUMENTATION
  https://github.com/your-org/tuna#readme

ISSUES
  https://github.com/your-org/tuna/issues
```

---

## Command: `tuna --version`

**Purpose:** Display version information.

### Output

```
$ tuna --version
tuna v1.0.0
cloudflared v2024.1.5
```

Shows:
- Tuna version (from package.json)
- Cloudflared version (if installed)

---

## Global Flags

### `--yes` / `-y`

Skip confirmation prompts (non-interactive mode).

```bash
$ tuna --delete --yes
$ tuna --stop -y
```

### `--verbose` / `-v`

Enable verbose logging (debug information).

```bash
$ tuna --list --verbose
```

### `--quiet` / `-q`

Suppress non-error output.

```bash
$ tuna vite dev --quiet
```

---

## Environment Variables

### `TUNA_API_TOKEN`

Override Keychain credentials with environment variable.

```bash
export TUNA_API_TOKEN=your_token_here
export TUNA_ACCOUNT_ID=your_account_id
tuna vite dev
```

**Use case:** CI/CD environments where Keychain is unavailable.

### `TUNA_CLOUDFLARED_PATH`

Specify custom cloudflared binary path.

```bash
export TUNA_CLOUDFLARED_PATH=/usr/local/bin/cloudflared
tuna vite dev
```

### `TUNA_HOME`

Override default tuna directory (~/.tuna).

```bash
export TUNA_HOME=/custom/path
tuna vite dev
```

---

## Exit Codes

Standard exit codes used across all commands:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | User cancelled / validation failed |
| 130 | Interrupted (SIGINT / Ctrl+C) |
