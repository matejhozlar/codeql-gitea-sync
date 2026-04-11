export interface GitHubAlertRule {
  id: string;
  name: string;
  severity: string;
  description: string;
  full_description?: string;
  help?: string;
  help_uri?: string;
  tags?: string[];
  security_severity_level?: string;
}

export interface GitHubAlertTool {
  name: string;
  version?: string;
}

export interface GitHubAlertLocation {
  path: string;
  start_line: number;
  end_line?: number;
  start_column?: number;
  end_column?: number;
}

export interface GitHubAlertInstance {
  ref?: string;
  state?: string;
  commit_sha?: string;
  category?: string;
  message: { text: string };
  location: GitHubAlertLocation;
  fingerprints?: Record<string, string>;
  classifications?: string[];
}

export interface GitHubAlert {
  number: number;
  state: string;
  html_url: string;
  created_at: string;
  updated_at?: string;
  fixed_at?: string;
  dismissed_at?: string;
  dismissed_by?: { login: string } | null;
  dismissed_reason?: string | null;
  dismissed_comment?: string | null;
  rule: GitHubAlertRule;
  tool: GitHubAlertTool;
  most_recent_instance: GitHubAlertInstance;
  instances_url?: string;
}

export async function fetchAlerts(
  token: string,
  repo: string,
  state: string,
): Promise<GitHubAlert[]> {
  const [owner, name] = repo.split("/");
  const allAlerts: GitHubAlert[] = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/code-scanning/alerts?state=${encodeURIComponent(state)}&per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API error (${res.status}): ${body}`);
    }

    const alerts: GitHubAlert[] = await res.json();
    if (alerts.length === 0) break;

    allAlerts.push(...alerts);

    const linkHeader = res.headers.get("link");
    if (!linkHeader || !linkHeader.includes('rel="next"')) break;

    page++;
  }

  console.log(`Fetched ${allAlerts.length} alert(s) from GitHub`);
  return allAlerts;
}
