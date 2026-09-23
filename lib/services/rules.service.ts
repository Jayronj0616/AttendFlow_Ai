import "server-only";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { AttendanceRuleConfig } from "@/lib/services/correction-rules.service";

const maximumAutoCorrections = z.object({ limit: z.number().int().min(0) });
const overtimeApproval = z.object({ threshold_minutes: z.number().int().min(0) });
const submissionDeadline = z.object({ days: z.number().int().min(0) });
const lockedPeriods = z.object({
  periods: z.array(z.object({ start: z.string(), end: z.string() })),
});

/**
 * Defaults used when a rule row is missing, inactive, or malformed.
 *
 * The two approval gates fail closed — a limit of zero and a zero-minute overtime
 * threshold both route every correction to HR. Losing a config row should never quietly
 * widen what the system approves on its own.
 *
 * The deadline and lock list fail open instead, because a missing row there is not
 * evidence that a request is late or that a period is frozen, and rejecting on absent
 * configuration would refuse legitimate corrections.
 */
const FALLBACK: AttendanceRuleConfig = {
  maximum_auto_corrections: 0,
  overtime_threshold_minutes: 0,
  correction_submission_deadline_days: 365,
  locked_payroll_periods: [],
};

export async function getAttendanceRuleConfig(): Promise<AttendanceRuleConfig> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("attendance_rules")
    .select("rule_code, configuration")
    .eq("is_active", true);

  const byCode = new Map(
    (data ?? []).map((rule) => [rule.rule_code, rule.configuration]),
  );

  // Parsed rather than cast: this column is jsonb, so its contents are untyped as far as
  // the database is concerned and a hand-edited row could hold anything.
  const limit = maximumAutoCorrections.safeParse(
    byCode.get("maximum_auto_corrections"),
  );
  const overtime = overtimeApproval.safeParse(
    byCode.get("overtime_requires_approval"),
  );
  const deadline = submissionDeadline.safeParse(
    byCode.get("correction_submission_deadline"),
  );
  const locked = lockedPeriods.safeParse(byCode.get("locked_payroll_period"));

  return {
    maximum_auto_corrections: limit.success
      ? limit.data.limit
      : FALLBACK.maximum_auto_corrections,
    overtime_threshold_minutes: overtime.success
      ? overtime.data.threshold_minutes
      : FALLBACK.overtime_threshold_minutes,
    correction_submission_deadline_days: deadline.success
      ? deadline.data.days
      : FALLBACK.correction_submission_deadline_days,
    locked_payroll_periods: locked.success
      ? locked.data.periods
      : FALLBACK.locked_payroll_periods,
  };
}
