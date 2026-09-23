import type {
  AiDecision,
  AttendanceStatus,
  CorrectionRequestStatus,
} from "@/types/domain";

/**
 * Severity, not colour. Components map a tone onto the semantic tokens, so restyling the
 * whole app never means touching these tables.
 */
export type Tone = "success" | "warning" | "info" | "danger" | "neutral";

type Display = { label: string; tone: Tone };

export const ATTENDANCE_STATUS_DISPLAY: Record<AttendanceStatus, Display> = {
  present: { label: "Present", tone: "success" },
  late: { label: "Late", tone: "warning" },
  undertime: { label: "Undertime", tone: "warning" },
  incomplete: { label: "Incomplete", tone: "warning" },
  absent: { label: "Absent", tone: "danger" },
  on_leave: { label: "On leave", tone: "info" },
  rest_day: { label: "Rest day", tone: "neutral" },
};

export const REQUEST_STATUS_DISPLAY: Record<CorrectionRequestStatus, Display> = {
  submitted: { label: "Submitted", tone: "neutral" },
  ai_reviewing: { label: "AI reviewing", tone: "info" },
  pending_hr: { label: "HR review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

// Wording follows docs/UI_UX.md section 5. "Automatic correction" deliberately describes
// what the system did rather than what the AI decided, so a recommendation is never
// mistaken for a completed action.
export const AI_DECISION_DISPLAY: Record<AiDecision, Display> = {
  auto_approve: { label: "Automatic correction", tone: "success" },
  requires_hr_approval: { label: "HR approval required", tone: "warning" },
  needs_clarification: { label: "Needs clarification", tone: "info" },
  reject: { label: "Rejected", tone: "danger" },
};
