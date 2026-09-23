-- AttendFlow AI — initial schema
--
-- Mirrors docs/database.md. One deviation: the status and role columns the specification
-- describes as TEXT are Postgres enums here. They already have fixed value lists, and an
-- enum both rejects a bad value at the database and generates a TypeScript union instead
-- of a bare `string`, which keeps decision handling exhaustively checked in application
-- code rather than only by convention.

create extension if not exists pgcrypto;

-- Enums -----------------------------------------------------------------------

create type public.user_role as enum ('employee', 'hr', 'admin');

create type public.attendance_status as enum (
  'present', 'absent', 'late', 'undertime', 'incomplete', 'on_leave', 'rest_day'
);

create type public.correction_status as enum (
  'submitted', 'ai_reviewing', 'pending_hr', 'approved', 'rejected', 'completed', 'cancelled'
);

create type public.ai_decision as enum (
  'auto_approve', 'requires_hr_approval', 'reject', 'needs_clarification'
);

create type public.approval_status as enum ('pending', 'approved', 'rejected');

create type public.actor_type as enum ('employee', 'hr', 'admin', 'ai_agent', 'system');

-- Shared triggers ---------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Tables ------------------------------------------------------------------------

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_number text unique not null,
  first_name text not null,
  last_name text not null,
  email text unique not null,
  department_id uuid references public.departments (id) on delete set null,
  position text,
  employment_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_id uuid references public.employees (id) on delete set null,
  role public.user_role not null default 'employee',
  first_name text,
  last_name text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  attendance_date date not null,
  clock_in timestamptz,
  clock_out timestamptz,
  status public.attendance_status not null,
  source text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One row per employee per day, per docs/database.md. This is what makes a correction
  -- an update rather than an insert, and stops duplicate days from being created.
  constraint attendance_records_employee_date_key unique (employee_id, attendance_date),
  constraint attendance_records_out_after_in check (
    clock_in is null or clock_out is null or clock_out > clock_in
  )
);

create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  scheduled_start time not null,
  scheduled_end time not null,
  timezone text not null default 'Asia/Manila',
  effective_from date not null,
  effective_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_schedules_effective_range check (
    effective_until is null or effective_until >= effective_from
  )
);

create table public.attendance_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text unique not null,
  rule_name text not null,
  description text,
  configuration jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  attendance_record_id uuid references public.attendance_records (id) on delete set null,
  requested_date date not null,
  requested_clock_in timestamptz,
  requested_clock_out timestamptz,
  employee_reason text not null,
  status public.correction_status not null default 'submitted',
  ai_decision public.ai_decision,
  ai_confidence numeric(4, 3) check (ai_confidence between 0 and 1),
  ai_reason text,
  -- Set by the client on submit; makes a retried submission idempotent rather than
  -- creating a second correction for the same change, per docs/technical_architecture.md.
  idempotency_key text unique,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint correction_requests_has_change check (
    requested_clock_in is not null or requested_clock_out is not null
  )
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  correction_request_id uuid not null
    references public.correction_requests (id) on delete cascade,
  approver_id uuid references public.profiles (id) on delete set null,
  status public.approval_status not null default 'pending',
  comment text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.ai_decisions (
  id uuid primary key default gen_random_uuid(),
  correction_request_id uuid not null
    references public.correction_requests (id) on delete cascade,
  agent_name text not null,
  decision public.ai_decision not null,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  reason text not null,
  tools_used jsonb,
  input_summary jsonb,
  output_summary jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type public.actor_type not null,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  previous_data jsonb,
  new_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- updated_at triggers -------------------------------------------------------------

create trigger departments_set_updated_at before update on public.departments
  for each row execute function public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger attendance_records_set_updated_at before update on public.attendance_records
  for each row execute function public.set_updated_at();
create trigger work_schedules_set_updated_at before update on public.work_schedules
  for each row execute function public.set_updated_at();
create trigger attendance_rules_set_updated_at before update on public.attendance_rules
  for each row execute function public.set_updated_at();
create trigger correction_requests_set_updated_at before update on public.correction_requests
  for each row execute function public.set_updated_at();

-- Indexes ---------------------------------------------------------------------------

create index employees_department_id_idx on public.employees (department_id);
create index profiles_employee_id_idx on public.profiles (employee_id);
create index attendance_records_date_idx on public.attendance_records (attendance_date desc);
create index attendance_records_employee_idx on public.attendance_records (employee_id, attendance_date desc);
create index work_schedules_employee_day_idx on public.work_schedules (employee_id, day_of_week);
create index correction_requests_employee_idx on public.correction_requests (employee_id, submitted_at desc);
create index correction_requests_status_idx on public.correction_requests (status);
create index approval_requests_correction_idx on public.approval_requests (correction_request_id);
create index approval_requests_pending_idx on public.approval_requests (status) where status = 'pending';
create index ai_decisions_correction_idx on public.ai_decisions (correction_request_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- Authorization helpers --------------------------------------------------------------
--
-- SECURITY DEFINER so a policy can read the caller's profile without that read being
-- filtered by the policies on `profiles` itself, which would recurse. The policies on
-- `profiles` therefore compare against auth.uid() directly and never call these.

create or replace function public.auth_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select employee_id from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) in ('hr', 'admin'),
    false
  )
