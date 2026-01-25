---
name: test-env-vars
description: Comprehensive testing guide for environment variable interpolation in the forward config field
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: testing
---

## What I do

Test the critical team collaboration feature: environment variable interpolation in the `forward` configuration field. This ensures multiple developers can use the same `package.json` without subdomain conflicts.

## When to use me

Use this skill when:
- You've implemented Phase 3 (config reader with interpolation)
- You need to verify env var interpolation works correctly
- You're testing the team collaboration feature
- You're debugging interpolation issues

## Test Setup

### Create Test Project

```bash
mkdir -p /tmp/tuna-test
cd /tmp/tuna-test
pnpm init
```

### Add Configuration

```json
{
  "name": "tuna-test",
  "type": "module",
  "tuna": {
    "forward": "$USER-api.example.com",
    "port": 3000
  }
}
```

### Link Tuna

```bash
cd /path/to/tuna
pnpm link --global
cd /tmp/tuna-test
pnpm link --global tuna
```

## Test Cases

### Test 1: Basic $USER Interpolation

**Setup:**
```bash
export USER=alice
```

**Expected:**
- Config reads: `$USER-api.example.com`
- After interpolation: `alice-api.example.com`
- Tunnel name: `tuna-alice-api-example-com`

**Verify:**
- Run `tuna echo "test"`
- Check output shows `alice-api.example.com`
- Tunnel created with alice in name

### Test 2: $TUNA_USER Override

**Setup:**
```bash
export USER=alice
export TUNA_USER=alice-dev
```

**Expected:**
- After interpolation: `alice-dev-api.example.com`
- $TUNA_USER takes priority over $USER

**Verify:**
- Output shows `alice-dev-api.example.com`
- Tunnel name includes `alice-dev`

### Test 3: Multiple Users (Conflict Prevention)

**Terminal 1 (Alice):**
```bash
export USER=alice
cd /tmp/tuna-test-alice
# Same package.json with $USER
tuna pnpm run dev
```

**Terminal 2 (Bob):**
```bash
export USER=bob
cd /tmp/tuna-test-bob
# Same package.json with $USER
tuna pnpm run dev
```

**Expected:**
- Alice gets: `alice-api.example.com`
- Bob gets: `bob-api.example.com`
- No conflicts!

**Verify:**
```bash
tuna --list
# Should show both:
# tuna-alice-api-example-com
# tuna-bob-api-example-com
```

### Test 4: Fallback to 'unknown'

**Setup:**
```bash
unset USER
unset TUNA_USER
```

**Expected:**
- Fallback to 'unknown': `unknown-api.example.com`

**Verify:**
- Should not error
- Uses 'unknown' as fallback

### Test 5: Invalid Characters

**Setup:**
```bash
export USER="alice.smith"  # Contains dot
```

**Expected:**
- Result: `alice.smith-api.example.com`
- Validation catches consecutive dots
- Helpful error message

**Verify:**
- Error: "Invalid domain format"
- Suggests using $TUNA_USER

### Test 6: Multiple Placeholders

**Config:**
```json
{
  "tuna": {
    "forward": "app-$USER.staging.example.com",
    "port": 3000
  }
}
```

**Setup:**
```bash
export USER=alice
```

**Expected:**
- Result: `app-alice.staging.example.com`

**Verify:**
- Interpolation works anywhere in string

## Unit Tests

### Test interpolateEnvVars() Function

```typescript
import { interpolateEnvVars } from './src/lib/config';

// Test 1: $USER
process.env.USER = 'alice';
const result1 = interpolateEnvVars('$USER-api.example.com');
assert.equal(result1, 'alice-api.example.com');

// Test 2: $TUNA_USER priority
process.env.TUNA_USER = 'alice-dev';
const result2 = interpolateEnvVars('$USER-api.example.com');
assert.equal(result2, 'alice-dev-api.example.com');

// Test 3: Fallback
delete process.env.USER;
delete process.env.TUNA_USER;
const result3 = interpolateEnvVars('$USER-api.example.com');
assert.equal(result3, 'unknown-api.example.com');
```

### Test Validation

```typescript
// Should pass
validateConfig({ forward: 'alice-api.example.com', port: 3000 });

// Should fail - unresolved variable
validateConfig({ forward: '$USER-api.example.com', port: 3000 });
// Expected: Error about unresolved variables

// Should fail - invalid after interpolation
validateConfig({ forward: 'alice..smith-api.example.com', port: 3000 });
// Expected: Error about invalid domain format
```

## Integration Test

Full end-to-end flow:

```bash
export USER=testuser
cd /tmp/tuna-integration-test
cat > package.json << 'EOF'
{
  "tuna": {
    "forward": "$USER-test.example.com",
    "port": 3000
  }
}
EOF

# Login
tuna --login

# Run command
tuna echo "Integration test"

# Verify
tuna --list | grep "testuser-test"

# Cleanup
tuna --delete
```

**Expected:**
- Tunnel: `tuna-testuser-test-example-com`
- DNS: `testuser-test.example.com`
- Listed correctly
- Deleted successfully

## Checklist

- [ ] $USER interpolation works
- [ ] $TUNA_USER takes priority
- [ ] Multiple users don't conflict
- [ ] Fallback to 'unknown' when unset
- [ ] Invalid characters caught
- [ ] Multiple placeholders work
- [ ] Validation after interpolation
- [ ] Unresolved variables cause error
- [ ] Tunnel names include interpolated values
- [ ] DNS uses interpolated domains
- [ ] `--list` shows correct domains
- [ ] `--delete` works with interpolation

## Common Issues

### USER not set
```bash
echo $USER  # Check
export USER=$(whoami)  # Fix
```

### Interpolation not happening
- Check config reader calls `interpolateEnvVars()`
- Verify interpolation before validation
- Check returned config has interpolated value

### Wrong priority
- $TUNA_USER should override $USER
- Check replacement order

### Validation fails
- Check validation uses interpolated value
- Look for invalid chars in username

## Success Criteria

All tests pass when:
- Variables interpolate correctly
- Priority respected ($TUNA_USER > $USER > 'unknown')
- Multiple team members can use same config
- Invalid results caught
- Tunnel/DNS use interpolated values

## Reference

- `docs/05-team-collaboration.md` - Full feature docs
- `docs/01-architecture.md` - Config manager implementation
- `docs/03-implementation.md` - Code examples

Load me to test the environment variable interpolation feature thoroughly!
