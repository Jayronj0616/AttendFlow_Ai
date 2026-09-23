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
cp .env.example .env.local
pnpm dev
```

`.env.local` currently ships with placeholder values. Nothing will connect until a Supabase
project is provisioned and the real URL and keys are filled in. `lib/env.ts` validates
these at startup and will throw immediately if one is missing or malformed.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript with no emit |
| `pnpm lint` | ESLint |
| `pnpm db:types` | Regenerate `types/database.types.ts` from the linked Supabase project |

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

## Database access

Three Supabase clients, and picking the wrong one is a security bug:

- **`lib/supabase/client.ts`** — browser, anon key, RLS applies.
- **`lib/supabase/server.ts`** — server-side, carries the caller's session so `auth.uid()`
  resolves and RLS applies. **This is the default for anything acting on a user's behalf.**
- **`lib/supabase/admin.ts`** — service role, bypasses RLS entirely. Guarded by
  `server-only`. Reserved for the AI tool layer and HR actions that have already passed an
  explicit authorization check in the service layer.
