import type { GitHubAlert } from "./github.js";

export function buildIssueTitle(alert: GitHubAlert): string {
  const severity = severityLabel(alert.rule.severity ?? "unknown");
  const ruleId = alert.rule.id;
  const loc = alert.most_recent_instance.location;
  const path = loc.path;
  const line = loc.start_line;
  const secLevel = alert.rule.security_severity_level;
  const secSuffix = secLevel ? ` (${secLevel})` : "";
  return `[${severity}${secSuffix}] ${ruleId} — ${path}:${line}`;
}

function formatLocation(
  loc: GitHubAlert["most_recent_instance"]["location"],
): string {
  let s = `${loc.path}:${loc.start_line}`;
  if (loc.end_line && loc.end_line !== loc.start_line) {
    s += `-${loc.end_line}`;
  }
  if (loc.start_column) {
    s += ` (col ${loc.start_column}`;
    s += loc.end_column ? `-${loc.end_column})` : ")";
  }
  return s;
}

function formatTags(tags: string[]): string {
  const cweTags = tags.filter((t) => t.startsWith("external/cwe/"));
  const otherTags = tags.filter((t) => !t.startsWith("external/cwe/"));

  const parts: string[] = [];
  if (cweTags.length > 0) {
    const cweIds = cweTags.map((t) => {
      const id = t.replace("external/cwe/cwe-", "").toUpperCase();
      return `[CWE-${id}](https://cwe.mitre.org/data/definitions/${id}.html)`;
    });
    parts.push(`**CWE:** ${cweIds.join(", ")}`);
  }
  if (otherTags.length > 0) {
    parts.push(`**Tags:** ${otherTags.map((t) => `\`${t}\``).join(", ")}`);
  }
  return parts.join("\n");
}

export function buildIssueBody(alert: GitHubAlert): string {
  const rule = alert.rule;
  const instance = alert.most_recent_instance;
  const loc = instance.location;
  const fingerprint =
    instance.fingerprints?.["primaryLocationFingerprint"] ?? "N/A";

  const sections: string[] = [];

  // Header
  sections.push(`## ${rule.full_description ?? rule.description}`);

  // Metadata table
  const meta: string[] = [
    `**Tool:** ${alert.tool.name}${alert.tool.version ? ` v${alert.tool.version}` : ""}`,
    `**Rule:** \`${rule.id}\``,
    `**Severity:** ${rule.severity}${rule.security_severity_level ? ` (security: ${rule.security_severity_level})` : ""}`,
    `**Location:** \`${formatLocation(loc)}\``,
  ];

  if (instance.ref) {
    meta.push(`**Branch:** \`${instance.ref.replace("refs/heads/", "")}\``);
  }
  if (instance.commit_sha) {
    meta.push(`**Commit:** \`${instance.commit_sha.slice(0, 12)}\``);
  }
  meta.push(`**Detected:** ${alert.created_at}`);

  sections.push(meta.join("\n"));

  // Tags / CWE
  if (rule.tags && rule.tags.length > 0) {
    sections.push(formatTags(rule.tags));
  }

  // Message
  sections.push(`### Message\n${instance.message.text}`);

  // Help (the big one — full CodeQL documentation)
  if (rule.help) {
    sections.push(`### Help\n${rule.help}`);
  } else if (rule.help_uri) {
    sections.push(`### Details\n${rule.help_uri}`);
  }

  // Footer
  sections.push(
    `---\n_Imported from GitHub alert #${alert.number}: ${alert.html_url}_\n_Fingerprint: ${fingerprint}_`,
  );

  return sections.join("\n\n");
}

export function severityLabel(severity: string): string {
  const mapping: Record<string, string> = {
    error: "critical",
    warning: "high",
    note: "note",
  };
  return mapping[severity] ?? severity;
}
