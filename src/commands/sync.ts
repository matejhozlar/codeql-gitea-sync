import { loadConfig, DEFAULT_CONFIG_PATH } from "../config.js";
import type { MappingConfig } from "../config.js";
import { fetchAlerts } from "../github.js";
import { GiteaClient } from "../gitea.js";
import { isAlertAlreadySynced } from "../dedup.js";
import {
  buildIssueTitle,
  buildIssueBody,
  alertLabel,
  severityLabel,
} from "../transform.js";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc3545",
  high: "#fd7e14",
  note: "#6c757d",
};

async function syncMapping(
  mapping: MappingConfig,
  dryRun: boolean,
): Promise<void> {
  const label =
    mapping.name ?? `${mapping.github.repo} → ${mapping.gitea.repo}`;
  console.log(`\n── ${label} ──`);
  console.log(
    `  GitHub: ${mapping.github.repo}  →  Gitea: ${mapping.gitea.repo}`,
  );
  console.log(`  State filter: ${mapping.state}`);
  if (dryRun) console.log("  DRY RUN — no issues will be created");

  const alerts = await fetchAlerts(
    mapping.github.token,
    mapping.github.repo,
    mapping.state,
  );

  if (alerts.length === 0) {
    console.log("  No alerts found. Nothing to do.");
    return;
  }

  const gitea = new GiteaClient(
    mapping.gitea.url,
    mapping.gitea.token,
    mapping.gitea.repo,
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
      console.log(`    SKIP alert #${alert.number} (already synced)`);
      skipped++;
      continue;
    }

    const title = buildIssueTitle(alert);
    const body = buildIssueBody(alert);
    const sevLabel = severityLabel(alert.rule.severity);
    const sevColor = SEVERITY_COLORS[sevLabel] ?? "#6c757d";
    const dedupLabel = alertLabel(alert.number);

    if (dryRun) {
      console.log(`    DRY RUN: would create issue "${title}"`);
      console.log(`      Labels: codeql, ${sevLabel}, ${dedupLabel}`);
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

    console.log(`    CREATED issue #${issue.number}: ${title}`);
    created++;
  }

  console.log(`  Done: Created ${created}, Skipped ${skipped}`);
}

export async function runSync(args: string[]): Promise<void> {
  let configPath = DEFAULT_CONFIG_PATH;
  let dryRun = false;
  let targetName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--config" && i + 1 < args.length) {
      configPath = args[++i];
    } else if (!arg.startsWith("--")) {
      targetName = arg;
    }
  }

  const mappings = loadConfig(configPath);

  let toSync: MappingConfig[];
  if (targetName) {
    toSync = mappings.filter((m) => m.name === targetName);
    if (toSync.length === 0) {
      const names = mappings
        .map((m) => m.name)
        .filter(Boolean)
        .join(", ");
      throw new Error(
        `No mapping named "${targetName}". Available: ${names || "(none named)"}`,
      );
    }
  } else {
    toSync = mappings;
  }

  console.log(`Syncing ${toSync.length} mapping(s)...`);

  for (const mapping of toSync) {
    await syncMapping(mapping, dryRun);
  }

  console.log("\nAll done!");
}
