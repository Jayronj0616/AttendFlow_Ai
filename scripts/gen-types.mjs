// Regenerates types/database.types.ts from the live schema via the Supabase Management API.
//
// Deliberately does NOT use `--db-url`: that variant introspects inside a container and
// fails without a Docker daemon, which this project does not use. `--project-id` talks to
// the hosted API over HTTPS instead.
//
// Requires SUPABASE_ACCESS_TOKEN (a personal access token from
// supabase.com/dashboard/account/tokens) in .env.local or the environment.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

process.loadEnvFile(".env.local");

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error(
    "SUPABASE_ACCESS_TOKEN is not set.\n" +
      "Create one at https://supabase.com/dashboard/account/tokens and add it to .env.local.\n" +
      "Until then types/database.types.ts is maintained by hand alongside the migrations.",
  );
  process.exit(1);
}

const projectId = new URL(projectUrl).hostname.split(".")[0];

const result = spawnSync(
  "pnpm",
  ["exec", "supabase", "gen", "types", "typescript", "--project-id", projectId],
  { encoding: "utf8", shell: true, env: { ...process.env, SUPABASE_ACCESS_TOKEN: token } },
);

if (result.status !== 0 || !result.stdout.includes("export type Database")) {
  console.error(result.stderr || result.stdout);
  process.exit(1);
}

writeFileSync("types/database.types.ts", result.stdout);
console.log("Wrote types/database.types.ts");
