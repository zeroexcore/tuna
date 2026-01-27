# Software Development Lifecycle (SDLC)

Standard practices for all projects in the zeroexcore organization.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack Standards](#tech-stack-standards)
3. [Project Structure](#project-structure)
4. [Tooling Configuration](#tooling-configuration)
5. [Linear Workflow](#linear-workflow)
6. [Git Workflow](#git-workflow)
7. [GitHub CLI](#github-cli)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Development Workflow](#development-workflow)
10. [Documentation Standards](#documentation-standards)
11. [Testing Standards](#testing-standards)
12. [npm Publishing](#npm-publishing)
13. [Cloudflare Deployment](#cloudflare-deployment)
14. [Quick Reference](#quick-reference)

---

## Overview

This document defines the standard development practices for zeroexcore projects. Reference it when:

- Starting a new project
- Onboarding to an existing project
- Submitting or reviewing pull requests
- Setting up CI/CD pipelines

All projects should follow these conventions unless there's a documented reason to deviate.

---

## Tech Stack Standards

### Package Manager: pnpm

**Version:** 9.x or latest

pnpm is required for all projects. It provides:
- Fast, efficient dependency installation
- Strict dependency resolution
- Built-in workspace support for monorepos
- Excellent caching for CI/CD

```bash
# Install pnpm globally
npm install -g pnpm

# Or use corepack (recommended)
corepack enable
corepack prepare pnpm@latest --activate
```

Specify pnpm version in `package.json`:

```json
{
  "packageManager": "pnpm@9.15.0"
}
```

### Language: TypeScript

**Version:** 5.x or latest

All projects use TypeScript with strict mode enabled. Key settings:

- `strict: true`
- `noUncheckedIndexedAccess: true` (recommended)
- `exactOptionalPropertyTypes: true` (recommended)

### Runtime: Node.js

**Version:** 22.x LTS or latest LTS

Specify in `package.json`:

```json
{
  "engines": {
    "node": ">=22.0.0"
  }
}
```

### Execution: tsx (No Build Step)

For CLIs and development, use `tsx` to run TypeScript directly:

```json
{
  "bin": {
    "my-cli": "./src/index.ts"
  },
  "scripts": {
    "dev": "tsx watch src/index.ts"
  }
}
```

Benefits:
- No build step required
- Direct `.ts` imports in monorepo packages
- Faster development iteration
- Simpler configuration

### Web Bundler: Vite

For web applications and landing pages, use Vite with:
- React 19+
- Tailwind CSS v4
- TypeScript

---

## Project Structure

### Monorepo with Turborepo

All multi-package projects use pnpm workspaces with Turborepo for task orchestration.

### Template: CLI Only

```
project/
├── packages/
│   └── cli/
│       ├── src/
│       │   ├── index.ts          # Entry point (bin)
│       │   ├── commands/         # Command handlers
│       │   ├── lib/              # Business logic
│       │   └── types/            # TypeScript types
│       ├── tests/
│       │   └── unit/
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── .gitignore
├── .prettierrc
├── .prettierignore
├── eslint.config.js
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

### Template: CLI + Web + Docs

```
project/
├── packages/
│   ├── cli/                      # npm package
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── docs/                     # Vocs documentation
│   │   ├── docs/
│   │   │   └── pages/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vocs.config.ts
│   │   └── wrangler.toml
│   └── web/                      # Landing page
│       ├── src/
│       ├── public/
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── wrangler.toml
├── docs/                         # Internal dev docs (not published)
│   ├── 00-overview.md
│   └── 01-architecture.md
├── .github/workflows/
├── eslint.config.js
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── CHANGELOG.md
├── DEPLOYMENT.md
└── README.md
```

### Template: Library + Docs

```
project/
├── packages/
│   ├── core/                     # Main library
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── docs/                     # Vocs documentation
│       └── ...
├── .github/workflows/
└── ...
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Source files | kebab-case | `user-service.ts` |
| Test files | `*.test.ts` | `user-service.test.ts` |
| React components | PascalCase | `UserProfile.tsx` |
| Types | kebab-case | `api-types.ts` |
| Constants | kebab-case | `constants.ts` |

### Direct TypeScript Imports

In monorepos, import TypeScript files directly with `.ts` extension:

```typescript
// packages/cli/src/index.ts
import { someUtil } from './lib/utils.ts';
import { Config } from './types/config.ts';
```

This works because:
- tsx handles TypeScript natively
- No compilation step needed
- Simpler dependency management

---

## Tooling Configuration

### ESLint (Flat Config)

Use the flat config format (`eslint.config.js`):

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  }
);
```

### Prettier

Use defaults with minimal configuration (`.prettierrc`):

```json
{
  "singleQuote": true,
  "trailingComma": "es5"
}
```

`.prettierignore`:

```
dist
node_modules
.turbo
pnpm-lock.yaml
```

### TypeScript Base Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Turborepo Config

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "docs/dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

### pnpm Workspace

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
```

---

## Linear Workflow

All task and issue tracking happens in [Linear](https://linear.app). This integrates with GitHub and provides a streamlined workflow for planning, tracking, and shipping work.

### MCP Integration

Linear is accessible via MCP (Model Context Protocol) for AI-assisted development. The Linear MCP server allows:

- Creating and updating issues
- Searching issues and projects
- Managing issue status and assignments
- Linking PRs to issues

### Issue Workflow

```
Backlog → Todo → In Progress → In Review → Done
```

| Status | Description |
|--------|-------------|
| **Backlog** | Triaged but not scheduled |
| **Todo** | Scheduled for current cycle |
| **In Progress** | Actively being worked on |
| **In Review** | PR open, awaiting review |
| **Done** | Merged and deployed |

### Issue Types

| Type | Prefix | Example |
|------|--------|---------|
| Feature | `feat` | Add dark mode support |
| Bug | `bug` | Fix login redirect loop |
| Chore | `chore` | Upgrade dependencies |
| Docs | `docs` | Update API reference |

### Branch Naming from Linear

Linear auto-generates branch names from issues:

```
<username>/<issue-id>-<issue-title-slug>

# Example:
john/TUN-42-add-init-command
```

Create branch directly from Linear or use the suggested name:

```bash
# Linear provides a "Copy branch name" button
git checkout -b john/TUN-42-add-init-command
```

### Linking PRs to Issues

Include the Linear issue ID in your PR title or description:

```bash
# In PR title
feat: add --init command [TUN-42]

# Or in PR description
Closes TUN-42
```

Linear automatically:
- Links the PR to the issue
- Updates issue status when PR is merged
- Shows PR status on the issue

### Creating Issues via MCP

When using AI assistants with Linear MCP configured:

```
"Create a Linear issue for adding rate limiting to the API"
```

The assistant can:
- Create the issue with appropriate labels
- Assign to team members
- Set priority and cycle
- Add to project

### Linear Project Structure

| Project | Description |
|---------|-------------|
| **Roadmap** | High-level features and milestones |
| **Bugs** | Bug reports and fixes |
| **Tech Debt** | Refactoring and maintenance |
| **Documentation** | Docs improvements |

---

## Git Workflow

### Branch Strategy

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Active development | Staging (if applicable) |
| `production` | Stable releases | Production |

**Flow:**
1. Create feature branch from `main`
2. Open PR to `main`
3. CI must pass, get review
4. Merge to `main`
5. When ready for release: merge `main` → `production`
6. Tag on `production` triggers npm publish + deployment

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `ci` | CI/CD changes |

**Examples:**

```bash
feat(cli): add --init command for project setup
fix(api): handle rate limiting errors gracefully
docs: update installation instructions
chore: upgrade dependencies
```

### Pull Request Requirements

Before merging:
- [ ] CI passes (lint, typecheck, test, build)
- [ ] At least one approval (for team projects)
- [ ] No merge conflicts
- [ ] Commit messages follow convention

### Release Process

```bash
# 1. Ensure main is up to date
git checkout main
git pull

# 2. Merge to production
git checkout production
git pull
git merge main
git push

# 3. Create version tag
git tag v1.0.0
git push origin v1.0.0

# 4. Tag triggers release workflow
```

---

## GitHub CLI

Use the [GitHub CLI](https://cli.github.com/) (`gh`) for all GitHub operations. It's faster than the web UI and scriptable.

### Installation & Authentication

```bash
# Install (macOS)
brew install gh

# Authenticate
gh auth login
```

### Creating Pull Requests

Always use `gh pr create` instead of the web UI:

```bash
# Interactive PR creation
gh pr create

# With title and body
gh pr create --title "feat: add --init command" --body "Closes TUN-42"

# With reviewers
gh pr create --title "feat: add --init command" --reviewer teammate

# Draft PR
gh pr create --draft --title "WIP: new feature"

# From a specific base branch
gh pr create --base main --head feature-branch
```

**PR Template:**

```bash
gh pr create --title "feat(cli): add --init command [TUN-42]" --body "$(cat <<'EOF'
## Summary
- Added interactive `--init` command for project setup
- Generates `package.json` tuna config

## Changes
- New `commands/init.ts` file
- Updated help text

## Testing
- [x] Unit tests added
- [x] Manual testing completed

Closes TUN-42
EOF
)"
```

### Checking CI Status

```bash
# View PR status and checks
gh pr status

# View checks for current branch
gh pr checks

# Watch checks until complete
gh pr checks --watch

# View specific PR
gh pr view 42
gh pr view 42 --web  # Open in browser
```

### Managing Pull Requests

```bash
# List open PRs
gh pr list

# List your PRs
gh pr list --author @me

# Checkout a PR locally
gh pr checkout 42

# Merge PR (after CI passes)
gh pr merge 42
gh pr merge 42 --squash  # Squash and merge
gh pr merge 42 --merge   # Merge commit
gh pr merge 42 --rebase  # Rebase and merge

# Close PR without merging
gh pr close 42

# Re-run failed checks
gh pr checks --watch  # First check which failed
gh run rerun <run-id>
```

### Viewing Workflow Runs

```bash
# List recent workflow runs
gh run list

# View specific run
gh run view <run-id>

# Watch a run in progress
gh run watch <run-id>

# View run logs
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id>
gh run rerun <run-id> --failed  # Only re-run failed jobs
```

### Working with Issues

```bash
# List issues
gh issue list

# Create issue
gh issue create --title "Bug: login fails" --body "Steps to reproduce..."

# View issue
gh issue view 42

# Close issue
gh issue close 42
```

### Repository Operations

```bash
# Clone repo
gh repo clone zeroexcore/tuna

# Create new repo
gh repo create zeroexcore/new-project --public

# View repo in browser
gh repo view --web

# Fork a repo
gh repo fork owner/repo
```

### Useful Aliases

Add to `~/.config/gh/config.yml` or run:

```bash
# Quick PR creation
gh alias set prc 'pr create --fill'

# Watch CI
gh alias set ci 'pr checks --watch'

# Open PR in browser
gh alias set prw 'pr view --web'
```

### Typical Development Flow with gh

```bash
# 1. Create branch from Linear issue
git checkout -b john/TUN-42-add-init-command

# 2. Make changes and commit
git add -A
git commit -m "feat(cli): add --init command"

# 3. Push and create PR
git push -u origin HEAD
gh pr create --title "feat(cli): add --init command [TUN-42]" --body "Closes TUN-42"

# 4. Watch CI
gh pr checks --watch

# 5. After approval and CI passes, merge
gh pr merge --squash

# 6. Clean up
git checkout main
git pull
git branch -d john/TUN-42-add-init-command
```

---

## CI/CD Pipeline

### CI Workflow (`.github/workflows/ci.yml`)

Runs on PRs to `main`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  check:
    name: Lint, Type Check, Test, Build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build
```

### Release Workflow (`.github/workflows/release.yml`)

Runs on version tags:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    name: Publish to npm
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Publish to npm
        run: pnpm --filter @zeroexcore/<package> publish --provenance --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  deploy-docs:
    name: Deploy Docs
    runs-on: ubuntu-latest
    needs: publish

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build docs
        run: pnpm --filter @zeroexcore/<package>-docs build

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/docs

  deploy-web:
    name: Deploy Website
    runs-on: ubuntu-latest
    needs: publish

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build website
        run: pnpm --filter @zeroexcore/<package>-web build

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/web
```

### Caching Strategy

pnpm caching is handled automatically by `actions/setup-node` with `cache: 'pnpm'`.

For Turborepo remote caching (optional):

```yaml
- name: Setup Turbo cache
  uses: actions/cache@v4
  with:
    path: .turbo
    key: turbo-${{ github.sha }}
    restore-keys: |
      turbo-
```

---

## Development Workflow

### Local Setup

```bash
# Clone and install
git clone https://github.com/zeroexcore/<project>.git
cd <project>
pnpm install

# Start development
pnpm dev
```

### Common Commands

Add these scripts to root `package.json`:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint -- --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "clean": "rm -rf node_modules packages/*/node_modules packages/*/dist .turbo"
  }
}
```

### Running Tests

```bash
# Run all tests once
pnpm test

# Watch mode (re-runs on file changes)
pnpm test:watch

# Run tests for specific package
pnpm --filter @zeroexcore/cli test

# Run specific test file
pnpm --filter @zeroexcore/cli test -- src/lib/config.test.ts

# With coverage
pnpm --filter @zeroexcore/cli test -- --coverage
```

### Formatting

```bash
# Format all files
pnpm format

# Check formatting (CI mode, no writes)
pnpm format:check

# Format specific files
pnpm exec prettier --write "packages/cli/src/**/*.ts"
```

### Linting

```bash
# Lint all packages
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Lint specific package
pnpm --filter @zeroexcore/cli lint
```

### Type Checking

```bash
# Check all packages
pnpm typecheck

# Check specific package
pnpm --filter @zeroexcore/cli typecheck

# Watch mode (in package directory)
cd packages/cli && pnpm exec tsc --noEmit --watch
```

---

## Documentation Standards

### Vocs for Documentation Sites

Use [Vocs](https://vocs.dev) for all documentation sites:

```bash
# Create docs package
mkdir -p packages/docs
cd packages/docs
pnpm add vocs react react-dom
```

`vocs.config.ts`:

```typescript
import { defineConfig } from 'vocs';

export default defineConfig({
  title: 'Project Name',
  description: 'Project description',
  logoUrl: {
    light: '/logo.svg',
    dark: '/logo.svg',
  },
  iconUrl: '/favicon.svg',
  topNav: [
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'API', link: '/api/config' },
    { text: 'GitHub', link: 'https://github.com/zeroexcore/<project>' },
  ],
  sidebar: [
    {
      text: 'Introduction',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
      ],
    },
  ],
  socials: [
    {
      icon: 'github',
      link: 'https://github.com/zeroexcore/<project>',
    },
  ],
});
```

### README Format

Every project must have a README with these sections:

```markdown
# Project Name

Brief one-line description.

[![npm version](https://img.shields.io/npm/v/@zeroexcore/<package>.svg)](https://www.npmjs.com/package/@zeroexcore/<package>)
[![CI](https://github.com/zeroexcore/<project>/actions/workflows/ci.yml/badge.svg)](https://github.com/zeroexcore/<project>/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\```bash
npm install @zeroexcore/<package>
\```

## Quick Start

\```bash
# Example usage
\```

## Documentation

Full documentation at [docs.<project>.oxc.sh](https://docs.<project>.oxc.sh)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

## License

MIT
```

### CHANGELOG Format

Follow [Keep a Changelog](https://keepachangelog.com/):

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- New feature X

### Changed
- Updated Y behavior

### Fixed
- Bug in Z

## [1.0.0] - 2025-01-27

### Added
- Initial release
```

### Code Comments

- Use JSDoc for public APIs:

```typescript
/**
 * Creates a new tunnel connection to Cloudflare.
 * 
 * @param config - Tunnel configuration
 * @param config.domain - The domain to expose
 * @param config.port - Local port to forward
 * @returns The tunnel URL
 * @throws {TunnelError} If connection fails
 * 
 * @example
 * ```ts
 * const url = await createTunnel({ domain: 'app.example.com', port: 3000 });
 * ```
 */
export async function createTunnel(config: TunnelConfig): Promise<string> {
  // ...
}
```

- Inline comments for complex logic only
- Avoid obvious comments like `// increment counter`

---

## Testing Standards

### Vitest Configuration

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', 'dist', 'tests'],
    },
  },
});
```

### Test File Organization

```
packages/cli/
├── src/
│   └── lib/
│       └── config.ts
└── tests/
    └── unit/
        └── config.test.ts
```

Or colocate tests:

```
packages/cli/
└── src/
    └── lib/
        ├── config.ts
        └── config.test.ts
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseConfig } from '../src/lib/config.ts';

describe('parseConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses valid config', () => {
    const result = parseConfig({ forward: 'app.example.com', port: 3000 });
    expect(result.forward).toBe('app.example.com');
    expect(result.port).toBe(3000);
  });

  it('throws on missing required fields', () => {
    expect(() => parseConfig({})).toThrow('forward is required');
  });

  describe('environment variable interpolation', () => {
    it('replaces $USER with username', () => {
      const result = parseConfig({ forward: '$USER-app.example.com', port: 3000 });
      expect(result.forward).toMatch(/^\w+-app\.example\.com$/);
    });
  });
});
```

### When to Write Tests

**Always test:**
- Public API functions
- Bug fixes (write test that reproduces bug first)
- Complex business logic
- Edge cases and error handling

**Optional:**
- Internal utilities (test via public API)
- Simple pass-through functions
- UI components (consider E2E instead)

### Coverage Visibility

No minimum coverage requirement, but coverage reports should be generated and visible:

```bash
# Generate coverage report
pnpm test -- --coverage

# View HTML report
open packages/cli/coverage/index.html
```

---

## npm Publishing

### Package.json Requirements

```json
{
  "name": "@zeroexcore/<package>",
  "version": "0.1.0",
  "description": "Brief description",
  "type": "module",
  "bin": {
    "<cli-name>": "./src/index.ts"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/zeroexcore/<project>.git",
    "directory": "packages/cli"
  },
  "bugs": {
    "url": "https://github.com/zeroexcore/<project>/issues"
  },
  "homepage": "https://github.com/zeroexcore/<project>#readme",
  "author": "zeroexcore",
  "license": "MIT",
  "engines": {
    "node": ">=22.0.0"
  },
  "keywords": ["relevant", "keywords"],
  "publishConfig": {
    "access": "public"
  }
}
```

### Scoped Packages

All packages use the `@zeroexcore` scope:

```
@zeroexcore/tuna
@zeroexcore/some-lib
```

### Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Provenance

All packages published with `--provenance` flag for supply chain security. Requires:
- Public GitHub repository
- `id-token: write` permission in workflow

---

## Cloudflare Deployment

### wrangler.toml

```toml
name = "<project>-web"
compatibility_date = "2024-01-01"
account_id = "<cloudflare-account-id>"

assets = { directory = "dist" }

[[routes]]
pattern = "<project>.oxc.sh"
custom_domain = true
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | API token with Workers edit permission |

### Domain Convention

| Package | Domain |
|---------|--------|
| Landing page | `<project>.oxc.sh` |
| Documentation | `docs.<project>.oxc.sh` |

---

## Quick Reference

### Common pnpm Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start development servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm typecheck` | Type check all packages |
| `pnpm lint` | Lint all packages |
| `pnpm lint:fix` | Lint and auto-fix |
| `pnpm format` | Format all files |
| `pnpm format:check` | Check formatting |
| `pnpm clean` | Remove node_modules and dist |

### Common gh Commands

| Command | Description |
|---------|-------------|
| `gh pr create` | Create pull request |
| `gh pr list` | List open PRs |
| `gh pr checks` | View CI status |
| `gh pr checks --watch` | Watch CI until complete |
| `gh pr merge --squash` | Squash and merge PR |
| `gh pr view --web` | Open PR in browser |
| `gh run list` | List workflow runs |
| `gh run view <id>` | View workflow run details |
| `gh run rerun <id>` | Re-run workflow |
| `gh run rerun <id> --failed` | Re-run only failed jobs |
| `gh issue list` | List issues |
| `gh issue create` | Create issue |

### New Project Checklist

- [ ] Create Linear project
- [ ] Create GitHub repo in zeroexcore org (`gh repo create`)
- [ ] Initialize pnpm workspace
- [ ] Add turborepo
- [ ] Configure ESLint and Prettier
- [ ] Set up TypeScript
- [ ] Create package structure
- [ ] Add CI workflow
- [ ] Add release workflow
- [ ] Add `NPM_TOKEN` secret
- [ ] Add `CLOUDFLARE_API_TOKEN` secret
- [ ] Create README
- [ ] Create CHANGELOG
- [ ] Link Linear project to GitHub repo

### PR Checklist

- [ ] Linear issue linked in PR title/description
- [ ] Follows conventional commit format
- [ ] Tests pass locally (`pnpm test`)
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Code is formatted (`pnpm format:check`)
- [ ] CI passes (`gh pr checks`)
- [ ] Documentation updated (if needed)
- [ ] CHANGELOG updated (for features/fixes)

### Release Checklist

- [ ] All tests pass on `main`
- [ ] CHANGELOG is up to date
- [ ] Version bumped in package.json
- [ ] Merge `main` → `production`
- [ ] Create version tag
- [ ] Verify release workflow succeeds
- [ ] Verify npm package published
- [ ] Verify sites deployed
