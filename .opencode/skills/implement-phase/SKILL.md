---
name: implement-phase
description: Guide for implementing the next development phase of Tuna following the implementation plan
license: MIT
compatibility: opencode
metadata:
  audience: developers
  workflow: implementation
---

## What I do

- Check current implementation status by examining existing files
- Determine which phase comes next (Phases 1-7)
- Provide detailed step-by-step guidance for that phase
- Reference relevant documentation sections
- Create necessary files and directory structure
- Ensure code matches documentation specifications

## When to use me

Use this skill when you're ready to implement the next phase of the Tuna project. I'll help you:
- Understand what needs to be done
- Follow the correct implementation order
- Create files with proper structure
- Write code that matches documentation
- Test the implementation

## How I work

### 1. Status Check

I first check which phase you're on by looking at your `src/` directory:
- No `src/` directory → Phase 1 (Project Setup)
- Has `src/types/` → Phase 2 complete
- Has `src/lib/` → Phase 3 in progress or complete
- Has `src/commands/` → Phase 6 in progress

### 2. Phase Guidance

For each phase, I provide:
- **Prerequisites:** What must be complete before starting
- **Goals:** What we're building in this phase
- **File Structure:** Directories and files to create
- **Implementation:** Step-by-step coding instructions
- **Testing:** How to verify the phase works
- **Documentation:** Where to find detailed specs

### 3. Phase Details

#### Phase 1: Project Setup
- Initialize pnpm project
- Install TypeScript and tsx
- Configure tsconfig.json for ESM and noEmit
- Set up package.json with bin pointing to src/index.ts
- Create src/ directory structure

**Key Files:**
- `package.json` - Dependencies, type: "module", bin field
- `tsconfig.json` - TypeScript configuration (noEmit, ESM)
- `pnpm-lock.yaml` - Lock file
- `src/` directories

**Key Points:**
- Use pnpm, NOT npm or yarn
- No build step - tsx runs TypeScript directly
- Add shebang `#!/usr/bin/env tsx` to src/index.ts
- ESM mode: "type": "module" in package.json

#### Phase 2: Type Definitions
- Create type interfaces from docs
- Define configuration schemas
- Define Cloudflare API types

**Key Files:**
- `src/types/config.ts`
- `src/types/cloudflare.ts`
- `src/types/index.ts`

#### Phase 3: Core Libraries
- Implement credential manager (Keychain)
- Implement config reader with env var interpolation
- Implement Cloudflare API client

**Key Files:**
- `src/lib/credentials.ts` (keytar for Keychain)
- `src/lib/config.ts` (env var interpolation!)
- `src/lib/api.ts` (Cloudflare API wrapper)

#### Phase 4: Cloudflared Management
- Detect/download cloudflared binary
- Execute cloudflared commands
- Generate tunnel credentials

**Key Files:**
- `src/lib/cloudflared.ts`

#### Phase 5: Service Management
- Install cloudflared as launchd service
- Generate YAML config files
- Manage service lifecycle

**Key Files:**
- `src/lib/service.ts`
- `src/lib/dns.ts`

#### Phase 6: Commands
- Implement all CLI commands
- Create CLI entry point
- Wire everything together

**Key Files:**
- `src/commands/login.ts`
- `src/commands/run.ts` (main wrapper)
- `src/commands/list.ts`
- `src/commands/stop.ts`
- `src/commands/delete.ts`
- `src/index.ts` (CLI entry)

#### Phase 7: Polish
- Add comprehensive error handling
- Write help text and README
- Manual testing with checklist
- Final documentation updates

### 4. Documentation References

For each phase, I'll point you to:
- `docs/03-implementation.md` - Main implementation plan
- `docs/01-architecture.md` - Component specifications
- `docs/02-commands.md` - Command behavior specs
- `docs/04-api-reference.md` - Cloudflare API details

### 5. Verification

After each phase:
- [ ] All files created
- [ ] Code compiles without errors
- [ ] Types are correct
- [ ] Manual testing passes
- [ ] CHANGELOG.md updated
- [ ] Ready for next phase

## Example Usage

**You:** "What phase should I implement next?"

**I will:**
1. Check your `src/` directory
2. Determine you're on Phase 3 (for example)
3. Read `docs/03-implementation.md` § Phase 3
4. Read `docs/01-architecture.md` for component details
5. Guide you through creating:
   - `src/lib/credentials.ts` with keytar
   - `src/lib/config.ts` with env var interpolation
   - `src/lib/api.ts` with Cloudflare client
6. Provide implementation code matching docs
7. Explain testing approach
8. Mark phase complete

## Critical Rules

1. **Follow documentation exactly** - Code must match specs in docs
2. **Complete phases in order** - Don't skip ahead
3. **Use pnpm** - NOT npm or yarn
4. **Use ESM** - import/export, NOT require
5. **No build step** - tsx runs TypeScript directly
6. **Shebang required** - Add `#!/usr/bin/env tsx` to src/index.ts
7. **Type check only** - Use `pnpm typecheck` (tsc --noEmit)
8. **Environment variable interpolation** - MUST be in config reader (Phase 3)
9. **Test incrementally** - Verify each phase before moving on
10. **Update CHANGELOG** - Document what was implemented

## Dependencies

- Phase 2 depends on Phase 1
- Phase 3 depends on Phase 2
- Phase 4 depends on Phase 3
- Phase 5 depends on Phase 4
- Phase 6 depends on Phases 3, 4, 5
- Phase 7 depends on Phase 6

Never implement a phase without completing prerequisites.

## Success Criteria

Each phase is complete when:
- All specified files exist
- `pnpm typecheck` succeeds (no TypeScript errors)
- Shebang added to src/index.ts
- Manual testing works
- Documentation is accurate
- CHANGELOG.md updated
- Uses ESM imports (not CommonJS)

Load me when you're ready to implement, and I'll guide you through the process step by step!
