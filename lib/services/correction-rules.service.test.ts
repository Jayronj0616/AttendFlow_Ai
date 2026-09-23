import { describe, expect, it } from "vitest";

import {
  evaluateCorrection,
  type AttendanceRuleConfig,
  type CorrectionEvaluationInput,
} from "@/lib/services/correction-rules.service";
import type { AttendanceRecord, WorkSchedule } from "@/types/domain";

const TODAY = "2026-09-23";
const IN_SCOPE_DATE = "2026-09-22";

const rules: AttendanceRuleConfig = {
  maximum_auto_corrections: 2,
  overtime_threshold_minutes: 60,
  correction_submission_deadline_days: 14,
  locked_payroll_periods: [{ start: "2026-09-01", end: "2026-09-15" }],
};

const schedule: WorkSchedule = {
  id: "sched-2",
  employee_id: "emp-1",
  day_of_week: 2,
  scheduled_start: "08:00:00",
  scheduled_end: "17:00:00",
  timezone: "Asia/Manila",
  effective_from: "2026-01-01",
  effective_until: null,
};

const at = (date: string, time: string) => `${date}T${time}+08:00`;

function record(overrides: Partial<AttendanceRecord> = {}): AttendanceRecord {
  return {
    id: "att-1",
    employee_id: "emp-1",
    attendance_date: IN_SCOPE_DATE,
    clock_in: at(IN_SCOPE_DATE, "08:01:00"),
    clock_out: null,
    status: "incomplete",
    source: "biometric",
    notes: null,
    ...overrides,
  };
}

function input(
  overrides: Partial<CorrectionEvaluationInput> = {},
): CorrectionEvaluationInput {
  return {
    requested_date: IN_SCOPE_DATE,
    requested_clock_in: null,
    requested_clock_out: at(IN_SCOPE_DATE, "17:10:00"),
    existing: null,
    schedule,
    corrections_this_month: 0,
    today: TODAY,
    rules,
    ...overrides,
  };
}

const codes = (result: ReturnType<typeof evaluateCorrection>) =>
  result.triggered_rules.map((rule) => rule.code);

