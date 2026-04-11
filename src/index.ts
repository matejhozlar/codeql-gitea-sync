import "dotenv/config";
import { fetchAlerts } from "./github.js";
import { GiteaClient } from "./gitea.js";
import { isAlertAlreadySynced } from "./dedup.js";
import {
  buildIssueTitle,
  buildIssueBody,
  alertLabel,
  severityLabel,
} from "./transform.js";

interface Config {
  githubToken: string;
  githubRepo: string;
  giteaUrl: string;
  giteaToken: string;
  giteaRepo: string;
  state: string;
  dryRun: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc3545",
  high: "#fd7e14",
  note: "#6c757d",
};

function parseArgs(argv: string[]): Config {
  const args = argv.slice(2);
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      flags["dry-run"] = "true";
    } else if (arg.startsWith("--") && i + 1 < args.length) {
      flags[arg.slice(2)] = args[++i];
    }
  }

  const githubToken = flags["github-token"] ?? process.env.GITHUB_TOKEN;
  const githubRepo = flags["github-repo"] ?? process.env.GITHUB_REPO;
  const giteaUrl = flags["gitea-url"] ?? process.env.GITEA_URL;
  const giteaToken = flags["gitea-token"] ?? process.env.GITEA_TOKEN;
  const giteaRepo = flags["gitea-repo"] ?? process.env.GITEA_REPO;
  const state = flags["state"] ?? "open";
  const dryRun = flags["dry-run"] === "true";

  if (!githubToken) throw new Error("Missing --github-token or GITHUB_TOKEN");
  if (!githubRepo) throw new Error("Missing --github-repo or GITHUB_REPO");
  if (!giteaUrl) throw new Error("Missing --gitea-url or GITEA_URL");
  if (!giteaToken) throw new Error("Missing --gitea-token or GITEA_TOKEN");
  if (!giteaRepo) throw new Error("Missing --gitea-repo or GITEA_REPO");

  if (githubRepo.split("/").length !== 2) {
    throw new Error(
      `Invalid --github-repo format: "${githubRepo}" (expected "owner/repo")`,
    );
  }
  if (giteaRepo.split("/").length !== 2) {
    throw new Error(
      `Invalid --gitea-repo format: "${giteaRepo}" (expected "owner/repo")`,
    );
  }

  return {
    githubToken,
    githubRepo,
    giteaUrl,
    giteaToken,
    giteaRepo,
    state,
    dryRun,
  };
}

async function main(): Promise<void> {
  const config = parseArgs(process.argv);

  console.log(
    `Syncing alerts from GitHub (${config.githubRepo}) to Gitea (${config.giteaRepo})`,
  );
  console.log(`State filter: ${config.state}`);
  if (config.dryRun) console.log("DRY RUN — no issues will be created");

  const alerts = await fetchAlerts(
    config.githubToken,
    config.githubRepo,
    config.state,
  );

  if (alerts.length === 0) {
    console.log("No alerts found. Nothing to do.");
    return;
  }

  const gitea = new GiteaClient(
    config.giteaUrl,
    config.giteaToken,
    config.giteaRepo,
  );
  const existingLabels = await gitea.getLabels();

  const codeqlLabelId = await gitea.ensureLabel(
    "codeql",
    "#5319e7",
    existingLabels,
  );

  let created = 0;
  let skipped = 0;

  for (const alert of alerts) {
    const isDuplicate = await isAlertAlreadySynced(gitea, alert.number);
    if (isDuplicate) {
      console.log(`  SKIP alert #${alert.number} (already synced)`);
      skipped++;
      continue;
    }

    const title = buildIssueTitle(alert);
    const body = buildIssueBody(alert);
    const sevLabel = severityLabel(alert.rule.severity);
    const sevColor = SEVERITY_COLORS[sevLabel] ?? "#6c757d";
    const dedupLabel = alertLabel(alert.number);

    if (config.dryRun) {
      console.log(`  DRY RUN: would create issue "${title}"`);
      console.log(`    Labels: codeql, ${sevLabel}, ${dedupLabel}`);
      created++;
      continue;
    }

    const sevLabelId = await gitea.ensureLabel(
      sevLabel,
      sevColor,
      existingLabels,
    );
    const dedupLabelId = await gitea.ensureLabel(
      dedupLabel,
      "#0075ca",
      existingLabels,
    );

    const issue = await gitea.createIssue(title, body, [
      codeqlLabelId,
      sevLabelId,
      dedupLabelId,
    ]);

    console.log(`  CREATED issue #${issue.number}: ${title}`);
    created++;
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