$$;

create or replace function public.auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'admin',
    false
  )
$$;

-- Row Level Security -------------------------------------------------------------------
--
-- Employees reach only their own rows. Anything wider is HR or admin. Writes to attendance
-- are deliberately absent for every role: corrections are applied by the server after the
-- deterministic rules have run, never by a client statement.

alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.profiles enable row level security;
alter table public.attendance_records enable row level security;
alter table public.work_schedules enable row level security;
alter table public.attendance_rules enable row level security;
alter table public.correction_requests enable row level security;
alter table public.approval_requests enable row level security;
alter table public.ai_decisions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.auth_is_staff());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.auth_is_admin())
  with check (public.auth_is_admin());

-- departments
create policy departments_select on public.departments
  for select to authenticated using (true);

create policy departments_admin_all on public.departments
  for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- employees
create policy employees_select on public.employees
  for select to authenticated
  using (id = public.auth_employee_id() or public.auth_is_staff());

create policy employees_admin_all on public.employees
  for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- attendance_records
create policy attendance_select on public.attendance_records
  for select to authenticated
  using (employee_id = public.auth_employee_id() or public.auth_is_staff());

-- work_schedules
create policy schedules_select on public.work_schedules
  for select to authenticated
  using (employee_id = public.auth_employee_id() or public.auth_is_staff());

create policy schedules_admin_all on public.work_schedules
  for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- attendance_rules
create policy rules_select on public.attendance_rules
  for select to authenticated using (true);

create policy rules_admin_all on public.attendance_rules
  for all to authenticated
  using (public.auth_is_admin()) with check (public.auth_is_admin());

-- correction_requests
create policy corrections_select on public.correction_requests
  for select to authenticated
  using (employee_id = public.auth_employee_id() or public.auth_is_staff());

create policy corrections_insert_own on public.correction_requests
  for insert to authenticated
  with check (employee_id = public.auth_employee_id());

create policy corrections_staff_update on public.correction_requests
  for update to authenticated
  using (public.auth_is_staff()) with check (public.auth_is_staff());

-- approval_requests
create policy approvals_select on public.approval_requests
  for select to authenticated
  using (
    public.auth_is_staff()
    or exists (
      select 1 from public.correction_requests cr
      where cr.id = correction_request_id
        and cr.employee_id = public.auth_employee_id()
    )
  );

create policy approvals_staff_write on public.approval_requests
  for all to authenticated
  using (public.auth_is_staff()) with check (public.auth_is_staff());

-- ai_decisions
create policy ai_decisions_select on public.ai_decisions
  for select to authenticated
  using (
    public.auth_is_staff()
    or exists (
      select 1 from public.correction_requests cr
      where cr.id = correction_request_id
        and cr.employee_id = public.auth_employee_id()
    )
  );

-- audit_logs
create policy audit_select_staff on public.audit_logs
  for select to authenticated using (public.auth_is_staff());

-- notifications
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
