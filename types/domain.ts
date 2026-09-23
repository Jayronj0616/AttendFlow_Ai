// Domain aliases derived from the database schema, so a column change surfaces as a type
// error rather than a silent mismatch. Import these rather than reaching into Database
// directly — it keeps call sites readable and survives regenerating database.types.ts.

import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type Role = Enums["user_role"];
export type AttendanceStatus = Enums["attendance_status"];
export type CorrectionRequestStatus = Enums["correction_status"];
export type AiDecision = Enums["ai_decision"];
export type ApprovalStatus = Enums["approval_status"];
export type ActorType = Enums["actor_type"];

export type Department = Tables["departments"]["Row"];
export type Employee = Tables["employees"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type AttendanceRecord = Tables["attendance_records"]["Row"];
export type WorkSchedule = Tables["work_schedules"]["Row"];
export type AttendanceRule = Tables["attendance_rules"]["Row"];
export type CorrectionRequest = Tables["correction_requests"]["Row"];
export type ApprovalRequest = Tables["approval_requests"]["Row"];
export type AuditLog = Tables["audit_logs"]["Row"];
export type Notification = Tables["notifications"]["Row"];

export type NewCorrectionRequest = Tables["correction_requests"]["Insert"];
