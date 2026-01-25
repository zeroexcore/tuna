---
name: add-feature
description: Add new features to Tuna following project conventions and documentation standards
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: feature-development
---

## What I do

Guide you through adding new features to Tuna beyond the initial implementation plan, ensuring consistency with project patterns, proper documentation, and thorough testing.

## When to use me

Use this skill when:
- Adding a new CLI command (e.g., `tuna --status`)
- Adding new functionality to existing commands
- Extending environment variable support
- Adding new configuration options
- Implementing API enhancements
- Adding validation or error handling improvements

## Process

### 1. Planning Phase

#### Document First

Before writing code:

1. **Describe the feature**
   - Problem statement
   - Proposed solution
   - User-facing changes
   - API/architectural changes

2. **Consider impact**
   - Breaking changes?
   - Migration needed?
   - Backward compatibility?
   - Documentation updates?

3. **Example: Add `--status` command**
   ```markdown
   ## Feature: Status Command
   
   ### Problem
   Users need quick tunnel status without full list output.
   
   ### Solution
   Add `tuna --status` showing current project's tunnel.
   
   ### Changes
   - New command: `tuna --status`
   - Output: name, status, URL, uptime
   - No API call if tunnel doesn't exist
   
   ### Implementation
   - Add `src/commands/status.ts`
   - Update `src/index.ts` flag handler
   - Update `docs/02-commands.md`
   ```

### 2. Implementation Phase

#### Follow Patterns

1. **Code organization**
   - New command → `src/commands/{name}.ts`
   - New library → `src/lib/{name}.ts`
   - New type → `src/types/{name}.ts`

2. **Error handling**
   ```typescript
   // Follow existing pattern
   if (!config) {
     throw new Error(
       'No tuna config found.\n' +
       'Add to package.json: { "tuna": { "forward": "...", "port": ... } }'
     );
   }
   ```

3. **User output**
   ```typescript
   import chalk from 'chalk';
   import ora from 'ora';
   
   const spinner = ora('Checking status...').start();
   // ... do work
   spinner.succeed('Tunnel is healthy');
   console.log(chalk.blue(`🌐 ${config.forward}`));
   ```

4. **TypeScript types**
   ```typescript
   // Define types first
   interface TunnelStatus {
     name: string;
     status: 'healthy' | 'down' | 'degraded';
     url: string;
     uptime: number;
   }
   
   async function getStatus(): Promise<TunnelStatus> {
     // implementation
   }
   ```

### 3. Documentation Phase

#### Update All Relevant Docs

**For new command:**

1. **docs/02-commands.md**
   ```markdown
   ## Command: `tuna --status`
   
   **Purpose:** Show current project's tunnel status.
   
   ### Behavior
   1. Read package.json
   2. Check if tunnel exists
   3. Query API
   4. Display status
   
   ### Output
   ...
   ```

2. **docs/00-overview.md**
   - Add to command list if user-facing

3. **PLAN.md**
   - Update quick reference

4. **.opencode/AGENTS.md**
   - Add to available commands

**For new library:**

1. **docs/01-architecture.md**
   ```markdown
   ### X. New Component (`src/lib/new.ts`)
   
   Description of functionality.
   
   **Key Functions:**
   - `function1()` - Description
   ```

2. **docs/03-implementation.md**
   - Add implementation notes

### 4. Testing Phase

#### Create Test Checklist

```markdown
## Testing: Status Command

- [ ] Run in project with tunnel
- [ ] Run in project without tunnel
- [ ] Run with tunnel down
- [ ] Run with internet disconnected
- [ ] Run with invalid credentials
- [ ] Output matches spec
- [ ] Colors display correctly
- [ ] Error messages helpful
```

#### Test Scenarios

```bash
# Happy path
tuna --status
# Expected: Shows healthy tunnel

# No tunnel
cd fresh-project
tuna --status
# Expected: "No tunnel found"

# API error
# (disconnect internet)
tuna --status
# Expected: "Could not fetch status. Check connection."
```

