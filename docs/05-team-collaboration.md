# Team Collaboration with Environment Variables

## Problem

When multiple developers work on the same project, they often need to run development servers and expose them via tunnels. Without coordination, this leads to conflicts:

- **Subdomain conflicts**: Two developers can't use `api.example.com` simultaneously
- **Tunnel naming conflicts**: Multiple tunnels with the same name cause confusion
- **Manual configuration**: Each developer needs to manually edit config files

## Solution: Environment Variable Interpolation

Tuna supports environment variable interpolation in the `forward` field, allowing the same `package.json` configuration to work for all team members without conflicts.

## Supported Variables

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `$USER` | Current system username | `alice`, `bob`, `charlie` |
| `$TUNA_USER` | Custom identifier (falls back to `$USER`) | Any string set by user |
| `$HOME` | User's home directory | `/Users/alice` |

**Priority:** `$TUNA_USER` > `$USER` > `'unknown'`

## Configuration

### Basic Usage

**package.json:**
```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

**Results:**
- Alice (USER=alice) → `alice-api.example.com`
- Bob (USER=bob) → `bob-api.example.com`
- Charlie (USER=charlie) → `charlie-api.example.com`

### Custom Identifier

For users who want more control or have usernames that aren't DNS-friendly:

**Set custom identifier:**
```bash
export TUNA_USER="alice-dev"
```

**package.json:**
```json
{
  "tuna": {
    "forward": "$TUNA_USER-api.example.com",
    "port": 3000
  }
}
```

**Result:** `alice-dev-api.example.com`

### Multiple Placeholders

You can use environment variables in any part of the domain:

```json
{
  "tuna": {
    "forward": "app-$USER.staging.example.com",
    "port": 3000
  }
}
```

**Results:**
- Alice → `app-alice.staging.example.com`
- Bob → `app-bob.staging.example.com`

## How It Works

### 1. Configuration Reading

When tuna reads your `package.json`, it:
1. Reads the `forward` value (e.g., `$USER-api.example.com`)
2. Interpolates environment variables
3. Validates the resulting domain
4. Uses the interpolated value for tunnel and DNS creation

### 2. Tunnel Naming

Tunnel names are generated **after** interpolation:

**Config:** `"forward": "$USER-api.example.com"`

**Interpolated:** `alice-api.example.com`

**Tunnel name:** `tuna-alice-api-example-com`

This ensures each developer gets their own tunnel.

### 3. DNS Records

DNS records are created using the interpolated domain:

- Alice: CNAME `alice-api.example.com` → `{tunnel-id}.cfargotunnel.com`
- Bob: CNAME `bob-api.example.com` → `{tunnel-id}.cfargotunnel.com`

## Examples

### Example 1: API Development

**Scenario:** Team developing a REST API

**package.json:**
```json
{
  "name": "company-api",
  "tuna": {
    "forward": "$USER-api.company.com",
    "port": 3000
  }
}
```

**Usage:**
```bash
# Alice
$ tuna npm run dev
✓ Tunnel active: https://alice-api.company.com → localhost:3000

# Bob (in his environment)
$ tuna npm run dev
✓ Tunnel active: https://bob-api.company.com → localhost:3000
```

**Result:** No conflicts! Each developer has their own URL.

### Example 2: Multiple Environments

**Scenario:** Testing different features

**Set environment variable:**
```bash
# Alice working on feature-auth
export TUNA_USER="alice-auth"

# Bob working on feature-payments
export TUNA_USER="bob-payments"
```

**package.json:**
```json
{
  "tuna": {
    "forward": "$TUNA_USER.staging.example.com",
    "port": 3000
  }
}
```

**Result:**
- Alice: `alice-auth.staging.example.com`
- Bob: `bob-payments.staging.example.com`

### Example 3: Frontend + Backend

**Scenario:** Full-stack development with multiple services

**frontend/package.json:**
```json
{
  "tuna": {
    "forward": "$USER-app.example.com",
    "port": 3000
  }
}
```

**backend/package.json:**
```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 8080
  }
}
```

**Usage:**
```bash
# Terminal 1 (frontend)
$ cd frontend
$ tuna npm run dev
✓ Tunnel active: https://alice-app.example.com → localhost:3000

# Terminal 2 (backend)
$ cd backend
$ tuna npm run dev
✓ Tunnel active: https://alice-api.example.com → localhost:8080
```

**Result:** Both services exposed with clear, conflict-free URLs.

## Best Practices

### 1. Use $USER for Teams

For most teams, `$USER` is sufficient and automatic:

```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

✅ No setup required  
✅ Works out of the box  
✅ Clear who owns which tunnel  

### 2. Use $TUNA_USER for Custom Naming

Use `$TUNA_USER` when you need more control:

```bash
# In shell profile or project .envrc
export TUNA_USER="myname-feature-x"
```

✅ More descriptive  
✅ Multiple tunnels per user  
✅ Better for feature branches  

