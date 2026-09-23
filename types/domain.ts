// Domain types mirroring the schema in docs/database.md.
//
// Field names are snake_case to match the database columns exactly, so these line up 1:1
// with the Supabase-generated types in database.types.ts once the schema is applied and
// no mapping layer is needed between the two.

export type Role = "employee" | "hr" | "admin";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "undertime"
  | "incomplete"
  | "on_leave"
  | "rest_day";

export type CorrectionRequestStatus =
  | "submitted"
  | "ai_reviewing"
  | "pending_hr"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export type AiDecision =
  | "auto_approve"
  | "requires_hr_approval"
  | "reject"
  | "needs_clarification";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ActorType = "employee" | "hr" | "admin" | "ai_agent" | "system";

export type Department = {
  id: string;
  name: string;
  description: string | null;
};

export type Employee = {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string | null;
  position: string | null;
  employment_status: string;
};

export type Profile = {
  id: string;
  employee_id: string | null;
  role: Role;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
};

export type AttendanceRecord = {
  id: string;
  employee_id: string;
  /** Calendar date, YYYY-MM-DD. */
  attendance_date: string;
  /** ISO 8601 timestamp, or null when the punch is missing. */
  clock_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  source: string | null;
  notes: string | null;
};

export type WorkSchedule = {
  id: string;
  employee_id: string;
  /** 0 = Sunday through 6 = Saturday. */
  day_of_week: number;
  /** Wall-clock time, HH:MM:SS, interpreted in `timezone`. */
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  effective_from: string;
  effective_until: string | null;
};

export type CorrectionRequest = {
  id: string;
  employee_id: string;
  attendance_record_id: string | null;
  requested_date: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  employee_reason: string;
  status: CorrectionRequestStatus;
  ai_decision: AiDecision | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  completed_at: string | null;
};

export type ApprovalRequest = {
  id: string;
  correction_request_id: string;
  approver_id: string;
  status: ApprovalStatus;
  comment: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type AuditLog = {
  id: string;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
