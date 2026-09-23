import "server-only";

import { applyPunchesToAttendance } from "@/lib/services/corrections.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AttendanceRecord,
  AuditLog,
  CorrectionRequest,
  Employee,
} from "@/types/domain";

export type RequestWithContext = {
  request: CorrectionRequest;
  employee: Employee | null;
  existing: AttendanceRecord | null;
};

/**
 * Corrections waiting on a person. Reads run through the session client, so an employee
 * calling this sees nothing — the HR policies are what widen the result, not this code.
 */
export async function getPendingApprovals(): Promise<RequestWithContext[]> {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("status", "pending_hr")
    .order("submitted_at", { ascending: true });

  return attachContext(requests ?? []);
}

export async function getEscalatedRequests(
  limit = 50,
): Promise<RequestWithContext[]> {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("ai_decision", "requires_hr_approval")
    .order("submitted_at", { ascending: false })
    .limit(limit);

  return attachContext(requests ?? []);
}

export async function getRequestDetail(
  id: string,
): Promise<RequestWithContext | null> {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!request) return null;

  const [withContext] = await attachContext([request]);
  return withContext ?? null;
}

/** Prior corrections for the same employee, so a reviewer can see a pattern. */
export async function getCorrectionHistory(
  employeeId: string,
  excludeId: string,
): Promise<CorrectionRequest[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("correction_requests")
    .select("*")
    .eq("employee_id", employeeId)
    .neq("id", excludeId)
    .order("submitted_at", { ascending: false })
    .limit(10);

  return data ?? [];
}

/** Attendance missing a punch, which is what corrections usually exist to fix. */
export async function getAttendanceExceptions(
  limit = 50,
): Promise<{ record: AttendanceRecord; employee: Employee | null }[]> {
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("status", "incomplete")
    .order("attendance_date", { ascending: false })
    .limit(limit);

  const employees = await employeesById(
    (records ?? []).map((r) => r.employee_id),
  );

  return (records ?? []).map((record) => ({
    record,
    employee: employees.get(record.employee_id) ?? null,
  }));
}

export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export type ReviewResult = { ok: true } | { ok: false; error: string };

/**
 * Approves a correction and applies it.
 *
 * The status change goes through the session client, so the staff-only RLS policy on
 * correction_requests is what authorizes the review. A role check in application code
 * alone would be the only thing standing between an employee and approving their own
 * overtime. The update is also conditional on the row still being `pending_hr`, which
 * makes it an atomic claim and stops two reviewers double-applying the same correction.
 */
export async function approveCorrection(
  requestId: string,
  reviewerId: string,
): Promise<ReviewResult> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: claimed } = await supabase
    .from("correction_requests")
    .update({ status: "approved", reviewed_by: reviewerId, reviewed_at: now })
    .eq("id", requestId)
    .eq("status", "pending_hr")
    .select()
    .maybeSingle();

  if (!claimed) {
    return {
      ok: false,
      error: "This request is no longer awaiting review, or you cannot review it.",
    };
  }

  const updated = await applyPunchesToAttendance({
    employeeId: claimed.employee_id,
    date: claimed.requested_date,
    clockIn: claimed.requested_clock_in,
    clockOut: claimed.requested_clock_out,
  });

  if (!updated) {
    // Returned to the queue rather than left approved-but-unapplied, so the attendance
    // record and the request never disagree about what happened.
    await supabase
      .from("correction_requests")
      .update({ status: "pending_hr", reviewed_by: null, reviewed_at: null })
      .eq("id", requestId);

    return {
      ok: false,
      error: "The correction could not be applied. Please try again or contact an administrator.",
    };
  }

  await admin
    .from("correction_requests")
    .update({
      status: "completed",
      attendance_record_id: updated.id,
      completed_at: now,
    })
    .eq("id", requestId);

  await resolveApproval(requestId, "approved", reviewerId, null);
  await recordReview(requestId, reviewerId, "correction_approved");
  await notifyEmployee(
    claimed.employee_id,
    "request_completed",
    "Correction approved",
    `Your correction for ${claimed.requested_date} was approved and your attendance has been updated.`,
  );

  return { ok: true };
}

export async function rejectCorrection(
  requestId: string,
  reviewerId: string,
  comment: string,
): Promise<ReviewResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: claimed } = await supabase
    .from("correction_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: now,
      completed_at: now,
    })
    .eq("id", requestId)
    .eq("status", "pending_hr")
    .select()
    .maybeSingle();

  if (!claimed) {
    return {
      ok: false,
      error: "This request is no longer awaiting review, or you cannot review it.",
    };
  }

  await resolveApproval(requestId, "rejected", reviewerId, comment);
  await recordReview(requestId, reviewerId, "correction_rejected");
  await notifyEmployee(
    claimed.employee_id,
    "request_rejected",
    "Correction rejected",
    comment || `Your correction for ${claimed.requested_date} was not approved.`,
  );

  return { ok: true };
}

async function resolveApproval(
  requestId: string,
  status: "approved" | "rejected",
  approverId: string,
  comment: string | null,
) {
  await createAdminClient()
    .from("approval_requests")
    .update({
      status,
      approver_id: approverId,
      comment,
      resolved_at: new Date().toISOString(),
    })
    .eq("correction_request_id", requestId);
}

async function recordReview(
  requestId: string,
  reviewerId: string,
  action: string,
) {
  await createAdminClient().from("audit_logs").insert({
    actor_type: "hr",
    actor_id: reviewerId,
    action,
    entity_type: "correction_request",
    entity_id: requestId,
  });
}

/** Notifications key on the profile, so the employee's profile has to be found first. */
async function notifyEmployee(
  employeeId: string,
  type: string,
  title: string,
  message: string,
) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (!profile) return;

  await admin
    .from("notifications")
    .insert({ user_id: profile.id, type, title, message });
}

async function attachContext(
  requests: CorrectionRequest[],
): Promise<RequestWithContext[]> {
  if (requests.length === 0) return [];

  const supabase = await createClient();
  const employees = await employeesById(requests.map((r) => r.employee_id));

  // Fetched in one query keyed by employee and date rather than per request, so a long
  // queue does not turn into a query per row.
  const { data: records } = await supabase
    .from("attendance_records")
    .select("*")
    .in("employee_id", [...new Set(requests.map((r) => r.employee_id))])
    .in("attendance_date", [...new Set(requests.map((r) => r.requested_date))]);

  const recordKey = (employeeId: string, date: string) => `${employeeId}|${date}`;
  const byKey = new Map(
    (records ?? []).map((record) => [
      recordKey(record.employee_id, record.attendance_date),
      record,
    ]),
  );

  return requests.map((request) => ({
    request,
    employee: employees.get(request.employee_id) ?? null,
    existing:
      byKey.get(recordKey(request.employee_id, request.requested_date)) ?? null,
  }));
}

async function employeesById(ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map<string, Employee>();

  const supabase = await createClient();
  const { data } = await supabase
    .from("employees")
    .select("*")
    .in("id", unique);

  return new Map((data ?? []).map((employee) => [employee.id, employee]));
}
