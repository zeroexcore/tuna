# ZeroExCore SDLC: How It All Fits Together

This document explains the philosophy behind our development practices and how each piece connects to maximize productivity, reduce friction, and maintain quality.

---

## The Core Principle

**Minimize context switching. Maximize flow state.**

Every tool, convention, and workflow is chosen to keep developers in their editor and terminal. The browser is for reviewing output, not for managing process.

---

## The Stack at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLANNING                                  │
│  Linear (issues, roadmap, sprints) ←→ MCP AI Integration        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT                               │
│  pnpm + Turborepo + TypeScript + tsx (no build step)            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        QUALITY                                   │
│  ESLint + Prettier + Vitest + TypeScript strict mode            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        COLLABORATION                             │
│  Git + GitHub CLI + Conventional Commits + PR Templates         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        AUTOMATION                                │
│  GitHub Actions (CI on PR, Release on tag)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT                                │
│  npm (CLI packages) + Cloudflare Workers (web/docs)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Planning with Linear

### Why Linear?

Linear is designed for speed. Keyboard-driven, instant search, and clean UI. But more importantly, it integrates with our AI workflow via MCP.

### The MCP Connection

With Linear MCP configured, AI assistants can:

```
Developer: "Create an issue for adding rate limiting to the API"
AI: Creates TUN-47 with description, labels, and assigns to current sprint
```

This means planning happens in conversation, not in a separate app.

### How Issues Flow

```
Backlog ──→ Todo ──→ In Progress ──→ In Review ──→ Done
   │          │           │              │           │
   │          │           │              │           │
 Triaged   Scheduled   Dev starts    PR opened   Merged
```

**Key insight:** Linear auto-updates status when:
- You create a branch from an issue → "In Progress"
- You open a PR with the issue ID → "In Review"  
- You merge the PR → "Done"

Zero manual status updates.

---

## Phase 2: Development Environment

### Why pnpm?

```bash
# npm/yarn: Each project has its own copy of dependencies
node_modules/
├── react/           # 2.5MB
├── typescript/      # 65MB
└── ...              # Duplicated across every project

# pnpm: Single store, hard links
~/.pnpm-store/
├── react@19.0.0/    # One copy
└── typescript@5.9/  # One copy
```

**Result:** Faster installs, less disk space, stricter dependency resolution (catches phantom dependencies).

### Why Turborepo?

Monorepos have a problem: running `pnpm test` in a 5-package repo means running 5 test suites. Turborepo solves this:

```bash
# Without Turborepo: Sequential, no caching
pnpm test  # 45 seconds every time

# With Turborepo: Parallel, cached
turbo run test  # 45 seconds first time, <1 second if nothing changed
```

**How it works:**
1. Hashes inputs (source files, dependencies)
2. If hash matches cache → skip
3. If no match → run and cache result

### Why tsx (No Build Step)?

Traditional TypeScript:
```bash
# Write code
vim src/index.ts

# Compile
tsc

# Run
node dist/index.js

# Change code, repeat...
```

With tsx:
```bash
# Write and run directly
tsx src/index.ts

# Watch mode
tsx watch src/index.ts
```

**For CLIs, we ship TypeScript directly:**
```json
{
  "bin": {
    "tuna": "./src/index.ts"
  }
}
```

Users need Node.js anyway. tsx is a dependency. No build artifact to manage.

### Direct .ts Imports

```typescript
// Old way (requires build step, path mapping)
import { config } from '@myorg/shared';

// Our way (direct, explicit)
import { config } from './lib/config.ts';
```

Benefits:
- No build step for development
- IDE "Go to Definition" works instantly
- No tsconfig path mapping complexity
- Explicit dependencies

---

## Phase 3: Quality Gates

### The Quality Stack

```
┌─────────────────┐
│    Prettier     │  ← Formatting (tabs, quotes, semicolons)
├─────────────────┤
│     ESLint      │  ← Code quality (unused vars, bad patterns)
├─────────────────┤
│   TypeScript    │  ← Type safety (strict mode)
├─────────────────┤
│     Vitest      │  ← Behavior verification
└─────────────────┘
```

