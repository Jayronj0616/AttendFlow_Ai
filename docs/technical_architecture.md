# AttendFlow AI — Technical Architecture

## 1. Technology Stack

### Frontend

Next.js

React

TypeScript

Tailwind CSS

---

### Backend

Next.js App Router

Server Actions and/or Route Handlers where appropriate.

Business logic must remain server-side.

---

### Database

Supabase PostgreSQL

---

### Authentication

Supabase Auth

Use authenticated sessions.

---

### Deployment

Vercel

The application must be designed for Vercel serverless deployment.

---

# 2. High-Level Architecture

Browser
↓
Next.js
↓
Authentication
↓
Server-side application logic
↓
AI Agent Orchestrator
↓
Controlled Tools
↓
Supabase PostgreSQL

---

# 3. AI Agent Architecture

Employee Request
↓
Agent Orchestrator
↓
Intent Extraction
↓
Context Retrieval
↓
Business Rule Evaluation
↓
AI Decision
↓
Controlled Tool
↓
Server-side Validation
↓
Database
↓
Audit Log
↓
Notification

---

# 4. AI Tool Layer

The agent may use tools such as:

get_current_employee()

get_attendance_record()

get_work_schedule()

get_correction_history()

get_attendance_rules()

evaluate_correction()

create_correction_request()

request_hr_approval()

notify_employee()

The exact tool list may evolve during implementation.

---

# 5. Tool Security

Every tool must:

1. Verify authentication.
2. Verify user role.
3. Verify resource ownership.
4. Validate inputs.
5. Apply business rules.
6. Perform the minimum required operation.
7. Log important actions.

---

# 6. Database Security

Never expose the Supabase service role key to the browser.

The service role key must only exist in server-side environment variables.

Use Supabase Row Level Security.

Frontend authorization must never be considered sufficient security.

---

# 7. Business Rules

Critical business rules must be implemented deterministically in application code.

Examples:

- Maximum correction limit
- Payroll lock
- Overtime approval
- Existing attendance protection
- Employee authorization

The LLM may interpret natural language, but it must not be the final authority over deterministic business rules.

---

# 8. AI Output Validation

AI output must use structured data.

Example:

{
  "decision": "requires_hr_approval",
  "requested_date": "2026-09-22",
  "requested_clock_out": "17:10",
  "reason": "Requested correction requires HR review."
}

The application must validate the AI response before using it.

Invalid AI output must not trigger database changes.

---

# 9. Error Handling

Handle:

- AI provider failures
- Supabase errors
- Authentication failures
- Tool failures
- Validation errors
- Rate limits
- Network errors

Never silently fail.

---

# 10. Idempotency

Operations that modify attendance must be designed to prevent duplicate execution.

For example:

Submitting the same correction twice must not create duplicate corrections.

---

# 11. Environment Variables

Local `.env.local` may contain:

NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

AI_PROVIDER_API_KEY=

Never commit `.env.local`.

For production, configure equivalent variables in Vercel.

---

# 12. Vercel Requirements

Avoid architecture that depends on:

- Persistent local filesystem
- Long-running local processes
- In-memory application state
- Server-specific storage

Use:

- Supabase for persistence
- Vercel-compatible server-side functions
- External services for durable storage

---

# 13. Project Structure

Recommended structure:

app/
components/
lib/
services/
types/
hooks/
utils/

AI-related logic should be isolated from UI components.

Database access should be isolated from AI prompts.

Business rules should be reusable independently of the UI.

---

# 14. Production Principles

Use:

- TypeScript strict mode
- Server-side validation
- Input validation
- RBAC
- RLS
- Secure environment variables
- Error handling
- Audit logging
- Structured AI output
- Human approval for sensitive actions
- Vercel-compatible architecture

Avoid:

- Hardcoded credentials
- Client-side secrets
- Direct unrestricted AI database access
- AI-only authorization
- Trusting raw LLM output
- Unnecessary dependencies
- Over-engineering