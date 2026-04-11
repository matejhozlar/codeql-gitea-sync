# codeql-gitea-sync

Fetch CodeQL (and other code scanning) security alerts from GitHub repositories and create corresponding issues on Gitea instances. Supports multiple repository mappings via a single config file.

## Requirements

- Node.js 18+
- pnpm

## Installation

```bash
pnpm install
```

## Quick start

```bash
# Create a config file interactively
pnpm start init

# Sync all configured mappings
pnpm start sync

# Preview what would be synced
pnpm start sync --dry-run
```

## Configuration

Configuration is driven by a JSON file (default: `codeql-sync.config.json`). Use a different path with the `--config` flag.

### Config file format

```json
{
  "defaults": {
    "github": {
      "token": "ghp_..."
    },
    "gitea": {
      "url": "https://gitea.example.com",
      "token": "gitea_token_here"
    },
    "state": "open"
  },
  "mappings": [
    {
      "name": "frontend",
      "github": { "repo": "myorg/frontend" },
      "gitea": { "repo": "me/frontend" }
    },
    {
      "name": "backend",
      "github": { "repo": "myorg/backend", "token": "ghp_override" },
      "gitea": { "repo": "me/backend", "url": "https://other-gitea.example.com" }
    }
  ]
}
```

- **`defaults`** — fallback values shared by all mappings
- **`mappings`** — one or more GitHub → Gitea repo pairs
- Each mapping can override `token` and `url` from defaults
- **`name`** is optional but lets you target a single mapping with `sync <name>`

### Token resolution order

1. Per-mapping value in the config file (highest priority)
2. `defaults` section in the config file
3. Environment variables `GITHUB_TOKEN` / `GITEA_TOKEN` (lowest priority)

You can set env vars in a `.env` file (see `.env.example`).

## Commands

### `sync [name]`

Sync CodeQL alerts from GitHub to Gitea issues.

```bash
pnpm start sync                    # sync all mappings
pnpm start sync frontend           # sync only the "frontend" mapping
pnpm start sync --dry-run          # preview without creating issues
pnpm start sync frontend --dry-run # preview a single mapping
```

### `list`

Print a table of all configured mappings.

```bash
pnpm start list
```

### `init`

Interactive wizard to create `codeql-sync.config.json`. Prompts for default tokens, Gitea URL, and one or more repo mappings.

```bash
pnpm start init
```

### Global options

These flags can be placed before or after the command name.

| Flag | Description |
|------|-------------|
| `--config <path>` | Path to config file (default: `codeql-sync.config.json`) |

## Deduplication

Each synced alert gets a `gh-alert-{number}` label on the created Gitea issue. On subsequent runs, alerts with an existing matching label are skipped. This makes the tool safe to re-run.

## How it works

1. Reads the config file and resolves tokens/URLs for each mapping
2. For each mapping, fetches code scanning alerts from the GitHub API (with pagination)
3. For each alert, checks if a Gitea issue already exists with a matching fingerprint label
4. Creates a Gitea issue with structured body, severity labels, and a `codeql` label
5. Prints a summary of created and skipped issues per mapping
