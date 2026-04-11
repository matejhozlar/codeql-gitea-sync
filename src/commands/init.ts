import { createInterface } from "node:readline";
import { writeFileSync, existsSync } from "node:fs";
import { DEFAULT_CONFIG_PATH } from "../config.js";

function prompt(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultValue?: string,
): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

interface InitMapping {
  name?: string;
  github: { repo: string };
  gitea: { repo: string };
}

interface InitConfig {
  defaults: {
    github?: { token: string };
    gitea?: { url?: string; token?: string };
    state: string;
  };
  mappings: InitMapping[];
}

export async function runInit(args: string[]): Promise<void> {
  let configPath = DEFAULT_CONFIG_PATH;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && i + 1 < args.length) {
      configPath = args[++i];
    }
  }

  if (existsSync(configPath)) {
    console.log(`Config file already exists: ${configPath}`);
    console.log("Delete it first if you want to start fresh.");
    return;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log("codeql-gitea-sync — configuration wizard\n");

    const giteaUrl = await prompt(rl, "Default Gitea URL");
    const giteaToken = await prompt(rl, "Default Gitea token");
    const githubToken = await prompt(rl, "Default GitHub token");

    const mappings: InitMapping[] = [];

    let addMore = true;
    while (addMore) {
      console.log(`\n── Mapping #${mappings.length + 1} ──`);

      const name = await prompt(rl, "Mapping name (optional)");
      const githubRepo = await prompt(rl, "GitHub repo (owner/repo)");
      const giteaRepo = await prompt(rl, "Gitea repo (owner/repo)");

      if (!githubRepo || !giteaRepo) {
        console.log("Both GitHub and Gitea repos are required. Skipping.");
        continue;
      }

      const mapping: InitMapping = {
        github: { repo: githubRepo },
        gitea: { repo: giteaRepo },
      };
      if (name) mapping.name = name;

      mappings.push(mapping);

      const another = await prompt(rl, "Add another mapping? (y/N)", "N");
      addMore = another.toLowerCase() === "y";
    }

    if (mappings.length === 0) {
      console.log("\nNo mappings added. Config file not created.");
      return;
    }

    const defaults: InitConfig["defaults"] = { state: "open" };
    if (githubToken) defaults.github = { token: githubToken };
    if (giteaUrl || giteaToken) {
      defaults.gitea = {};
      if (giteaUrl) defaults.gitea.url = giteaUrl;
      if (giteaToken) defaults.gitea.token = giteaToken;
    }

    const config: InitConfig = { defaults, mappings };

    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    console.log(`\nConfig written to ${configPath}`);
    console.log(`${mappings.length} mapping(s) configured.`);
    console.log('Run "pnpm start sync" to start syncing.');
  } finally {
    rl.close();
  }
}
