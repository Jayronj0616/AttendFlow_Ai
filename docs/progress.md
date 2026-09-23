# AttendFlow AI — Development Progress

## Current Phase

Phase 4 — Employee Experience

## Project Status

In Progress. The employee interface is built and runs on mock fixtures in `lib/mock/`.
Nothing is persisted yet, because the database schema has not been applied.

---

# Phase 1 — Project Foundation

- [x] Initialize Next.js application
- [x] Configure TypeScript
- [x] Configure Tailwind CSS
- [ ] Configure Supabase
- [ ] Configure Supabase Auth
- [ ] Configure environment variables
- [x] Establish project structure
- [x] Verify local development
- [ ] Verify Vercel compatibility

## Phase 1 Notes

### Verified

Next.js 16.3.6 with React 19.2.8, TypeScript in strict mode, and Tailwind CSS v4 are
installed and building cleanly. `pnpm build`, `pnpm typecheck`, and `pnpm lint` all pass
with no warnings. The dev server runs and the root page renders with the Poppins font and
the full semantic colour token set resolving correctly in both light and dark mode.

### Blocked on a Supabase project

Four items remain unchecked because no Supabase project exists yet, so none of this has
been verified against a live backend:

- **Configure Supabase** — the three clients in `lib/supabase/` are written but have never
  opened a real connection.
- **Configure Supabase Auth** — session refresh is wired through `proxy.ts`, but no sign-in
  has ever been performed against it.
- **Configure environment variables** — `lib/env.ts` validates them and `.env.example`
  documents them, but `.env.local` currently holds placeholder values.
- **Verify Vercel compatibility** — the production build succeeds locally and the
  architecture avoids local filesystem, long-running processes, and in-memory state, but
  nothing has actually been deployed.

These are ticked once a Supabase project is provisioned, real credentials are in place, and
a round trip is confirmed.

### Deviations from the specification

**Data layer uses `@supabase/supabase-js` rather than an ORM.** The security model in
`docs/database.md` §5 depends on Row Level Security. An ORM connecting over a direct
Postgres connection string authenticates as a privileged role, which makes `auth.uid()`
evaluate to NULL and silently turns every RLS policy into dead code. `@supabase/ssr` binds
each query to the caller's JWT so the policies genuinely enforce. Schema therefore lives as
raw SQL in `supabase/migrations/`, which is also the only way to express RLS policies.

**Service and action layers live under `lib/` rather than at the project root.**
`docs/technical_architecture.md` §13 lists `services/` as a top-level directory. It is
nested as `lib/services/` alongside `lib/actions/` and `lib/validations/` to match the
established naming conventions used across the rest of the codebase. The separation of
concerns the specification calls for is unchanged.

**The root `middleware.ts` convention is replaced by `proxy.ts`.** Next.js 16.3 deprecated
the middleware file convention; this was migrated with the official codemod.

---

# Phase 2 — Database

- [ ] Create departments
- [ ] Create employees
- [ ] Create profiles
- [ ] Create attendance_records
- [ ] Create work_schedules
- [ ] Create attendance_rules
- [ ] Create correction_requests
- [ ] Create approval_requests
- [ ] Create ai_decisions
- [ ] Create audit_logs
- [ ] Create notifications
- [ ] Create relationships
- [ ] Add indexes
- [ ] Configure RLS
- [ ] Test RLS
- [ ] Add development seed data

---

# Phase 3 — Authentication

- [ ] Employee authentication
- [ ] HR authentication
- [ ] Admin authentication
- [ ] Protected routes
- [ ] Role-based authorization
- [ ] Session handling
- [ ] Logout
- [ ] Unauthorized access handling

---

# Phase 4 — Employee Experience

- [x] Employee dashboard
- [x] Attendance history
- [ ] Attendance detail
- [x] Correction request form
- [x] Natural-language request
- [x] Request summary
- [x] Request status
- [x] Notifications

## Phase 4 Notes

