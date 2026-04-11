import type { GiteaClient } from "./gitea.js";
import { alertLabel } from "./transform.js";

export async function isAlertAlreadySynced(
  gitea: GiteaClient,
  alertNumber: number,
): Promise<boolean> {
  const label = alertLabel(alertNumber);
  const issues = await gitea.searchIssuesByLabel(label);
  return issues.length > 0;
}
