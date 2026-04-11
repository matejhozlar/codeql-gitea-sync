import type { GitHubAlert } from "./github.js";

export interface GiteaIssuePayload {
  title: string;
  body: string;
  labels: number[];
}

export function buildIssueTitle(alert: GitHubAlert): string {
  const severity = alert.rule.severity ?? "unknown";
  const ruleId = alert.rule.id;
  const loc = alert.most_recent_instance.location;
  const path = loc.path;
  const line = loc.start_line;
  return `[${severity}] ${ruleId} — ${path}:${line}`;
}

export function buildIssueBody(alert: GitHubAlert): string {
  const rule = alert.rule;
  const instance = alert.most_recent_instance;
  const loc = instance.location;
  const fingerprint =
    instance.fingerprints?.["primaryLocationFingerprint"] ?? "N/A";

  const helpLine = rule.help_uri ? `\n${rule.help_uri}` : "";

  return `## ${rule.full_description ?? rule.description}

**Tool:** ${alert.tool.name}
**Rule:** \`${rule.id}\`
**Severity:** ${rule.severity}
**Location:** \`${loc.path}:${loc.start_line}\`

### Message
${instance.message.text}

### Details${helpLine}

---
_Imported from GitHub alert #${alert.number}: ${alert.html_url}_
_Fingerprint: ${fingerprint}_`;
}

export function alertLabel(alertNumber: number): string {
  return `gh-alert-${alertNumber}`;
}

export function severityLabel(severity: string): string {
  const mapping: Record<string, string> = {
    error: "critical",
    warning: "high",
    note: "note",
  };
  return mapping[severity] ?? severity;
}