Every screen here is built, renders, and has been checked at desktop and phone width with
no console errors. What "done" means for this phase is that the interface is complete and
correct against fixtures in `lib/mock/data.ts` whose shapes match `types/domain.ts`
exactly. No screen reads from or writes to the database, so swapping the data source is
the remaining work, not a rewrite.

Submission is deliberately disabled. Analysis and filing are separate steps, and until a
correction can actually be written and confirmed, offering a button that appears to file
one would breach the rule in `docs/UI_UX.md` section 13 that an AI recommendation must
never look like a completed action.

Attendance detail remains unbuilt; the list views cover the specified employee flows.

---

# Phase 5 — AI Agent

- [ ] Agent architecture
- [ ] Agent prompt
- [x] Structured output
- [ ] Tool architecture
- [ ] Employee context tool
- [ ] Attendance retrieval tool
- [ ] Schedule retrieval tool
- [ ] Correction history tool
- [x] Attendance rule evaluation
- [x] AI decision validation
- [ ] AI decision logging

## Phase 5 Notes

Three items are complete ahead of the agent itself, because they are the parts that must
not depend on it.

`lib/services/correction-rules.service.ts` evaluates a correction deterministically and
consults no model. It resolves all four decision types, aggregates every rule that fires,
and returns the most restrictive outcome, so a request can never slip through because a
permissive rule happened to be evaluated last. All five paths were exercised through the
UI: automatic approval, overtime, existing-attendance protection, a locked payroll period,
and a missed filing deadline.

`lib/validations/correction.schema.ts` defines the structured contract and parses the
extraction at the boundary rather than trusting it, which is what
`docs/technical_architecture.md` section 8 requires once that output comes from a model.

`lib/ai/extract-request.ts` is an explicitly marked placeholder. It reads dates and times
with regular expressions and returns null for anything it cannot read confidently, which
routes the request to NEEDS_CLARIFICATION instead of guessing. Replacing its body with an
agent call requires no change to the contract or to anything downstream.

---

# Phase 6 — Workflow Automation

- [ ] Automatic correction workflow
- [ ] HR approval workflow
- [ ] Rejection workflow
- [ ] Clarification workflow
- [ ] Attendance update
- [ ] Result verification
- [ ] Employee notification
- [ ] Audit logging
- [ ] Idempotency protection

---

# Phase 7 — HR Dashboard

- [ ] HR dashboard
- [ ] Pending approvals
- [ ] Attendance exceptions
- [ ] AI escalations
- [ ] Request detail
- [ ] Approve request
- [ ] Reject request
- [ ] Request clarification
- [ ] Audit log viewer

---

# Phase 8 — Security

- [ ] Review RLS
- [ ] Review RBAC
- [ ] Review server-side authorization
- [ ] Review AI tool permissions
- [ ] Verify secrets are server-only
- [ ] Input validation
- [ ] AI output validation
- [ ] Rate limiting where appropriate
- [ ] Audit logging review

---

# Phase 9 — Testing

## Attendance

- [ ] Missing clock-out
- [ ] Missing clock-in
- [ ] Existing clock-out
- [ ] Invalid correction
- [ ] Overtime correction
- [ ] Multiple corrections
- [ ] Locked payroll period

## Security

- [ ] Employee accessing another employee
- [ ] Employee attempting HR action
- [ ] Unauthorized API request
- [ ] Invalid session
- [ ] RLS verification

## AI

- [ ] Normal request
- [ ] Ambiguous request
- [ ] Missing date
- [ ] Missing time
- [ ] AI provider failure
- [ ] Invalid AI output
- [ ] Tool failure

---

# Phase 10 — Deployment

- [ ] Production Supabase project
- [ ] Configure Vercel project
- [ ] Configure production environment variables
- [ ] Run database migrations
- [ ] Verify authentication
- [ ] Verify RLS
- [ ] Verify AI workflows
- [ ] Verify production logs
- [ ] Test production deployment
- [ ] Create README
- [ ] Create demo account
- [ ] Create portfolio documentation

---

# Development Rules

Do not mark a task complete unless it has actually been implemented and verified.

Keep this file updated as development progresses.

Do not remove completed tasks.

If the implementation differs from the specification, document the reason.