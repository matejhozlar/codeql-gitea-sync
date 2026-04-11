import "dotenv/config";
import { runSync } from "./commands/sync.js";
import { runList } from "./commands/list.js";
import { runInit } from "./commands/init.js";

const USAGE = `Usage: pnpm start <command> [options]

Commands:
  sync [name]       Sync alerts for all mappings (or a single named mapping)
  list              List all configured mappings
  init              Interactive wizard to create a config file

Options:
  --config <path>   Path to config file (default: codeql-sync.config.json)
  --dry-run         Preview sync without creating issues (sync only)
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const rest = args.slice(1);

  switch (command) {
    case "sync":
      await runSync(rest);
      break;
    case "list":
      await runList(rest);
      break;
    case "init":
      await runInit(rest);
      break;
    default:
      console.log(USAGE);
      if (command && command !== "--help" && command !== "-h") {
        console.error(`Unknown command: ${command}`);
        process.exit(1);
      }
      break;
  }
}

main().catch((err: unknown) => {
  console.error("Fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