### Why This Order Matters

Each layer catches different problems:

1. **Prettier** - Eliminates style debates. No PR comments about formatting ever.
2. **ESLint** - Catches bugs Prettier can't (unused imports, `any` types)
3. **TypeScript strict** - Catches bugs ESLint can't (null safety, type mismatches)
4. **Vitest** - Catches bugs types can't (logic errors, edge cases)

### The Feedback Loop

```bash
# Instant feedback while coding
pnpm typecheck  # <2 seconds with incremental compilation

# Before committing
pnpm lint && pnpm format:check && pnpm test

# CI runs same checks
# If it passes locally, it passes in CI
```

---

## Phase 4: Collaboration via Git + GitHub CLI

### Why Conventional Commits?

```bash
# Bad: What changed? Why?
git commit -m "updates"
git commit -m "fix bug"
git commit -m "wip"

# Good: Scannable, automatable
git commit -m "feat(cli): add --init command"
git commit -m "fix(api): handle rate limit errors"
git commit -m "docs: update installation guide"
```

**Automation benefits:**
- Auto-generate CHANGELOG
- Semantic version bumping
- Clear git history

### Why GitHub CLI?

The browser is slow:

```bash
# Browser workflow (60+ seconds)
1. Open github.com
2. Navigate to repo
3. Click "Pull requests"
4. Click "New pull request"
5. Select branches
6. Fill form
7. Click "Create"
8. Wait for page load
9. Check CI status
10. Refresh... refresh... refresh...

# CLI workflow (10 seconds)
gh pr create --title "feat: add feature" --body "Closes TUN-42"
gh pr checks --watch
```

### The Complete PR Flow

```bash
# 1. Start from Linear issue (copy branch name)
git checkout -b john/TUN-42-add-init-command

# 2. Develop with instant feedback
pnpm dev        # Hot reload
pnpm test       # Watch mode

# 3. Commit with convention
git add -A
git commit -m "feat(cli): add --init command"

# 4. Push and create PR (one command)
git push -u origin HEAD
gh pr create --title "feat(cli): add --init command [TUN-42]" --body "Closes TUN-42"

# 5. Watch CI (stay in terminal)
gh pr checks --watch

# 6. Merge when ready
gh pr merge --squash

# 7. Clean up
git checkout main && git pull && git branch -d john/TUN-42-add-init-command
```

**Total context switches to browser: 0**

---

## Phase 5: CI/CD Automation

### The Two-Workflow System

```
┌─────────────────────────────────────────┐
│           CI Workflow                    │
│  Trigger: PR to main                    │
│  Jobs: lint → typecheck → test → build  │
│  Purpose: Validate changes              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Release Workflow                 │
│  Trigger: Push tag v*                   │
│  Jobs: test → publish npm → deploy      │
│  Purpose: Ship to production            │
└─────────────────────────────────────────┘
```

### Why Tag-Based Releases?

```bash
# Bad: Deploy on every main merge
# Problem: Not every merge is release-worthy

# Good: Explicit release decision
git tag v1.2.0
git push origin v1.2.0
# → Triggers release workflow
```

**Benefits:**
- Releases are intentional
- Version is explicit in tag
- Easy to see release history (`git tag`)
- Easy to rollback (`git checkout v1.1.0`)

### Caching Strategy

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'  # Caches ~/.pnpm-store
```

First run: ~60 seconds (download all dependencies)
Subsequent runs: ~5 seconds (restore from cache)

**Turborepo adds another layer:**
```yaml
- uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ github.sha }}
```

If source hasn't changed, skip lint/typecheck/test entirely.

---

## Phase 6: Deployment

### The Two Targets

| Package | Deployed To | Trigger |
|---------|-------------|---------|
| CLI | npm registry | `v*` tag |
| Docs | Cloudflare Workers | `v*` tag |
| Web | Cloudflare Workers | `v*` tag |

### Why Cloudflare Workers?

```
Traditional hosting:
Request → Load balancer → Server → Response
Latency: 100-500ms depending on user location

