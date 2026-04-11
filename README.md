# codeql-gitea-sync

Fetch CodeQL (and other code scanning) security alerts from a GitHub repository and create corresponding issues on a Gitea instance.

## Requirements

- Node.js 18+
- pnpm

## Installation

```bash
pnpm install
```

## Usage

```bash
# Using CLI flags
npx tsx src/index.ts \
  --github-token YOUR_GITHUB_TOKEN \
  --github-repo owner/repo \
  --gitea-url https://your-gitea.example.com \
  --gitea-token YOUR_GITEA_TOKEN \
  --gitea-repo owner/repo

# Using environment variables (or .env file)
export GITHUB_TOKEN=...
export GITHUB_REPO=owner/repo
export GITEA_URL=https://your-gitea.example.com
export GITEA_TOKEN=...
export GITEA_REPO=owner/repo
npx tsx src/index.ts
```

### Options

| Flag | Env var | Description |
|------|---------|-------------|
| `--github-token` | `GITHUB_TOKEN` | GitHub PAT with `security_events` scope |
| `--github-repo` | `GITHUB_REPO` | Source repo, e.g. `owner/repo` |
| `--gitea-url` | `GITEA_URL` | Base URL of your Gitea instance |
| `--gitea-token` | `GITEA_TOKEN` | Gitea access token with issue write scope |
| `--gitea-repo` | `GITEA_REPO` | Target repo, e.g. `owner/repo` |
| `--state` | — | Alert state filter: `open` (default), `dismissed`, `all` |
| `--dry-run` | — | Print what would be created without posting |

### Dry run

Use `--dry-run` to preview what issues would be created without actually posting anything:

```bash
npx tsx src/index.ts --dry-run
```

## Deduplication

Each synced alert gets a `gh-alert-{number}` label on the created Gitea issue. On subsequent runs, alerts with an existing matching label are skipped. This makes the tool safe to re-run.

## How it works

1. Fetches code scanning alerts from the GitHub API (with pagination for >100 alerts)
2. For each alert, checks if a Gitea issue already exists with a matching fingerprint label
3. Creates a Gitea issue with structured body, severity labels, and a `codeql` label
4. Prints a summary of created and skipped issues
