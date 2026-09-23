import "server-only";

import { evaluateWindow, type RateLimitResult } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export type { RateLimitResult };

/**
 * A fixed-window limiter backed by the database.
 *
 * Table-backed rather than in process memory on purpose: the application runs on
 * serverless functions, where each instance has its own memory and a counter would reset
 * constantly and never see requests handled by a sibling instance.
 *
 * Uses the admin client because `rate_limit_events` has RLS enabled with no policies — a
 * client that could read or write that table could also defeat the limit.
 *
 * Two callers hitting the boundary at the same instant can both be admitted, since the
 * count and the insert are not one atomic statement. That is acceptable here: the purpose
 * is to stop loops and runaway cost, not to enforce an exact quota.
 */
export async function checkRateLimit(
  subject: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { data: recent, error } = await admin
    .from("rate_limit_events")
    .select("created_at")
    .eq("subject", subject)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: true });

  if (error) {
    // Fails open deliberately. A limiter that blocks the product when its own storage is
    // unavailable turns a minor outage into a total one, and the risk it guards against
    // is cost rather than data loss.
    console.error("checkRateLimit: lookup failed", error);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const decision = evaluateWindow(
    recent ?? [],
    limit,
    windowSeconds,
    Date.now(),
  );
  if (!decision.allowed) return decision;

  await admin.from("rate_limit_events").insert({ subject });

  // Opportunistic cleanup so the table does not grow without bound. Best-effort rather
  // than scheduled, since a missed sweep costs only disk.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await admin.from("rate_limit_events").delete().lt("created_at", cutoff);
  }

  return decision;
}
