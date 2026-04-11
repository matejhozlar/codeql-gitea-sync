import type { GiteaClient } from "./gitea.js";
import { alertLabel } from "./transform.js";

export async function isAlertAlreadySynced(
  gitea: GiteaClient,
  alertNumber: number,
  existingLabels: { id: number; name: string }[],
): Promise<boolean> {
  const label = alertLabel(alertNumber);
  const labelExists = existingLabels.some((l) => l.name === label);
  if (!labelExists) return false;
  const issues = await gitea.searchIssuesByLabel(label);
  return issues.length > 0;
}
