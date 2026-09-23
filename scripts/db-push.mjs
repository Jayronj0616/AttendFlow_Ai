// Applies pending migrations in supabase/migrations to the remote database.
//
// Reads SUPABASE_DB_URL from .env.local so the password stays out of shell history.

import { spawnSync } from "node:child_process";

process.loadEnvFile(".env.local");

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is not set in .env.local");
  process.exit(1);
}

const result = spawnSync(
  "pnpm",
  ["exec", "supabase", "db", "push", "--db-url", dbUrl, ...process.argv.slice(2)],
  { stdio: "inherit", shell: true },
);

process.exit(result.status ?? 1);
