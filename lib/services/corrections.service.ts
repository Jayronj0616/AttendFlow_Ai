import "server-only";

import { isSameInstant } from "@/lib/datetime";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CorrectionEvaluation } from "@/lib/services/correction-rules.service";
import type { AttendanceRecord, CorrectionRequest } from "@/types/domain";

export async function getCorrectionRequests(
  employeeId: string,
): Promise<CorrectionRequest[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .order("submitted_at", { ascending: false });

  return data ?? [];
}

/** Corrections already applied automatically in the calendar month of `month` (YYYY-MM). */
export async function countAutoAppliedInMonth(
  employeeId: string,
  month: string,
): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("correction_requests")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", employeeId)
    .eq("ai_decision", "auto_approve")
    .eq("status", "completed")
    .gte("requested_date", `${month}-01`)
    .lt("requested_date", nextMonth(month));

  return count ?? 0;
}

export type SubmitParams = {
  employeeId: string;
  userId: string;
  requestedDate: string;
  requestedClockIn: string | null;
  requestedClockOut: string | null;
  employeeReason: string;
  attendanceRecordId: string | null;
  evaluation: CorrectionEvaluation;
};

export type SubmitResult =
  | {
      ok: true;
      request: CorrectionRequest;
      duplicate: boolean;
      /** False when the decision was automatic but the write did not land and it escalated. */
      applied: boolean;
    }
  | { ok: false; error: string };

/**
 * Files a correction and carries out whatever its decision implies.
 *
 * The evaluation passed in is always recomputed by the caller on the server. A decision
 * arriving from the browser is a claim, not a fact, and acting on one would let anyone
 * auto-approve their own overtime by editing a request payload.
 */
