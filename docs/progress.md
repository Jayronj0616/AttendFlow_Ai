# AttendFlow AI — Development Progress

## Current Phase

Phase 6 — Workflow Automation

## Project Status

In Progress. The employee workflow runs end to end against the hosted Supabase project: an
employee signs in, describes a correction, and the system evaluates it, writes it, verifies
the write, and records the audit trail. Mock fixtures have been deleted.

What remains is the HR side. An escalated correction creates an approval request, but no
interface exists yet for HR to act on it.

---

# Phase 1 — Project Foundation

- [x] Initialize Next.js application
- [x] Configure TypeScript
- [x] Configure Tailwind CSS
- [x] Configure Supabase
- [x] Configure Supabase Auth
- [x] Configure environment variables
- [x] Establish project structure
- [x] Verify local development
- [ ] Verify Vercel compatibility

## Phase 1 Notes

### Verified

Next.js 16.3.6 with React 19.2.8, TypeScript in strict mode, and Tailwind CSS v4 are
installed and building cleanly. `pnpm build`, `pnpm typecheck`, and `pnpm lint` all pass
with no warnings. The dev server runs and the root page renders with the Poppins font and
the full semantic colour token set resolving correctly in both light and dark mode.

### Connection notes

The hosted Supabase project is connected and a full round trip has been confirmed: sign-in,
reads through RLS, and a correction written and read back.

Two environment details cost time and are worth recording. The direct database host
`db.<ref>.supabase.co` publishes only an AAAA record, so it is unreachable from an IPv4
network; the session pooler host must be used instead, and it is stored as
`SUPABASE_DB_URL` in `.env.local`. Separately, the anon key appeared to be rejected while
the service role key worked — that was misleading. The anon key was always valid, and the
401 came from testing the PostgREST root against a database with no tables and therefore no
grants to the `anon` role. It behaved correctly as soon as the schema existed.

Vercel compatibility stays unchecked because nothing has been deployed. The production
build succeeds and the architecture avoids local filesystem, long-running processes, and
in-memory state, but that is an argument rather than a verification.

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

- [x] Create departments
- [x] Create employees
- [x] Create profiles
- [x] Create attendance_records
- [x] Create work_schedules
- [x] Create attendance_rules
- [x] Create correction_requests
- [x] Create approval_requests
- [x] Create ai_decisions
- [x] Create audit_logs
- [x] Create notifications
- [x] Create relationships
- [x] Add indexes
- [x] Configure RLS
- [x] Test RLS
- [x] Add development seed data

## Phase 2 Notes

All eleven tables live in `supabase/migrations/20260923000001_initial_schema.sql`, applied
with `pnpm db:push`. Seed data is created by `pnpm exec node scripts/seed.mjs`, which is
idempotent — it removes the demo employee's rows before recreating them.

One deviation from `docs/database.md`: the status and role columns it describes as TEXT are
Postgres enums. Their value lists are already fixed, and an enum both rejects a bad value at
the database and generates a TypeScript union rather than a bare `string`, which keeps
decision handling exhaustively checked in application code.

Two constraints were added beyond the specification. `attendance_records` rejects a
clock-out that precedes its clock-in, and `correction_requests` carries a unique
`idempotency_key` so a resubmitted correction collapses onto one row instead of creating a
second.

RLS is verified by `pnpm db:verify-rls`, which signs in as each seeded role through the
anon key — the same path the application uses — and asserts what each one can and cannot
reach. It deliberately avoids the service role, which bypasses RLS and would prove nothing.
All seventeen checks pass.

The suite is not vacuous, and the two halves validate each other: the HR checks prove rows
belonging to several employees genuinely exist in the table, while the employee checks
prove only one employee's rows come back. A policy that failed open would break the second
half while the first still passed.

It covers the cases worth worrying about — an anonymous caller reading nothing at all, one
employee reading another's attendance, an employee approving their own correction, and any
client writing attendance directly, which no role may do because corrections are applied by
the server after the rules have run.

The seed therefore creates a second employee on purpose. Without another employee's rows in
the table, "Maria sees only her own" would prove nothing.

---

# Phase 3 — Authentication

- [x] Employee authentication
- [x] HR authentication
- [ ] Admin authentication
- [x] Protected routes
- [x] Role-based authorization
- [x] Session handling
- [x] Logout
- [x] Unauthorized access handling

## Phase 3 Notes

