// Mirrors supabase/migrations. Maintained by hand for now.
//
// `pnpm db:types` regenerates this from the hosted project once SUPABASE_ACCESS_TOKEN is
// set. Until then, treat the migration files as the source of truth and update this file
// in the same commit as any schema change.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type UserRole = "employee" | "hr" | "admin";

type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "undertime"
  | "incomplete"
  | "on_leave"
  | "rest_day";

type CorrectionStatus =
  | "submitted"
  | "ai_reviewing"
  | "pending_hr"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

type AiDecisionValue =
  | "auto_approve"
  | "requires_hr_approval"
  | "reject"
  | "needs_clarification";

type ApprovalStatus = "pending" | "approved" | "rejected";

type ActorType = "employee" | "hr" | "admin" | "ai_agent" | "system";

type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeRow = {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: string | null;
  position: string | null;
  employment_status: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  employee_id: string | null;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AttendanceRecordRow = {
  id: string;
  employee_id: string;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type WorkScheduleRow = {
  id: string;
  employee_id: string;
  day_of_week: number;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  effective_from: string;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
};

type AttendanceRuleRow = {
  id: string;
  rule_code: string;
  rule_name: string;
  description: string | null;
  configuration: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CorrectionRequestRow = {
  id: string;
  employee_id: string;
  attendance_record_id: string | null;
  requested_date: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  employee_reason: string;
  status: CorrectionStatus;
  ai_decision: AiDecisionValue | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  idempotency_key: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type ApprovalRequestRow = {
  id: string;
  correction_request_id: string;
  approver_id: string | null;
  status: ApprovalStatus;
  comment: string | null;
  created_at: string;
  resolved_at: string | null;
};

type AiDecisionRow = {
  id: string;
  correction_request_id: string;
  agent_name: string;
  decision: AiDecisionValue;
  confidence: number | null;
  reason: string;
  tools_used: Json | null;
  input_summary: Json | null;
  output_summary: Json | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_type: ActorType;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_data: Json | null;
  new_data: Json | null;
  metadata: Json | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

/** Columns the database fills in itself, so they are never required on insert. */
type Generated = "id" | "created_at" | "updated_at";

type Table<Row, Optional extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, Extract<Generated | Optional, keyof Row>> &
    Partial<Pick<Row, Extract<Generated | Optional, keyof Row>>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      departments: Table<DepartmentRow, "description">;
      employees: Table<EmployeeRow, "department_id" | "position" | "employment_status">;
      profiles: Table<
        ProfileRow,
        "employee_id" | "role" | "first_name" | "last_name" | "email" | "is_active"
      >;
      attendance_records: Table<
        AttendanceRecordRow,
        "clock_in" | "clock_out" | "source" | "notes"
      >;
      work_schedules: Table<WorkScheduleRow, "timezone" | "effective_until">;
      attendance_rules: Table<AttendanceRuleRow, "description" | "is_active">;
      correction_requests: Table<
        CorrectionRequestRow,
        | "attendance_record_id"
        | "requested_clock_in"
        | "requested_clock_out"
        | "status"
        | "ai_decision"
        | "ai_confidence"
        | "ai_reason"
        | "idempotency_key"
        | "submitted_at"
        | "reviewed_at"
        | "reviewed_by"
        | "completed_at"
      >;
      approval_requests: Table<
        ApprovalRequestRow,
        "approver_id" | "status" | "comment" | "resolved_at"
      >;
      ai_decisions: Table<
        AiDecisionRow,
        "confidence" | "tools_used" | "input_summary" | "output_summary"
      >;
      audit_logs: Table<
        AuditLogRow,
        "actor_id" | "entity_id" | "previous_data" | "new_data" | "metadata"
      >;
      notifications: Table<NotificationRow, "is_read">;
    };
    Views: Record<string, never>;
    Functions: {
      auth_user_role: { Args: Record<string, never>; Returns: UserRole };
      auth_employee_id: { Args: Record<string, never>; Returns: string };
      auth_is_staff: { Args: Record<string, never>; Returns: boolean };
      auth_is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
      attendance_status: AttendanceStatus;
      correction_status: CorrectionStatus;
      ai_decision: AiDecisionValue;
      approval_status: ApprovalStatus;
      actor_type: ActorType;
    };
    CompositeTypes: Record<string, never>;
  };
};
