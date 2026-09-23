"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  approveCorrection,
  rejectCorrection,
  requestClarification,
  type ReviewResult,
} from "@/lib/services/hr.service";
import { getCurrentUser } from "@/lib/services/profile.service";

/**
 * Role is checked here as well as by RLS. The database is what actually enforces it, but
 * failing early gives the reviewer a clear message instead of an empty update result.
 */
async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.profile.role !== "hr" && user.profile.role !== "admin") return null;
  return user;
}

/**
 * Request ids arrive from a client-supplied argument rather than a typed route, so they
 * are checked before reaching a query. A malformed value would otherwise be sent to
 * Postgres as a uuid comparison and surface as a raw database error.
 */
const requestId = z.uuid();

function revalidateReviewViews() {
  revalidatePath("/hr/approvals");
  revalidatePath("/hr/exceptions");
  revalidatePath("/hr/audit");
  revalidatePath("/dashboard");
}

export async function approveCorrectionAction(
  id: string,
): Promise<ReviewResult> {
  const user = await requireStaff();
  if (!user) {
    return { ok: false, error: "You are not authorised to review corrections." };
  }

  const parsed = requestId.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: "That correction could not be found." };
  }

  const result = await approveCorrection(parsed.data, user.userId);
  if (result.ok) revalidateReviewViews();

  return result;
}

export async function rejectCorrectionAction(
  id: string,
  comment: string,
): Promise<ReviewResult> {
  const user = await requireStaff();
  if (!user) {
    return { ok: false, error: "You are not authorised to review corrections." };
  }

  const parsed = requestId.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: "That correction could not be found." };
  }

  const trimmed = comment.trim();
  if (trimmed.length < 5) {
    return {
      ok: false,
      error: "Give the employee a short reason for the rejection.",
    };
  }

  const result = await rejectCorrection(parsed.data, user.userId, trimmed);
  if (result.ok) revalidateReviewViews();

  return result;
}

export async function requestClarificationAction(
  id: string,
  comment: string,
): Promise<ReviewResult> {
  const user = await requireStaff();
  if (!user) {
    return { ok: false, error: "You are not authorised to review corrections." };
  }

  const parsed = requestId.safeParse(id);
  if (!parsed.success) {
    return { ok: false, error: "That correction could not be found." };
  }

  const trimmed = comment.trim();
  if (trimmed.length < 5) {
    return { ok: false, error: "Say what detail is missing." };
  }

  const result = await requestClarification(parsed.data, user.userId, trimmed);
  if (result.ok) revalidateReviewViews();

  return result;
}
