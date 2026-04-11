export interface GitHubAlertRule {
  id: string;
  severity: string;
  description: string;
  full_description?: string;
  help_uri?: string;
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
  message: { text: string };
  location: GitHubAlertLocation;
  fingerprints?: Record<string, string>;
}

export interface GitHubAlert {
  number: number;
  state: string;
  html_url: string;
  rule: GitHubAlertRule;
  tool: GitHubAlertTool;
  most_recent_instance: GitHubAlertInstance;
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