Sign-in, sign-out, session refresh, and route protection work and were exercised in the
browser. `proxy.ts` guards every path outside `/login`, and a signed-in user visiting
`/login` is sent to the dashboard.

The sign-in error deliberately does not distinguish an unknown address from a wrong
password, which would otherwise let anyone probe which email addresses have accounts.

HR and admin authentication are unchecked because no user holds those roles yet. Role-based
authorization is written — navigation filters by role and the RLS policies branch on
`auth_is_staff()` and `auth_is_admin()` — but nothing has exercised those branches, so it
is not claimed as done.

---

# Phase 4 — Employee Experience

- [x] Employee dashboard
- [x] Attendance history
- [x] Attendance detail
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

Attendance detail compares the recorded punches against the schedule that applied on that
date and states the difference in plain terms, so an employee can see why a day was marked
undertime rather than only that it was. The date segment is validated against an ISO
pattern before it reaches a query, since it arrives from the URL.

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

- [x] Automatic correction workflow
- [x] HR approval workflow
- [x] Rejection workflow
- [x] Clarification workflow
- [x] Attendance update
- [x] Result verification
- [x] Employee notification
- [x] Audit logging
- [x] Idempotency protection

## Phase 6 Notes

The automatic path was confirmed against the database rather than from the interface
message. Submitting "I forgot to clock out yesterday at 5:10 PM" set `clock_out` to
`09:10:00+00:00` (5:10 PM Manila), flipped the record from `incomplete` to `present`,
marked the request `completed`, and wrote rows to `ai_decisions`, `audit_logs`, and
`notifications`.

Result verification re-reads the row and compares it against what was asked for. This
caught a real defect: the comparison was originally written on timestamp strings, and
Postgres returns its own spelling of an instant, so a successful write was reported as a
failure. Timestamps are now compared as instants through `isSameInstant`, and the same flaw
was fixed in the rule engine's conflict check, where it would have raised a false conflict
against an identical recorded punch. A regression test covers it.

A failed automatic apply no longer strands the request. It escalates to HR and logs
`correction_apply_failed`, because leaving it approved-but-unapplied would also make a
retry look like a duplicate and silently do nothing.

The HR approval workflow is now complete and verified — see the Phase 7 notes.

---

# Phase 7 — HR Dashboard

- [x] HR dashboard
- [x] Pending approvals
- [x] Attendance exceptions
- [x] AI escalations
- [x] Request detail
- [x] Approve request
- [x] Reject request
- [x] Request clarification
- [x] Audit log viewer

## Phase 7 Notes

All three review actions were exercised against the database, not judged from the
interface. Approving wrote the clock-out, flipped the record to `present`, completed the
request with `reviewed_by` set, resolved the approval, and logged `correction_approved`
under `actor_type: hr`. Rejecting left attendance **completely untouched** — still
`09:02`, status `late`, source `biometric` — while recording the reviewer's reason and
sending it to the employee verbatim. Requesting clarification notified the employee and
deliberately left the request in the queue, which the queue count confirmed.

Approval reuses `applyPunchesToAttendance`, the same function the automatic path uses, so
the read-back verification cannot drift between the two routes.

Authorization rests on RLS rather than an application role check. The status change runs
through the session client, so the staff-only policy is what permits the review, and the
update is conditional on the row still being `pending_hr` — an atomic claim that stops two
reviewers double-applying one correction.

The dashboard is role-aware rather than a separate route, since most HR accounts have no
employee record and the employee view would be empty for them.

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

- [x] Missing clock-out
- [x] Missing clock-in
- [x] Existing clock-out
- [x] Invalid correction
- [x] Overtime correction
- [x] Multiple corrections
- [x] Locked payroll period

Covered by 22 Vitest cases in `lib/services/correction-rules.service.test.ts`, run with
`pnpm test`. These exercise the rule engine directly rather than the full request path, so
they verify which decision the rules produce, not that a correction reaches the database.

The suite was checked against a deliberately introduced regression rather than assumed to
work: dropping the schedule timezone from the overtime calculation fails the timezone case
and passes everything else. That case is written so the same instant is evaluated against
both a Manila and a New York shift, which stops it from passing by coincidence on a machine
whose local zone already matches the schedule.

## Security

- [x] Employee accessing another employee
- [x] Employee attempting HR action
- [x] Unauthorized API request
- [x] Invalid session
- [x] RLS verification

All covered by `pnpm db:verify-rls`. "Invalid session" is exercised as the anonymous case:
a client holding no valid session reads nothing from any table.

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