### 3. Document in README

Add to your project README:

```markdown
## Development

This project uses Tuna for local tunneling.

1. Install dependencies: `npm install`
2. Run dev server: `npm run dev`

Your personal tunnel will be created at:
`https://$(whoami)-api.example.com`
```

### 4. Add to .env.example

For custom identifiers:

```bash
# .env.example
TUNA_USER=your-name
```

### 5. Wildcard DNS

Ensure your DNS supports wildcards for dynamic subdomains:

- Create wildcard record: `*.example.com` → Cloudflare proxy
- Or rely on tuna's automatic DNS creation per tunnel

## Troubleshooting

### Issue: Username contains invalid characters

**Problem:**
```json
{ "forward": "$USER-api.example.com" }
```

If `USER=alice.smith`, result is `alice.smith-api.example.com` (invalid - consecutive dots).

**Solution:**

Use `$TUNA_USER` with sanitized value:
```bash
export TUNA_USER=$(echo $USER | tr '.' '-')
```

Or set explicitly:
```bash
export TUNA_USER="alice-smith"
```

### Issue: Variable not interpolated

**Problem:** Tunnel created with literal `$USER-api.example.com`

**Cause:** Environment variable not set

**Solution:**
```bash
# Check if USER is set
echo $USER

# If empty, set it
export USER=$(whoami)
```

### Issue: Same tunnel for all team members

**Problem:** Everyone gets `unknown-api.example.com`

**Cause:** Neither `$USER` nor `$TUNA_USER` is set

**Solution:**
```bash
# Set USER variable
export USER=$(whoami)

# Or set TUNA_USER
export TUNA_USER="myname"
```

### Issue: Need different tunnels for different branches

**Solution:** Use branch name in `$TUNA_USER`:

```bash
# .envrc or shell profile
export TUNA_USER="$USER-$(git branch --show-current)"
```

**Result:** `alice-feature-auth-api.example.com`

## Security Considerations

### Environment Variables

- Environment variables are interpolated at **runtime** (when you run `tuna`)
- Values are **not stored** in package.json
- Credentials remain in Keychain (not affected by interpolation)

### Shared Configuration

- `package.json` can be committed to git safely
- No secrets exposed (only pattern, not actual values)
- Each developer's actual domain depends on their environment

### DNS Records

- Each interpolated domain gets its own DNS record
- Records are scoped to the tunnel owner
- No cross-developer access unless explicitly configured

## Migration Guide

### Migrating from Fixed Domains

**Before:**
```json
{
  "tuna": {
    "forward": "alice-api.example.com",
    "port": 3000
  }
}
```

**After:**
```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

**Steps:**
1. Update `package.json` with variable
2. Commit the change
3. Each developer pulls and runs `tuna`
4. Old fixed tunnels can be deleted with `tuna --delete`

### Gradual Rollout

Not ready for full team adoption?

**Hybrid approach:**
```json
{
  "tuna": {
    "forward": "dev-api.example.com",
    "port": 3000
  }
}
```

**Early adopters** can override:
```bash
export TUNA_FORWARD="$USER-api.example.com"
```

(Future feature - environment variable override)

## FAQ

### Q: Can I use other environment variables?

Currently supported: `$USER`, `$TUNA_USER`, `$HOME`

For other variables, set `$TUNA_USER` based on them:
```bash
export TUNA_USER="${USER}-${BRANCH_NAME}"
```

### Q: What if my username has special characters?

Tuna validates the domain after interpolation. If invalid:

```
Error: Invalid domain format: alice@smith-api.example.com
```

**Solution:** Use `$TUNA_USER` with sanitized value.

### Q: Can I see the interpolated value before creating tunnel?

Yes! Tuna displays it during setup:

```
⠋ Setting up tunnel...
✓ Retrieved credentials for example.com
⠋ Creating tunnel 'tuna-alice-api-example-com'...
```

The tunnel name reveals the interpolated domain.

### Q: Does this work for DNS management commands?

Yes! All commands respect interpolation:

```bash
$ tuna --list
# Shows: alice-api.example.com

$ tuna --delete
# Deletes tunnel for: alice-api.example.com
```

### Q: What about CI/CD?

In CI environments, set explicit `$TUNA_USER`:

```yaml
# .github/workflows/deploy.yml
env:
  TUNA_USER: "ci-${GITHUB_SHA:0:7}"
```

Result: `ci-a3f8b2c-api.example.com`

## Summary

Environment variable interpolation in Tuna enables:

✅ **Zero-conflict team collaboration**  
✅ **No manual configuration per developer**  
✅ **Same package.json for everyone**  
✅ **Clear ownership of tunnels**  
✅ **Flexible naming strategies**  

Simply use `$USER` in your `forward` field and let tuna handle the rest!

```json
{
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

Run `tuna <command>` and get your personal tunnel automatically. 🚀
