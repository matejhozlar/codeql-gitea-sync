import { readFileSync, existsSync } from "node:fs";

export interface MappingConfig {
  name?: string;
  github: {
    repo: string;
    token: string;
  };
  gitea: {
    repo: string;
    url: string;
    token: string;
  };
  state: string;
}

interface ConfigFileGithubDefaults {
  token?: string;
}

interface ConfigFileGiteaDefaults {
  url?: string;
  token?: string;
}

interface ConfigFileDefaults {
  github?: ConfigFileGithubDefaults;
  gitea?: ConfigFileGiteaDefaults;
  state?: string;
}

interface ConfigFileMapping {
  name?: string;
  github: { repo: string; token?: string };
  gitea: { repo: string; url?: string; token?: string };
}

interface ConfigFile {
  defaults?: ConfigFileDefaults;
  mappings: ConfigFileMapping[];
}

export const DEFAULT_CONFIG_PATH = "codeql-sync.config.json";

export function loadConfig(configPath: string): MappingConfig[] {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch {
    throw new Error(`Unable to read config file: ${configPath}`);
  }

  let parsed: ConfigFile;
  try {
    parsed = JSON.parse(raw) as ConfigFile;
  } catch {
    throw new Error(
      `Invalid JSON in config file: ${configPath}. Please check the syntax.`,
    );
  }

  if (!Array.isArray(parsed.mappings) || parsed.mappings.length === 0) {
    throw new Error(
      `Config file must contain a non-empty "mappings" array. Run "pnpm start init" to create one.`,
    );
  }

  const defaults = parsed.defaults ?? {};
  const envGithubToken = process.env.GITHUB_TOKEN;
  const envGiteaToken = process.env.GITEA_TOKEN;

  return parsed.mappings.map((m, i) => {
    const label = m.name ?? `mapping[${i}]`;

    const githubToken =
      m.github.token || defaults.github?.token || envGithubToken;
    if (!githubToken) {
      throw new Error(
        `${label}: No GitHub token found. Set it in the mapping, defaults, or GITHUB_TOKEN env var.`,
      );
    }

    const giteaToken = m.gitea.token || defaults.gitea?.token || envGiteaToken;
    if (!giteaToken) {
      throw new Error(
        `${label}: No Gitea token found. Set it in the mapping, defaults, or GITEA_TOKEN env var.`,
      );
    }

    const giteaUrl = m.gitea.url || defaults.gitea?.url;
    if (!giteaUrl) {
      throw new Error(
        `${label}: No Gitea URL found. Set it in the mapping or defaults.`,
      );
    }

    if (m.github.repo.split("/").length !== 2) {
      throw new Error(
        `${label}: Invalid github.repo format: "${m.github.repo}" (expected "owner/repo")`,
      );
    }
    if (m.gitea.repo.split("/").length !== 2) {
      throw new Error(
        `${label}: Invalid gitea.repo format: "${m.gitea.repo}" (expected "owner/repo")`,
      );
    }

    return {
      name: m.name,
      github: { repo: m.github.repo, token: githubToken },
      gitea: { repo: m.gitea.repo, url: giteaUrl, token: giteaToken },
      state: defaults.state ?? "open",
    };
  });
}
