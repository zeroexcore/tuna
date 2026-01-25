---
name: debug-tunnel
description: Diagnose and fix common tunnel connectivity and configuration issues
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: troubleshooting
---

## What I do

Help diagnose and resolve tunnel issues in Tuna. I provide systematic debugging steps, check common failure points, and suggest fixes for configuration, connectivity, and service problems.

## When to use me

Use this skill when:
- Tunnels aren't accessible from the internet
- DNS records aren't resolving correctly
- Cloudflared service fails to start
- Authentication or credential issues occur
- Port conflicts or local server issues arise
- Environment variable interpolation isn't working

## Diagnostic Process

### Step 1: Check Configuration

```bash
# Verify package.json
cat package.json | jq '.tuna'
```

**Expected:**
```json
{
  "forward": "my-app.example.com",
  "port": 3000
}
```

**Common Issues:**
- Missing `tuna` field
- Missing `forward` or `port`
- Invalid domain format
- Unresolved environment variables (contains `$`)

### Step 2: Check Environment Variables

```bash
echo "USER=$USER"
echo "TUNA_USER=$TUNA_USER"
echo "HOME=$HOME"
```

**Expected:**
- $USER should be your username
- $TUNA_USER optional

**Issues:**
- Empty values → Export variables
- Special characters → Use $TUNA_USER with sanitized value

### Step 3: Check Credentials

```bash
tuna --list
```

**Expected:**
- Touch ID prompt
- List of tunnels or "No tunnels"

**Issues:**
- "Not logged in" → `tuna --login`
- "Invalid token" → Re-login with new token
- Keychain denied → System Preferences > Security

### Step 4: Check Cloudflared

```bash
which cloudflared
cloudflared --version
launchctl list | grep cloudflared
```

**Expected:**
- Binary found
- Version 2024.x.x+
- Service may or may not be running

**Issues:**
- Not found → Should auto-download
- Old version → Update cloudflared
- Service errors → Check logs

### Step 5: Check Service

```bash
launchctl list com.cloudflare.cloudflared
tail -f ~/Library/Logs/cloudflared.log
```

**Expected:**
- Service running
- Logs show connections

**Issues:**
- Not found → Not installed yet (normal)
- Failed → Check logs for errors
- No connections → Tunnel down

### Step 6: Check Tunnel

```bash
tuna --list
```

**Expected:**
- "healthy" status
- Active connections

**Issues:**
- "down" → Service not running
- "degraded" → Connectivity issues
- No tunnel → Not created yet

### Step 7: Check DNS

```bash
dig my-app.example.com
nslookup my-app.example.com
```

**Expected:**
- CNAME to `{tunnel-id}.cfargotunnel.com`
- Proxied through Cloudflare

**Issues:**
- No record → Create with tuna
- Wrong target → Update DNS
- Not propagated → Wait 1-5 minutes

### Step 8: Check Local Port

```bash
lsof -i :3000
curl http://localhost:3000
```

**Expected:**
- Dev server running
- Responds to requests

**Issues:**
- Not in use → Start dev server
- In use by other → Change port
- Connection refused → Server not responding

## Common Problems

### Problem 1: "No package.json found"

**Cause:** Not in project directory

**Solution:**
```bash
cd /path/to/project
ls package.json  # Verify exists
```

### Problem 2: "Not logged in"

**Cause:** No credentials in Keychain

**Solution:**
```bash
tuna --login
# Enter API token
# Enter domain
```

### Problem 3: "Invalid domain format"

**Cause:** Username has special characters after interpolation

**Example:** `alice.smith-api.example.com` (consecutive dots)

**Solution:**
```bash
# Sanitize username
export TUNA_USER=$(echo $USER | tr '.' '-')
# Or set explicitly
export TUNA_USER="alice-smith"
```

### Problem 4: "Port already in use"

**Cause:** Another process using port

**Solution:**
```bash
# Find process
lsof -i :3000
# Kill it
kill -9 <PID>
# Or change port in config
```

### Problem 5: Tunnel created but not accessible

**Cause:** DNS not propagated or service issues

**Solution:**
1. Wait 1-5 minutes for DNS propagation
2. Check DNS: `dig +short my-app.example.com`
3. Restart service: `tuna --stop && tuna <command>`
4. Verify local service: `curl localhost:3000`

### Problem 6: Touch ID repeatedly prompts

**Cause:** Keychain entry corrupted

**Solution:**
```bash
# Delete credential (removes token!)
security delete-generic-password -s "tuna-credentials-example.com"
# Re-login
tuna --login
```

### Problem 7: "cloudflared not found"

**Cause:** Binary not installed

**Solution:**
- Should auto-download
- Or: `brew install cloudflared`
- Check: `~/.tuna/bin/cloudflared`

### Problem 8: Service fails to start

**Cause:** Invalid config or missing files

**Solution:**
```bash
# Check config
cat ~/.tuna/config-{tunnel-id}.yml
# Check credentials
ls ~/.tuna/tunnels/
# Reinstall service
cloudflared service install --config ~/.tuna/config-{tunnel-id}.yml
```

## Testing Tools

### Test DNS

```bash
# Check propagation
dig my-app.example.com
dig @1.1.1.1 my-app.example.com
dig @8.8.8.8 my-app.example.com
```

### Test API

```bash
# Verify token
curl -H "Authorization: Bearer $TOKEN" \
  https://api.cloudflare.com/client/v4/user/tokens/verify

# List tunnels
curl -H "Authorization: Bearer $TOKEN" \
  https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/cfd_tunnel
```

### Test Cloudflared Directly

```bash
# Run cloudflared without tuna
cloudflared tunnel --config ~/.tuna/config-{tunnel-id}.yml run
```

## Manual Cleanup

If stuck with corrupted state:

```bash
# Stop service
tuna --stop

# Delete tunnel
tuna --delete

# Or manual cleanup
rm -rf ~/.tuna/tunnels/
rm -rf ~/.tuna/config-*.yml
cloudflared service uninstall
```

## Prevention Tips

1. Check config before running: `cat package.json | jq '.tuna'`
2. Use meaningful names: `$USER-myapp.example.com`
3. Test with simple command: `tuna echo "test"`
4. Keep cloudflared updated: `brew upgrade cloudflared`
5. Monitor service: `tuna --list`

## When to Ask for Help

Include in help request:
- Output of `tuna --list`
- Content of `package.json` tuna config
- Full error messages
- Steps already tried
- macOS version
- Node version
- Cloudflared version

## Reference

- `docs/02-commands.md` - Command specs
- `docs/01-architecture.md` - Architecture
- Cloudflare Tunnel Docs: https://developers.cloudflare.com/cloudflare-one/

Load me when tunnels aren't working and I'll help you debug systematically!
