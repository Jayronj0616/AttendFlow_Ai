"use server";

import { extractCorrectionRequest } from "@/lib/ai/extract-request";
import {
  MOCK_TODAY,
  mockAttendance,
  mockAttendanceRules,
  mockCorrectionRequests,
  mockSchedule,
} from "@/lib/mock/data";
import {
  evaluateCorrection,
  type CorrectionEvaluation,
} from "@/lib/services/correction-rules.service";
import { weekdayIndex } from "@/lib/datetime";
import {
  aiExtractionSchema,
  analyzeCorrectionSchema,
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
  const parsed = analyzeCorrectionSchema.safeParse({ message });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // Validated at the boundary rather than trusted, because once the agent replaces the
  // placeholder this is model output and may be malformed.
  const extraction = aiExtractionSchema.safeParse(
    extractCorrectionRequest(parsed.data.message, MOCK_TODAY),
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

  const existing =
    mockAttendance.find((r) => r.attendance_date === requested_date) ?? null;
  const schedule =
    mockSchedule.find((s) => s.day_of_week === weekdayIndex(requested_date)) ??
    null;

  const evaluation = evaluateCorrection({
    requested_date,
    requested_clock_in,
    requested_clock_out,
    existing,
    schedule,
    corrections_this_month: countAutomaticCorrectionsThisMonth(requested_date),
    today: MOCK_TODAY,
    rules: mockAttendanceRules,
  });

  return { ok: true, analysis: { ...base, existing, schedule, evaluation } };
}

function countAutomaticCorrectionsThisMonth(date: string) {
  const month = date.slice(0, 7);

  return mockCorrectionRequests.filter(
    (request) =>
      request.ai_decision === "auto_approve" &&
      request.status === "completed" &&
      request.requested_date.slice(0, 7) === month,
  ).length;
}