Cloudflare Workers:
Request → Nearest edge (300+ locations) → Response
Latency: 10-50ms everywhere
```

For static sites (docs, landing pages), Workers serve from edge with zero cold start.

### npm Provenance

```yaml
- run: pnpm publish --provenance
```

This creates a cryptographic link between:
- The npm package
- The GitHub repo
- The specific commit
- The workflow run

Users can verify the package wasn't tampered with.

---

## How It All Connects

### A Feature from Idea to Production

```
1. IDEA
   └→ Create Linear issue (via MCP or Linear app)
      └→ Issue: TUN-42 "Add --init command"

2. DEVELOPMENT
   └→ Create branch from Linear
      └→ git checkout -b john/TUN-42-add-init-command
   └→ Write code with tsx (no build)
   └→ Write tests with Vitest
   └→ Format with Prettier
   └→ Lint with ESLint
   └→ Type check with TypeScript

3. COLLABORATION
   └→ Commit with conventional format
      └→ git commit -m "feat(cli): add --init command"
   └→ Push and create PR with gh
      └→ gh pr create --title "feat(cli): add --init command [TUN-42]"
   └→ Linear auto-updates issue status to "In Review"

4. VALIDATION
   └→ CI runs automatically
   └→ Watch with: gh pr checks --watch
   └→ Get review from teammate

5. MERGE
   └→ gh pr merge --squash
   └→ Linear auto-updates issue status to "Done"

6. RELEASE (when ready)
   └→ git checkout production
   └→ git merge main
   └→ git tag v1.1.0
   └→ git push origin v1.1.0
   └→ Release workflow triggers automatically
      └→ Publishes to npm
      └→ Deploys docs to Cloudflare
      └→ Deploys web to Cloudflare
```

### Time Breakdown

| Phase | Traditional | Our Approach |
|-------|-------------|--------------|
| Create issue | 2 min (browser) | 10 sec (MCP/CLI) |
| Setup branch | 1 min | 10 sec (copy from Linear) |
| Dev feedback loop | 30 sec (build) | Instant (tsx) |
| Create PR | 2 min (browser) | 15 sec (gh cli) |
| Check CI | 5 min (refresh browser) | 30 sec (gh pr checks --watch) |
| Merge | 1 min (browser) | 5 sec (gh pr merge) |
| Deploy | 10 min (manual) | Automatic |

**Total saved per feature: ~20 minutes**

At 5 features per week, that's **~80 hours per year** per developer.

---

## The Philosophy

### 1. Terminal Over Browser

Every browser interaction is a context switch. Context switches kill flow state. The terminal keeps you in the code.

### 2. Automation Over Process

If a human has to remember to do it, automate it:
- Formatting → Prettier
- Linting → ESLint  
- Testing → CI
- Deploying → GitHub Actions
- Status updates → Linear GitHub integration

### 3. Convention Over Configuration

Decisions are exhausting. Standards eliminate decisions:
- One package manager (pnpm)
- One test framework (Vitest)
- One commit format (Conventional)
- One branch strategy (main/production)

### 4. Speed Over Ceremony

- No build step for development (tsx)
- No manual deploys (tag-based)
- No status update meetings (Linear auto-sync)
- No formatting debates (Prettier decides)

---

## Quick Wins When Adopting

If you're new to this workflow, start with these high-impact changes:

### Week 1: CLI Tools
```bash
# Install
brew install gh pnpm

# Authenticate  
gh auth login
```

### Week 2: Conventional Commits
Start using `feat:`, `fix:`, `docs:` prefixes. Your git history becomes scannable.

### Week 3: GitHub CLI for PRs
Replace browser PR creation with:
```bash
gh pr create
gh pr checks --watch
gh pr merge --squash
```

### Week 4: Linear Integration
Link Linear to GitHub. Watch issue status update automatically.

---

## Conclusion

This SDLC isn't about following rules. It's about removing friction.

Every tool is chosen because it:
1. Keeps you in the terminal
2. Provides instant feedback
3. Automates the boring stuff
4. Catches mistakes early

The result: More time coding, less time managing process.

```
Write code → Get feedback → Ship
     ↑                        │
     └────────────────────────┘
```

That's it. That's the whole system.
