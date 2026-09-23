"use server";

import { revalidatePath } from "next/cache";

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

function revalidateReviewViews() {
  revalidatePath("/hr/approvals");
  revalidatePath("/hr/exceptions");
  revalidatePath("/hr/audit");
  revalidatePath("/dashboard");
}

export async function approveCorrectionAction(
  requestId: string,
): Promise<ReviewResult> {
  const user = await requireStaff();
  if (!user) {
    return { ok: false, error: "You are not authorised to review corrections." };
  }

  const result = await approveCorrection(requestId, user.userId);
  if (result.ok) revalidateReviewViews();

  return result;
}

export async function rejectCorrectionAction(
  requestId: string,
  comment: string,
): Promise<ReviewResult> {
  const user = await requireStaff();
  if (!user) {
    return { ok: false, error: "You are not authorised to review corrections." };
  }

  const trimmed = comment.trim();
  if (trimmed.length < 5) {
    return {
      ok: false,
      error: "Give the employee a short reason for the rejection.",
    };
  }

  const result = await rejectCorrection(requestId, user.userId, trimmed);
  if (result.ok) revalidateReviewViews();

  return result;
}

export async function requestClarificationAction(
  requestId: string,
  comment: string,
): Promise<ReviewResult> {
  const user = await requireStaff();
  if (!user) {
    return { ok: false, error: "You are not authorised to review corrections." };
  }

  const trimmed = comment.trim();
  if (trimmed.length < 5) {
    return { ok: false, error: "Say what detail is missing." };
  }

  const result = await requestClarification(requestId, user.userId, trimmed);
  if (result.ok) revalidateReviewViews();

  return result;
}
