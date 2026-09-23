export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the oldest event in the window expires. Zero when allowed. */
  retryAfterSeconds: number;
};

/**
 * The rate-limit decision, with no database access.
 *
 * Kept apart from `rate-limit.service.ts` so it carries no `server-only` import and can be
 * tested directly. `now` is a parameter rather than read from the clock for the same
 * reason.
 */
export function evaluateWindow(
  events: { created_at: string }[],
  limit: number,
  windowSeconds: number,
  now: number,
): RateLimitResult {
  if (events.length < limit) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  // Fixed window: the budget frees up when the oldest event in it falls out, not when the
  // newest does. Measuring from the newest would keep a blocked caller blocked for a full
  // window every time they retried.
  const oldest = new Date(events[0].created_at).getTime();
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((oldest + windowSeconds * 1000 - now) / 1000),
  );

  return { allowed: false, retryAfterSeconds };
}
