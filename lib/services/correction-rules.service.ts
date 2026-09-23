import {
  clockTimeToMinutes,
  daysBetweenDates,
  formatTime,
  minutesSinceMidnight,
} from "@/lib/datetime";
import type {
  AiDecision,
  AttendanceRecord,
  WorkSchedule,
} from "@/types/domain";

/**
 * Deterministic evaluation of an attendance correction.
 *
 * docs/technical_architecture.md section 7 places these rules above the language model in
 * authority: the model may interpret what an employee meant, but it never decides whether
 * a correction is allowed. Nothing here consults the model, and the result is reproducible
 * from its inputs alone, so the same request always resolves the same way.
 */

export type AttendanceRuleConfig = {
  /** Corrections an employee may have applied automatically in a calendar month. */
  maximum_auto_corrections: number;
  /** Minutes past the scheduled end before a correction needs human approval. */
  overtime_threshold_minutes: number;
  /** Days after the attendance date that a correction may still be filed. */
  correction_submission_deadline_days: number;
  /** Inclusive date ranges whose attendance is frozen for payroll. */
  locked_payroll_periods: { start: string; end: string }[];
};

export type TriggeredRule = {
  code: string;
  label: string;
  detail: string;
};

export type CorrectionEvaluation = {
  decision: AiDecision;
  reason: string;
  triggered_rules: TriggeredRule[];
};

export type CorrectionEvaluationInput = {
  requested_date: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  /** The attendance row already on file for that date, if any. */
  existing: AttendanceRecord | null;
  schedule: WorkSchedule | null;
  corrections_this_month: number;
  today: string;
  rules: AttendanceRuleConfig;
};

// Ordered least to most restrictive. When several rules fire, the most restrictive wins,
// so a request can never be auto-approved because a permissive rule was evaluated last.
const DECISION_SEVERITY: Record<AiDecision, number> = {
  auto_approve: 0,
  needs_clarification: 1,
  requires_hr_approval: 2,
  reject: 3,
};

export function evaluateCorrection(
  input: CorrectionEvaluationInput,
): CorrectionEvaluation {
  const findings: { decision: AiDecision; rule: TriggeredRule }[] = [];

  const timeZone = input.schedule?.timezone;

  if (!input.requested_clock_in && !input.requested_clock_out) {
    findings.push({
      decision: "needs_clarification",
      rule: {
        code: "missing_requested_time",
        label: "Missing information",
        detail: "No corrected clock-in or clock-out time was provided.",
      },
    });
  }

  const daysElapsed = daysBetweenDates(input.requested_date, input.today);

  if (daysElapsed < 0) {
    findings.push({
      decision: "reject",
      rule: {
        code: "future_attendance_date",
        label: "Future date",
        detail: "Attendance cannot be corrected for a date that has not occurred.",
      },
    });
  } else if (daysElapsed > input.rules.correction_submission_deadline_days) {
    findings.push({
      decision: "reject",
      rule: {
        code: "correction_submission_deadline",
        label: "Filing deadline passed",
        detail: `Corrections must be filed within ${input.rules.correction_submission_deadline_days} days; this request is ${daysElapsed} days late.`,
      },
    });
  }

  if (isWithinLockedPeriod(input.requested_date, input.rules)) {
    findings.push({
      decision: "requires_hr_approval",
      rule: {
        code: "locked_payroll_period",
        label: "Payroll period locked",
        detail:
          "The attendance date falls in a locked payroll period and cannot be changed automatically.",
      },
    });
  }

  for (const conflict of existingAttendanceConflicts(input, timeZone)) {
    findings.push({ decision: "requires_hr_approval", rule: conflict });
  }

  const overtime = overtimeMinutes(input, timeZone);
  if (overtime !== null && overtime > input.rules.overtime_threshold_minutes) {
    findings.push({
      decision: "requires_hr_approval",
      rule: {
        code: "overtime_requires_approval",
        label: "Overtime",
        detail: `The requested clock-out is ${formatMinutes(overtime)} past the scheduled shift end.`,
      },
    });
  }

  if (input.corrections_this_month >= input.rules.maximum_auto_corrections) {
    findings.push({
      decision: "requires_hr_approval",
      rule: {
        code: "maximum_auto_corrections",
        label: "Correction limit reached",
        detail: `This employee has already had ${input.corrections_this_month} correction(s) applied automatically this month, and the limit is ${input.rules.maximum_auto_corrections}.`,
      },
    });
  }

  const decision = findings.reduce<AiDecision>(
    (worst, finding) =>
      DECISION_SEVERITY[finding.decision] > DECISION_SEVERITY[worst]
        ? finding.decision
        : worst,
    "auto_approve",
  );

  const deciding = findings.filter((f) => f.decision === decision);

  return {
    decision,
    reason:
      deciding.length > 0
        ? deciding.map((f) => f.rule.detail).join(" ")
        : "No approval rule was triggered, so the correction can be applied automatically.",
    triggered_rules: findings.map((f) => f.rule),
  };
}

function isWithinLockedPeriod(date: string, rules: AttendanceRuleConfig) {
  return rules.locked_payroll_periods.some(
    (period) => date >= period.start && date <= period.end,
  );
}

function existingAttendanceConflicts(
  input: CorrectionEvaluationInput,
  timeZone: string | undefined,
): TriggeredRule[] {
  const existing = input.existing;
  if (!existing) return [];

  const conflicts: TriggeredRule[] = [];

  // A punch that is already recorded is never silently overwritten. Replacing one is a
  // judgement call about which record is true, which is a person's decision, not a rule's.
  const pairs = [
    ["clock-in", existing.clock_in, input.requested_clock_in],
    ["clock-out", existing.clock_out, input.requested_clock_out],
  ] as const;

  for (const [label, current, requested] of pairs) {
    if (current && requested && current !== requested) {
      conflicts.push({
        code: "existing_attendance_protected",
        label: "Existing attendance",
        detail: `A ${label} of ${formatTime(current, timeZone)} is already recorded and would be replaced by ${formatTime(requested, timeZone)}.`,
      });
    }
  }

  return conflicts;
}

function overtimeMinutes(
  input: CorrectionEvaluationInput,
  timeZone: string | undefined,
) {
  if (!input.requested_clock_out || !input.schedule) return null;

  const requested = minutesSinceMidnight(input.requested_clock_out, timeZone);
  const scheduledEnd = clockTimeToMinutes(input.schedule.scheduled_end);
  return requested - scheduledEnd;
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} minutes`;
  if (rest === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours}h ${rest}m`;
}