### 5. Integration Phase

#### Update Entry Point

**src/index.ts:**
```typescript
async function main() {
  const args = process.argv.slice(2);
  
  if (args[0]?.startsWith('--')) {
    switch (args[0]) {
      case '--status':  // NEW
        return statusCommand();
      // ... existing cases
    }
  }
  
  return runCommand(args);
}
```

#### Export New Functions

**src/types/index.ts:**
```typescript
export * from './status';  // NEW
```

### 6. Documentation Review

#### Self-Review Checklist

- [ ] All docs updated
- [ ] Examples work as written
- [ ] Error messages documented
- [ ] Edge cases covered
- [ ] Code matches documented API
- [ ] Types are correct
- [ ] CHANGELOG.md updated

#### Update CHANGELOG

```markdown
## [Unreleased]

### Added
- `tuna --status` command to show tunnel status

### Changed
- None

### Fixed
- None
```

## Example: Add Port Validation

### Feature
Validate port availability before creating tunnel

### Implementation

```typescript
// src/lib/config.ts
import net from 'net';

export async function validatePortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}
```

### Documentation

**docs/01-architecture.md:**
- Add to Config Manager section

**docs/02-commands.md:**
- Add "Port in use" error case

### Testing

```bash
# Start server on port 3000
python -m http.server 3000 &

# Try to create tunnel
tuna vite dev --port 3000
# Expected: Error about port in use
```

### CHANGELOG

```markdown
### Added
- Port availability check before tunnel creation
```

## Example: Add $BRANCH Variable

### Feature
Support `$BRANCH` in forward config

### Implementation

```typescript
// src/lib/config.ts
export function interpolateEnvVars(value: string): string {
  return value
    .replace(/\$TUNA_USER/g, process.env.TUNA_USER || process.env.USER || 'unknown')
    .replace(/\$USER/g, process.env.USER || 'unknown')
    .replace(/\$BRANCH/g, process.env.BRANCH || 'main')  // NEW
    .replace(/\$HOME/g, process.env.HOME || '~');
}
```

### Documentation

**docs/05-team-collaboration.md:**
- Add to supported variables
- Add example: `"$USER-$BRANCH.example.com"`

**docs/01-architecture.md:**
- Update interpolation function spec

### Testing

```bash
export BRANCH=feature-x
# Config: "$USER-$BRANCH-api.example.com"
# Expected: alice-feature-x-api.example.com
```

## Anti-Patterns

### Don't: Skip Documentation
❌ Write code first, update docs later
✅ Plan with docs, implement, verify docs match

### Don't: Break Patterns
❌ Use different error handling style
✅ Follow existing patterns consistently

### Don't: Add Without Use Case
❌ "This might be useful someday"
✅ Solve specific user problem

### Don't: Overcomplicate
❌ Add 500 lines for minor feature
✅ Keep simple, add complexity when needed

## Quality Checklist

### Code Quality
- [ ] No TypeScript errors
- [ ] Follows existing patterns
- [ ] Proper error handling
- [ ] Consistent style
- [ ] No console.log (use chalk)
- [ ] No any types

### Documentation Quality
- [ ] Clear and concise
- [ ] Examples accurate
- [ ] Matches implementation
- [ ] Properly formatted
- [ ] Cross-referenced

### User Experience
- [ ] Error messages helpful
- [ ] Success messages clear
- [ ] Progress indicators used
- [ ] Output well-formatted
- [ ] Consistent with other commands

## Reference

- `.opencode/AGENTS.md` - Project rules
- `docs/01-architecture.md` - Architecture
- `docs/03-implementation.md` - Examples
- Existing code - Follow patterns

## Summary

When adding features:
1. **Plan** with documentation
2. **Implement** following patterns
3. **Test** thoroughly
4. **Document** completely
5. **Review** before committing
6. **Update** CHANGELOG

Quality over speed!

Load me when adding new features to ensure consistency and quality!
