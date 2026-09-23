-- Rate limiting for actions that are expensive or abusable.
--
-- Backed by a table rather than process memory on purpose: the application runs on
-- serverless functions, where each instance has its own memory and an in-memory counter
-- would reset constantly and never see requests handled by a sibling instance.

create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  -- Namespaced identifier, for example "analyze:<user id>", so one limit cannot consume
  -- another's budget.
  subject text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_subject_idx
  on public.rate_limit_events (subject, created_at desc);

-- RLS on with no policies at all: this table is service-role only. It holds no user data
-- worth reading, and letting a client see or write it would defeat the limit.
alter table public.rate_limit_events enable row level security;
