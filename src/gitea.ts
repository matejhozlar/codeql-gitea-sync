export interface GiteaLabel {
  id: number;
  name: string;
}

export interface GiteaIssue {
  id: number;
  number: number;
  title: string;
  labels: GiteaLabel[];
}

export class GiteaClient {
  private baseUrl: string;
  private token: string;
  private owner: string;
  private repo: string;

  constructor(baseUrl: string, token: string, repo: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
    const [owner, name] = repo.split("/");
    this.owner = owner;
    this.repo = name;
  }

  private get repoUrl(): string {
    return `${this.baseUrl}/api/v1/repos/${this.owner}/${this.repo}`;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `token ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  async getLabels(): Promise<GiteaLabel[]> {
    const allLabels: GiteaLabel[] = [];
    let page = 1;

    while (true) {
      const res = await fetch(`${this.repoUrl}/labels?limit=50&page=${page}`, {
        headers: this.headers(),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Gitea getLabels error (${res.status}): ${body}`);
      }
      const labels: GiteaLabel[] = await res.json();
      if (labels.length === 0) break;
      allLabels.push(...labels);
      page++;
    }

    return allLabels;
  }

  async createLabel(name: string, color: string): Promise<GiteaLabel> {
    const res = await fetch(`${this.repoUrl}/labels`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gitea createLabel error (${res.status}): ${body}`);
    }
    return res.json();
  }

  async ensureLabel(
    name: string,
    color: string,
    existingLabels: GiteaLabel[],
  ): Promise<number> {
    const existing = existingLabels.find((l) => l.name === name);
    if (existing) return existing.id;
    const created = await this.createLabel(name, color);
    existingLabels.push(created);
    return created.id;
  }

  async searchIssuesByQuery(query: string): Promise<GiteaIssue[]> {
    const res = await fetch(
      `${this.repoUrl}/issues?q=${encodeURIComponent(query)}&state=all&type=issues&limit=1`,
      { headers: this.headers() },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Gitea searchIssuesByQuery error (${res.status}): ${body}`,
      );
    }
    return res.json();
  }

  async createIssue(
    title: string,
    body: string,
    labelIds: number[],
  ): Promise<GiteaIssue> {
    const res = await fetch(`${this.repoUrl}/issues`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ title, body, labels: labelIds }),
    });
    if (!res.ok) {
      const respBody = await res.text();
      throw new Error(`Gitea createIssue error (${res.status}): ${respBody}`);
    }
    return res.json();
  }
}
