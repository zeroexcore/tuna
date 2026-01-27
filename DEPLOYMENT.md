# Deployment Guide

This document covers CI/CD setup and deployment instructions for a pnpm + Turborepo monorepo with:
- CLI package published to npm
- Documentation site deployed to Cloudflare Workers
- Landing page deployed to Cloudflare Workers

## Project Structure

```
your-project/
├── packages/
│   ├── cli/           # npm package
│   ├── docs/          # Vocs documentation site
│   └── web/           # Vite + React landing page
├── .github/
│   └── workflows/
│       ├── ci.yml     # PR checks
│       └── release.yml # Publishing & deployment
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on PRs to main branch - lint, typecheck, test, build.

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  check:
    name: Lint, Type Check, Test
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

Triggered on version tags (`v*`) - publishes to npm and deploys sites.

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  publish-cli:
    name: Publish CLI to npm
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for npm provenance

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

      - name: Run tests
        run: pnpm test

      - name: Publish to npm
        run: pnpm --filter <your-cli-package> publish --provenance --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  deploy-docs:
    name: Deploy Docs
    runs-on: ubuntu-latest
    needs: publish-cli  # Remove if docs can deploy independently

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
        run: pnpm --filter <your-docs-package> build

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/docs

  deploy-web:
    name: Deploy Website
    runs-on: ubuntu-latest
    needs: publish-cli  # Remove if web can deploy independently

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
        run: pnpm --filter <your-web-package> build

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          workingDirectory: packages/web
```

---

## Cloudflare Workers Configuration

### Wrangler Config (`wrangler.toml`)

For static sites (Vite, Vocs, etc.):

```toml
name = "your-project-web"
compatibility_date = "2024-01-01"
account_id = "<your-cloudflare-account-id>"

assets = { directory = "dist" }

# Custom domain (optional)
[[routes]]
pattern = "your-domain.com"
custom_domain = true
```

For docs with Vocs (note: Vocs builds to `docs/dist`):

```toml
name = "your-project-docs"
compatibility_date = "2024-01-01"
account_id = "<your-cloudflare-account-id>"

assets = { directory = "docs/dist" }

[[routes]]
pattern = "docs.your-domain.com"
custom_domain = true
```

### Getting Your Cloudflare Account ID

```bash
# If you have multiple accounts, wrangler will show them:
npx wrangler whoami

# Or find it in the Cloudflare dashboard URL:
# https://dash.cloudflare.com/<account-id>/workers
```

---

## Required Secrets

Add these to GitHub repo settings → Secrets and variables → Actions:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `NPM_TOKEN` | npm automation token | [npmjs.com/settings/~/tokens](https://www.npmjs.com/settings/~/tokens) → Generate New Token → **Automation** |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → Create Token |

### Cloudflare API Token Permissions

Create a custom token with:
- **Account** → Cloudflare Pages → Edit
- **Account** → Workers Scripts → Edit
- **Zone** → Workers Routes → Edit (for custom domains)

Or use the "Edit Cloudflare Workers" template.

---

## Local Deployment

### First-time Setup

```bash
# Login to Cloudflare (opens browser)
npx wrangler login

# Verify authentication
npx wrangler whoami
```

### Deploy Commands

```bash
# Deploy docs
cd packages/docs
pnpm build
npx wrangler deploy

# Deploy web
cd packages/web
pnpm build
npx wrangler deploy

# Or from root with turborepo
pnpm build
cd packages/docs && npx wrangler deploy
cd ../web && npx wrangler deploy
```

---

## npm Publishing

### Package.json Setup

```json
{
  "name": "your-package",
  "version": "0.1.0",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-org/your-repo.git",
    "directory": "packages/cli"
  },
  "bugs": {
    "url": "https://github.com/your-org/your-repo/issues"
  },
  "homepage": "https://github.com/your-org/your-repo#readme",
  "publishConfig": {
    "access": "public"
  }
}
```

### Creating a Release

```bash
# Ensure everything passes
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# Create and push tag
git tag v0.1.0
git push origin v0.1.0
```

The release workflow will:
1. Run CI checks
2. Publish to npm with provenance
3. Deploy docs site
4. Deploy landing page

### npm Provenance

The `--provenance` flag creates a verifiable link between your npm package and the GitHub repo/commit that built it. Requires:
- Public GitHub repo
- `id-token: write` permission in workflow

---

## Turborepo Configuration

### `turbo.json`

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

### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

---

## Checklist for New Projects

### Initial Setup
- [ ] Create GitHub repo
- [ ] Initialize pnpm workspace
- [ ] Add turborepo (`pnpm add -Dw turbo`)
- [ ] Create `turbo.json` and `pnpm-workspace.yaml`
- [ ] Add `.gitignore` with `node_modules/`, `dist/`, `.turbo/`

### CI/CD Setup
- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `.github/workflows/release.yml`
- [ ] Add `NPM_TOKEN` secret to GitHub
- [ ] Add `CLOUDFLARE_API_TOKEN` secret to GitHub

### Cloudflare Setup
- [ ] Create Cloudflare account (if needed)
- [ ] Get account ID
- [ ] Create API token with Workers permissions
- [ ] Add `wrangler.toml` to each deployable package
- [ ] Configure custom domains (optional)

### First Release
- [ ] Verify all checks pass locally: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- [ ] Deploy manually first to verify: `npx wrangler deploy`
- [ ] Verify npm package name is available: `npm view <package-name>`
- [ ] Create release tag: `git tag v0.1.0 && git push origin v0.1.0`
- [ ] Verify deployment succeeded in GitHub Actions
- [ ] Test installed package: `npm install -g <package-name>`

---

## Troubleshooting

### Wrangler "More than one account" Error

Add `account_id` to your `wrangler.toml`:
```toml
account_id = "<your-account-id>"
```

### npm Publish 403 Error

- Check package name isn't taken: `npm view <name>`
- Verify token has publish permissions
- For scoped packages, ensure `"access": "public"` in publishConfig

### Cloudflare Custom Domain Not Working

1. Ensure domain is in your Cloudflare account
2. Wrangler auto-creates DNS records with `custom_domain = true`
3. Check Workers → your-worker → Triggers → Custom Domains

### GitHub Actions Failing on npm Publish

- Ensure `id-token: write` permission is set (for provenance)
- Verify `NPM_TOKEN` secret is set correctly
- Check token hasn't expired
