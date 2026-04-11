import type { GiteaClient } from "./gitea.js";

export async function isAlertAlreadySynced(
  gitea: GiteaClient,
  alertNumber: number,
): Promise<boolean> {
  const issues = await gitea.searchIssuesByQuery(
    `GitHub alert #${alertNumber}:`,
  );
  return issues.length > 0;
}
