# AttendFlow AI — Database Specification

## 1. Project Overview

AttendFlow AI is an AI-powered attendance correction and workforce operations system.

The application uses:

- Next.js
- React
- TypeScript
- Supabase
- PostgreSQL
- Supabase Auth
- Vercel

The database must be designed for secure multi-role access and future expansion into broader HR/workforce automation.

---

# 2. User Roles

## Employee

Can:

- View their own attendance
- Submit attendance correction requests
- View their own correction requests
- View request status
- Receive notifications

## HR

Can:

- View employee attendance
- Review correction requests
- Approve requests
- Reject requests
- Request clarification
- View AI analysis
- View audit logs

## Admin

Can:

- Manage employees
- Manage departments
- Manage schedules
- Configure attendance rules
- Manage users and roles
- View system-wide audit logs

---

# 3. Database Tables

## profiles

Connects Supabase Auth users to application roles.

Fields:

- id UUID PRIMARY KEY
- employee_id UUID NULL
- role TEXT NOT NULL
- first_name TEXT
- last_name TEXT
- email TEXT
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Roles:

- employee
- hr
- admin

The `id` must reference `auth.users.id`.

---

## employees

Fields:

- id UUID PRIMARY KEY
- employee_number TEXT UNIQUE NOT NULL
- first_name TEXT NOT NULL
- last_name TEXT NOT NULL
- email TEXT UNIQUE NOT NULL
- department_id UUID NULL
- position TEXT
- employment_status TEXT DEFAULT 'active'
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

---

## departments

Fields:

- id UUID PRIMARY KEY
- name TEXT UNIQUE NOT NULL
- description TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

---

## attendance_records

Fields:

- id UUID PRIMARY KEY
- employee_id UUID NOT NULL
- attendance_date DATE NOT NULL
- clock_in TIMESTAMPTZ NULL
- clock_out TIMESTAMPTZ NULL
- status TEXT NOT NULL
- source TEXT
- notes TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Possible statuses:

- present
- absent
- late
- undertime
- incomplete
- on_leave
- rest_day

Constraint:

One attendance record per employee per attendance date.

---

## work_schedules

Fields:

- id UUID PRIMARY KEY
- employee_id UUID NOT NULL
- day_of_week INTEGER NOT NULL
- scheduled_start TIME NOT NULL
- scheduled_end TIME NOT NULL
- timezone TEXT DEFAULT 'Asia/Manila'
- effective_from DATE NOT NULL
- effective_until DATE NULL
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

---

## attendance_rules

Stores configurable business rules.

Fields:

- id UUID PRIMARY KEY
- rule_code TEXT UNIQUE NOT NULL
- rule_name TEXT NOT NULL
- description TEXT
- configuration JSONB NOT NULL
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Examples:

- maximum_auto_corrections
- overtime_requires_approval
- locked_payroll_period
- correction_submission_deadline

Business rules must be enforced by application code.

AI output must not override these rules.

---

## correction_requests

Fields:

- id UUID PRIMARY KEY
- employee_id UUID NOT NULL
- attendance_record_id UUID NULL
- requested_date DATE NOT NULL
- requested_clock_in TIMESTAMPTZ NULL
- requested_clock_out TIMESTAMPTZ NULL
- employee_reason TEXT NOT NULL
- status TEXT NOT NULL DEFAULT 'submitted'
- ai_decision TEXT NULL
- ai_confidence NUMERIC NULL
- ai_reason TEXT NULL
- submitted_at TIMESTAMPTZ
- reviewed_at TIMESTAMPTZ NULL
- reviewed_by UUID NULL
- completed_at TIMESTAMPTZ NULL
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Statuses:

- submitted
- ai_reviewing
- pending_hr
- approved
- rejected
- completed
- cancelled

AI decisions:

- auto_approve
- requires_hr_approval
- reject
- needs_clarification

---

## approval_requests

Fields:

- id UUID PRIMARY KEY
- correction_request_id UUID NOT NULL
- approver_id UUID NOT NULL
- status TEXT NOT NULL DEFAULT 'pending'
- comment TEXT NULL
- created_at TIMESTAMPTZ
- resolved_at TIMESTAMPTZ NULL

Statuses:

- pending
- approved
- rejected

---

## ai_decisions

Stores structured AI decision information.

Fields:

- id UUID PRIMARY KEY
- correction_request_id UUID NOT NULL
- agent_name TEXT NOT NULL
- decision TEXT NOT NULL
- confidence NUMERIC NULL
- reason TEXT NOT NULL
- tools_used JSONB
- input_summary JSONB
- output_summary JSONB
- created_at TIMESTAMPTZ

Do not store unnecessary sensitive information.

---

## audit_logs

Fields:

- id UUID PRIMARY KEY
- actor_type TEXT NOT NULL
- actor_id UUID NULL
- action TEXT NOT NULL
- entity_type TEXT NOT NULL
- entity_id UUID NULL
- previous_data JSONB NULL
- new_data JSONB NULL
- metadata JSONB NULL
- created_at TIMESTAMPTZ

Actor types:

- employee
- hr
- admin
- ai_agent
- system

---

## notifications

Fields:

- id UUID PRIMARY KEY
- user_id UUID NOT NULL
- type TEXT NOT NULL
- title TEXT NOT NULL
- message TEXT NOT NULL
- is_read BOOLEAN DEFAULT false
- created_at TIMESTAMPTZ

---

# 4. Relationships

profiles → employees

employees → departments

employees → attendance_records

employees → work_schedules

employees → correction_requests

attendance_records → correction_requests

correction_requests → approval_requests

correction_requests → ai_decisions

correction_requests → audit_logs

profiles → notifications

---

# 5. Supabase Security

Use Supabase Row Level Security.

Employees:

- Can read their own profile
- Can read their own attendance
- Can create their own correction requests
- Can read their own correction requests
- Can read their own notifications

HR:

- Can read employee attendance
- Can read correction requests
- Can create/update approval requests
- Can read AI decisions
- Can read audit logs according to authorization

Admin:

- Authorized system-wide access

Never rely only on frontend authorization.

All sensitive operations must be validated server-side.

---

# 6. AI Database Access

The AI agent must NOT receive unrestricted Supabase or PostgreSQL credentials.

The AI interacts with the application through controlled server-side tools.

Example:

- get_employee_context
- get_attendance_record
- get_work_schedule
- get_correction_history
- evaluate_attendance_rules
- create_correction_request
- request_hr_approval
- notify_employee

Every tool must verify authentication and authorization.

---

# 7. Vercel Compatibility

The database must be compatible with a serverless Next.js deployment on Vercel.

Use environment variables for Supabase credentials.

Never commit:

- Supabase service role key
- API keys
- LLM keys
- private credentials

Environment variables should be configured in Vercel.

Expected variables may include:

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

AI_PROVIDER_API_KEY

Only expose variables beginning with `NEXT_PUBLIC_` to browser-side code.