describe("evaluateCorrection", () => {
  it("auto-approves a correction that trips no rule", () => {
    const result = evaluateCorrection(input());

    expect(result.decision).toBe("auto_approve");
    expect(result.triggered_rules).toHaveLength(0);
  });

  describe("missing information", () => {
    it("asks for clarification when neither punch is supplied", () => {
      const result = evaluateCorrection(
        input({ requested_clock_in: null, requested_clock_out: null }),
      );

      expect(result.decision).toBe("needs_clarification");
      expect(codes(result)).toContain("missing_requested_time");
    });

    it("accepts a clock-in only correction", () => {
      const result = evaluateCorrection(
        input({
          requested_clock_in: at(IN_SCOPE_DATE, "08:00:00"),
          requested_clock_out: null,
        }),
      );

      expect(result.decision).toBe("auto_approve");
    });
  });

  describe("filing window", () => {
    it("rejects a date that has not happened yet", () => {
      const result = evaluateCorrection(
        input({
          requested_date: "2026-09-30",
          requested_clock_out: at("2026-09-30", "17:10:00"),
        }),
      );

      expect(result.decision).toBe("reject");
      expect(codes(result)).toContain("future_attendance_date");
    });

    it("rejects a correction filed after the deadline", () => {
      const result = evaluateCorrection(
        input({
          requested_date: "2026-08-20",
          requested_clock_out: at("2026-08-20", "17:10:00"),
        }),
      );

      expect(result.decision).toBe("reject");
      expect(codes(result)).toContain("correction_submission_deadline");
    });

    it("allows a correction filed exactly on the deadline", () => {
      const result = evaluateCorrection(
        input({
          requested_date: "2026-09-09",
          requested_clock_out: at("2026-09-09", "17:10:00"),
          rules: { ...rules, locked_payroll_periods: [] },
        }),
      );

      expect(result.decision).toBe("auto_approve");
    });
  });

  describe("payroll lock", () => {
    it("escalates a date inside a locked period", () => {
      const result = evaluateCorrection(
        input({
          requested_date: "2026-09-11",
          requested_clock_out: at("2026-09-11", "17:00:00"),
        }),
      );

      expect(result.decision).toBe("requires_hr_approval");
      expect(codes(result)).toContain("locked_payroll_period");
    });

    it("treats the closing day of a locked period as locked", () => {
      const result = evaluateCorrection(
        input({
          requested_date: "2026-09-15",
          requested_clock_out: at("2026-09-15", "17:00:00"),
        }),
      );

      expect(codes(result)).toContain("locked_payroll_period");
    });
  });

  describe("existing attendance", () => {
    it("escalates rather than overwriting a recorded clock-out", () => {
      const result = evaluateCorrection(
        input({
          existing: record({ clock_out: at(IN_SCOPE_DATE, "17:00:00") }),
          requested_clock_out: at(IN_SCOPE_DATE, "14:00:00"),
        }),
      );

      expect(result.decision).toBe("requires_hr_approval");
      expect(codes(result)).toContain("existing_attendance_protected");
    });

    it("does not flag a conflict when the punch is simply missing", () => {
      const result = evaluateCorrection(
        input({ existing: record({ clock_out: null }) }),
      );

      expect(result.decision).toBe("auto_approve");
      expect(codes(result)).not.toContain("existing_attendance_protected");
    });

    it("does not flag a conflict when the requested value already matches", () => {
      const recorded = at(IN_SCOPE_DATE, "17:10:00");
      const result = evaluateCorrection(
        input({
          existing: record({ clock_out: recorded }),
          requested_clock_out: recorded,
        }),
      );

      expect(codes(result)).not.toContain("existing_attendance_protected");
    });

    it("flags a conflicting clock-in independently of clock-out", () => {
      const result = evaluateCorrection(
        input({
          existing: record({ clock_in: at(IN_SCOPE_DATE, "08:01:00") }),
          requested_clock_in: at(IN_SCOPE_DATE, "07:00:00"),
          requested_clock_out: null,
        }),
      );

      expect(result.decision).toBe("requires_hr_approval");
      expect(codes(result)).toContain("existing_attendance_protected");
    });
  });

  describe("overtime", () => {
    it("allows overtime within the threshold", () => {
      const result = evaluateCorrection(
        input({ requested_clock_out: at(IN_SCOPE_DATE, "17:45:00") }),
      );

      expect(result.decision).toBe("auto_approve");
    });

    it("escalates overtime past the threshold", () => {
      const result = evaluateCorrection(
        input({ requested_clock_out: at(IN_SCOPE_DATE, "22:00:00") }),
      );

      expect(result.decision).toBe("requires_hr_approval");
      expect(codes(result)).toContain("overtime_requires_approval");
    });

    /*
     * Guards the timezone conversion, and is written so it cannot pass by accident on a
     * machine whose local zone happens to match the schedule's.
     *
     * The same instant — 23:00 in Manila — is 11:00 in New York. Against a New York shift
     * ending at 17:00 that is six hours EARLY, so no overtime rule should fire. If the
     * offset were dropped and the timestamp read as local wall-clock, it would look like
     * six hours of overtime and escalate a correction that needs no approval.
     */
    it("measures overtime in the schedule's timezone, not the runtime's", () => {
      const result = evaluateCorrection(
        input({
          schedule: { ...schedule, timezone: "America/New_York" },
          requested_clock_out: at(IN_SCOPE_DATE, "23:00:00"),
        }),
      );

      expect(codes(result)).not.toContain("overtime_requires_approval");
      expect(result.decision).toBe("auto_approve");
    });

    it("escalates the same instant against a Manila shift", () => {
      const result = evaluateCorrection(
        input({ requested_clock_out: at(IN_SCOPE_DATE, "23:00:00") }),
      );

      expect(result.decision).toBe("requires_hr_approval");
      expect(codes(result)).toContain("overtime_requires_approval");
    });

    it("cannot evaluate overtime without a schedule", () => {
      const result = evaluateCorrection(
        input({
          schedule: null,
          requested_clock_out: at(IN_SCOPE_DATE, "23:00:00"),
        }),
      );

      expect(codes(result)).not.toContain("overtime_requires_approval");
    });
  });

  describe("correction limit", () => {
    it("escalates once the monthly limit is reached", () => {
      const result = evaluateCorrection(
        input({ corrections_this_month: 2 }),
      );

      expect(result.decision).toBe("requires_hr_approval");
      expect(codes(result)).toContain("maximum_auto_corrections");
    });

    it("allows a correction below the limit", () => {
      const result = evaluateCorrection(
        input({ corrections_this_month: 1 }),
      );

      expect(result.decision).toBe("auto_approve");
    });
  });

  describe("severity aggregation", () => {
    it("returns the most restrictive decision when several rules fire", () => {
      const result = evaluateCorrection(
        input({
          requested_date: "2026-08-20",
          requested_clock_out: at("2026-08-20", "23:00:00"),
          corrections_this_month: 5,
        }),
      );

      expect(result.decision).toBe("reject");
    });

    it("reports every rule that fired, not only the deciding one", () => {
      const result = evaluateCorrection(
        input({
          existing: record({ clock_out: at(IN_SCOPE_DATE, "17:00:00") }),
          requested_clock_out: at(IN_SCOPE_DATE, "22:00:00"),
        }),
      );

      expect(codes(result)).toContain("existing_attendance_protected");
      expect(codes(result)).toContain("overtime_requires_approval");
    });

    it("never auto-approves because a permissive rule was evaluated last", () => {
      const result = evaluateCorrection(
        input({
          requested_date: "2026-09-11",
          requested_clock_out: at("2026-09-11", "17:05:00"),
          corrections_this_month: 0,
        }),
      );

      expect(result.decision).toBe("requires_hr_approval");
    });
  });
});