export async function submitCorrectionRequest(
  params: SubmitParams,
): Promise<SubmitResult> {
  const decision = params.evaluation.decision;

  if (decision === "reject" || decision === "needs_clarification") {
    return {
      ok: false,
      error:
        decision === "reject"
          ? "This request cannot be filed as an attendance correction."
          : "Some details are still missing. Add them and analyse again.",
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Derived rather than client-supplied, so the same correction submitted twice collapses
  // onto one row no matter which tab or device it came from.
  const idempotencyKey = [
    params.employeeId,
    params.requestedDate,
    params.requestedClockIn ?? "-",
    params.requestedClockOut ?? "-",
  ].join("|");

  const { data: existing } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return {
      ok: true,
      request: existing,
      duplicate: true,
      applied: existing.status === "completed",
    };
  }

  const autoApproved = decision === "auto_approve";

  const { data: request, error } = await supabase
    .from("correction_requests")
    .insert({
      employee_id: params.employeeId,
      attendance_record_id: params.attendanceRecordId,
      requested_date: params.requestedDate,
      requested_clock_in: params.requestedClockIn,
      requested_clock_out: params.requestedClockOut,
      employee_reason: params.employeeReason,
      status: autoApproved ? "approved" : "pending_hr",
      ai_decision: decision,
      ai_reason: params.evaluation.reason,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (error || !request) {
    // Logged rather than swallowed. The employee gets a safe message, but a failure that
    // leaves no trace is impossible to diagnose later.
    console.error("submitCorrectionRequest: insert failed", error);
    return {
      ok: false,
      error: "The correction could not be completed. Please try again or contact HR.",
    };
  }

  await admin.from("ai_decisions").insert({
    correction_request_id: request.id,
    agent_name: "attendance-rules",
    decision,
    reason: params.evaluation.reason,
    output_summary: { triggered_rules: params.evaluation.triggered_rules },
  });

  let appliedAutomatically = autoApproved;

  if (autoApproved) {
    appliedAutomatically = await applyCorrection(params, request.id);

    if (!appliedAutomatically) {
      // The write did not land, so the request must not be left approved-but-unapplied.
      // Leaving it in that state would also make a retry look like a duplicate and
      // silently do nothing. Escalating puts a person on it instead.
      await admin
        .from("correction_requests")
        .update({ status: "pending_hr", ai_reason: `${params.evaluation.reason} The automatic update did not complete, so this was sent for review.` })
        .eq("id", request.id);

      await admin.from("approval_requests").insert({
        correction_request_id: request.id,
        status: "pending",
      });

      await admin.from("audit_logs").insert({
        actor_type: "system",
        action: "correction_apply_failed",
        entity_type: "correction_request",
        entity_id: request.id,
      });
    }
  } else {
    await admin.from("approval_requests").insert({
      correction_request_id: request.id,
      status: "pending",
    });
  }

  await admin.from("audit_logs").insert({
    actor_type: "employee",
    actor_id: params.userId,
    action: appliedAutomatically
      ? "correction_auto_applied"
      : "correction_escalated",
    entity_type: "correction_request",
    entity_id: request.id,
    new_data: {
      requested_date: params.requestedDate,
      requested_clock_in: params.requestedClockIn,
      requested_clock_out: params.requestedClockOut,
      decision,
    },
  });

  await admin.from("notifications").insert({
    user_id: params.userId,
    type: appliedAutomatically ? "request_completed" : "approval_required",
    title: appliedAutomatically ? "Correction applied" : "Sent to HR for review",
    message: appliedAutomatically
      ? `Your attendance for ${params.requestedDate} has been updated.`
      : `Your correction for ${params.requestedDate} needs HR approval.`,
  });

  const { data: finalRequest } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("id", request.id)
    .single();

  return {
    ok: true,
    request: finalRequest ?? request,
    duplicate: false,
    applied: appliedAutomatically,
  };
}

/**
 * Writes the corrected punches, then reads the row back and confirms it holds the values
 * that were asked for. docs/system_flow.md section 14 requires the result to be verified
 * rather than assumed, and success is never reported on the strength of a write returning
 * without an error.
 *
 * Shared by the automatic path and by HR approval, deliberately: the verification is the
 * part that must not drift between them.
 */
export async function applyPunchesToAttendance(params: {
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
}): Promise<AttendanceRecord | null> {
  const admin = createAdminClient();

  const patch: Record<string, string> = {};
  if (params.clockIn) patch.clock_in = params.clockIn;
  if (params.clockOut) patch.clock_out = params.clockOut;

  const { data: updated, error } = await admin
    .from("attendance_records")
    .update({ ...patch, status: "present", source: "correction" })
    .eq("employee_id", params.employeeId)
    .eq("attendance_date", params.date)
    .select()
    .maybeSingle();

  if (error || !updated) {
    console.error("applyPunchesToAttendance: update failed", error);
    return null;
  }

  // Compared as instants. Postgres returns its own timestamp spelling, which will not
  // match the string that was sent even when the value is identical.
  const matches =
    (!params.clockIn || isSameInstant(updated.clock_in, params.clockIn)) &&
    (!params.clockOut || isSameInstant(updated.clock_out, params.clockOut));

  if (!matches) {
    console.error("applyPunchesToAttendance: stored values did not match", {
      requested: { clock_in: params.clockIn, clock_out: params.clockOut },
      stored: { clock_in: updated.clock_in, clock_out: updated.clock_out },
    });
    return null;
  }

  return updated;
}

async function applyCorrection(
  params: SubmitParams,
  requestId: string,
): Promise<boolean> {
  const updated = await applyPunchesToAttendance({
    employeeId: params.employeeId,
    date: params.requestedDate,
    clockIn: params.requestedClockIn,
    clockOut: params.requestedClockOut,
  });

  if (!updated) return false;

  await createAdminClient()
    .from("correction_requests")
    .update({
      status: "completed",
      attendance_record_id: updated.id,
      completed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  return true;
}

function nextMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return m === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(m + 1).padStart(2, "0")}-01`;
}
