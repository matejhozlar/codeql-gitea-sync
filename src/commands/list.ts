import { loadConfig, DEFAULT_CONFIG_PATH } from "../config.js";

export async function runList(args: string[]): Promise<void> {
  let configPath = DEFAULT_CONFIG_PATH;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" && i + 1 < args.length) {
      configPath = args[++i];
    }
  }

  const mappings = loadConfig(configPath);

  const nameWidth = Math.max(4, ...mappings.map((m) => (m.name ?? "—").length));
  const ghWidth = Math.max(11, ...mappings.map((m) => m.github.repo.length));
  const gtWidth = Math.max(9, ...mappings.map((m) => m.gitea.repo.length));

  const header = [
    "Name".padEnd(nameWidth),
    "GitHub Repo".padEnd(ghWidth),
    "Gitea Repo".padEnd(gtWidth),
    "Gitea URL",
  ].join("  ");

  const separator = [
    "─".repeat(nameWidth),
    "─".repeat(ghWidth),
    "─".repeat(gtWidth),
    "─".repeat(Math.max(9, ...mappings.map((m) => m.gitea.url.length))),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const m of mappings) {
    const row = [
      (m.name ?? "—").padEnd(nameWidth),
      m.github.repo.padEnd(ghWidth),
      m.gitea.repo.padEnd(gtWidth),
      m.gitea.url,
    ].join("  ");
    console.log(row);
  }

  console.log(`\n${mappings.length} mapping(s) configured.`);
}
