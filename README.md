# AttendFlow AI

AI-assisted attendance correction. Employees describe a correction in natural language, an
agent gathers the relevant attendance context through controlled server-side tools,
deterministic business rules decide whether it can be applied automatically, and anything
sensitive is escalated to HR. Every state change is audited.

The specification lives in [`docs/`](docs/) and is the source of truth for the data model,
system flow, agent behaviour, and UI direction.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui ·
Supabase (Postgres, Auth, RLS) · Vercel

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in the Supabase values
pnpm db:push                 # apply migrations
node scripts/seed.mjs        # demo employee and attendance history
pnpm dev
```

`lib/env.ts` validates the environment at startup and throws immediately if a variable is
missing or malformed, rather than failing later at the first query.

Use the **session pooler** connection string for `SUPABASE_DB_URL`, not the direct
`db.<ref>.supabase.co` host — that one publishes only an IPv6 address and is unreachable
from an IPv4 network.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript with no emit |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |
| `pnpm db:push` | Apply `supabase/migrations` to the remote database |
| `pnpm db:types` | Regenerate `types/database.types.ts` (needs `SUPABASE_ACCESS_TOKEN`) |

No Docker is required. Migrations go straight to Postgres over the pooler, and type
generation uses the Management API rather than the container-based `--db-url` path.

## Structure

```
app/                  Routes, layouts, pages
components/ui/        shadcn/ui primitives
hooks/                Client-side React hooks
lib/
  actions/            Server Actions — validate input, delegate to a service
  services/           Business logic
  validations/        Zod schemas, shared between forms and actions
  supabase/           client (browser) · server (user session, RLS) · admin (service role)
  ai/                 Agent orchestration and tool definitions
  env.ts              Validated environment variables
types/                Generated database types
supabase/migrations/  SQL schema and RLS policies
proxy.ts              Session refresh on every matched request
```

## Deploying to Vercel

Import the repository in Vercel and set these three environment variables. Nothing else in
`.env.local` belongs in production — `SUPABASE_DB_URL`, `SUPABASE_ACCESS_TOKEN`, and
`SEED_DEMO_PASSWORD` are local tooling and should not be added.

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Safe in the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe in the browser; RLS governs what it can read |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Never prefix with `NEXT_PUBLIC_` |

`NEXT_PUBLIC_SITE_URL` is optional. Without it, canonical URLs, Open Graph tags, and the
sitemap fall back to Vercel's production domain automatically; set it only when a custom
domain is in use.

Migrations are not run by the build. Apply them from a machine that has `SUPABASE_DB_URL`:

```bash
pnpm db:push
```

Two things worth deciding before going live. Whether production shares this Supabase
project or gets its own — sharing is fine for a demo, but then development and production
write to the same attendance records. And whether to keep the seeded demo accounts, since
`scripts/seed.mjs` deletes and recreates them on every run.

## Database access

Three Supabase clients, and picking the wrong one is a security bug:

- **`lib/supabase/client.ts`** — browser, anon key, RLS applies.
- **`lib/supabase/server.ts`** — server-side, carries the caller's session so `auth.uid()`
  resolves and RLS applies. **This is the default for anything acting on a user's behalf.**
- **`lib/supabase/admin.ts`** — service role, bypasses RLS entirely. Guarded by
  `server-only`. Reserved for the AI tool layer and HR actions that have already passed an
  explicit authorization check in the service layer.
