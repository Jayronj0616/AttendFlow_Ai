"use server";

import { revalidatePath } from "next/cache";

import { extractCorrectionRequest } from "@/lib/ai/extract-request";
import { todayInTimezone, weekdayIndex } from "@/lib/datetime";
import {
  getAttendanceForDate,
  getScheduleForDate,
} from "@/lib/services/attendance.service";
import {
  countAutoAppliedInMonth,
  submitCorrectionRequest,
} from "@/lib/services/corrections.service";
import {
  evaluateCorrection,
  type CorrectionEvaluation,
} from "@/lib/services/correction-rules.service";
import { getCurrentUser } from "@/lib/services/profile.service";
import { checkRateLimit } from "@/lib/services/rate-limit.service";
import { getAttendanceRuleConfig } from "@/lib/services/rules.service";
import {
  aiExtractionSchema,
  analyzeCorrectionSchema,
  submitCorrectionSchema,
} from "@/lib/validations/correction.schema";
import type { AttendanceRecord, WorkSchedule } from "@/types/domain";

export type CorrectionAnalysis = {
  requested_date: string | null;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  employee_reason: string;
  existing: AttendanceRecord | null;
  schedule: WorkSchedule | null;
  evaluation: CorrectionEvaluation;
};

export type AnalyzeResult =
  | { ok: true; analysis: CorrectionAnalysis }
  | { ok: false; error: string };

export async function analyzeCorrection(
  message: string,
): Promise<AnalyzeResult> {
  const user = await getCurrentUser();
  if (!user?.employee) {
    return { ok: false, error: "No employee record is linked to this account." };
  }

  const parsed = analyzeCorrectionSchema.safeParse({ message });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // Limited before any work is done. This is the path that will call a language model, so
  // an unbounded loop here is a bill as well as load.
  const limit = await checkRateLimit(`analyze:${user.userId}`, 15, 60);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Too many requests. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const today = todayInTimezone();

  // Validated at the boundary rather than trusted, because once the agent replaces the
  // placeholder this is model output and may be malformed.
  const extraction = aiExtractionSchema.safeParse(
    extractCorrectionRequest(parsed.data.message, today),
  );
  if (!extraction.success) {
    return {
      ok: false,
      error: "The request could not be interpreted. Please rephrase it.",
    };
  }

  const { requested_date, requested_clock_in, requested_clock_out } =
    extraction.data;

  const base = {
    requested_date,
    requested_clock_in,
    requested_clock_out,
    employee_reason: extraction.data.employee_reason,
  };

  if (!requested_date) {
    return {
      ok: true,
      analysis: {
        ...base,
        existing: null,
        schedule: null,
        evaluation: {
          decision: "needs_clarification",
          reason:
            "The date being corrected could not be determined from the request.",
          triggered_rules: [
            {
              code: "missing_requested_date",
              label: "Missing information",
              detail: "No attendance date was identified.",
            },
          ],
        },
      },
    };
  }

  const { existing, schedule, evaluation } = await evaluateForEmployee({
    employeeId: user.employee.id,
    requestedDate: requested_date,
    requestedClockIn: requested_clock_in,
    requestedClockOut: requested_clock_out,
    today,
  });

  return { ok: true, analysis: { ...base, existing, schedule, evaluation } };
}

export type SubmitActionResult =
  | {
      ok: true;
      decision: CorrectionEvaluation["decision"];
      duplicate: boolean;
      /** Whether attendance was actually changed, not merely what the decision allowed. */
      applied: boolean;
    }
  | { ok: false; error: string };

export async function submitCorrection(input: {
  requested_date: string;
  requested_clock_in: string | null;
  requested_clock_out: string | null;
  employee_reason: string;
}): Promise<SubmitActionResult> {
  const user = await getCurrentUser();
  if (!user?.employee) {
    return { ok: false, error: "No employee record is linked to this account." };
  }

  const parsed = submitCorrectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // Re-evaluated here rather than carried over from the analysis step. The browser could
  // send any decision it liked, and a correction must never be approved on that basis.
  const { existing, evaluation } = await evaluateForEmployee({
    employeeId: user.employee.id,
    requestedDate: parsed.data.requested_date,
    requestedClockIn: parsed.data.requested_clock_in,
    requestedClockOut: parsed.data.requested_clock_out,
    today: todayInTimezone(),
  });

  const result = await submitCorrectionRequest({
    employeeId: user.employee.id,
    userId: user.userId,
    requestedDate: parsed.data.requested_date,
    requestedClockIn: parsed.data.requested_clock_in,
    requestedClockOut: parsed.data.requested_clock_out,
    employeeReason: parsed.data.employee_reason,
    attendanceRecordId: existing?.id ?? null,
    evaluation,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/dashboard");
  revalidatePath("/corrections");
  revalidatePath("/attendance");
  revalidatePath("/notifications");

  return {
    ok: true,
    decision: evaluation.decision,
    duplicate: result.duplicate,
    applied: result.applied,
  };
}

async function evaluateForEmployee(params: {
  employeeId: string;
  requestedDate: string;
  requestedClockIn: string | null;
  requestedClockOut: string | null;
  today: string;
}) {
  const [existing, schedule, rules, correctionsThisMonth] = await Promise.all([
    getAttendanceForDate(params.employeeId, params.requestedDate),
    getScheduleForDate(
      params.employeeId,
      params.requestedDate,
      weekdayIndex(params.requestedDate),
    ),
    getAttendanceRuleConfig(),
    countAutoAppliedInMonth(params.employeeId, params.requestedDate.slice(0, 7)),
  ]);

  const evaluation = evaluateCorrection({
    requested_date: params.requestedDate,
    requested_clock_in: params.requestedClockIn,
    requested_clock_out: params.requestedClockOut,
    existing,
    // Passed through as null when absent. The rule engine treats a missing schedule as
    // "overtime cannot be assessed" rather than assuming a default shift.
    schedule,
    corrections_this_month: correctionsThisMonth,
    today: params.today,
    rules,
  });

  return { existing, schedule, evaluation };
}
