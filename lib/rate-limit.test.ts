import { describe, expect, it } from "vitest";

import { evaluateWindow } from "@/lib/rate-limit";

const NOW = Date.parse("2026-09-24T12:00:00Z");

/** `secondsAgo` events, oldest first, matching the order the query returns them in. */
function events(...secondsAgo: number[]) {
  return secondsAgo.map((seconds) => ({
    created_at: new Date(NOW - seconds * 1000).toISOString(),
  }));
}

describe("evaluateWindow", () => {
  it("allows a first request", () => {
    expect(evaluateWindow([], 3, 60, NOW)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("allows while under the limit", () => {
    const result = evaluateWindow(events(30, 10), 3, 60, NOW);
    expect(result.allowed).toBe(true);
  });

  it("blocks once the limit is reached", () => {
    const result = evaluateWindow(events(50, 30, 10), 3, 60, NOW);
    expect(result.allowed).toBe(false);
  });

  it("blocks when over the limit", () => {
    const result = evaluateWindow(events(50, 40, 30, 10), 3, 60, NOW);
    expect(result.allowed).toBe(false);
  });

  // Fixed window: the budget frees up when the OLDEST event falls out of it, not when the
  // most recent one does. Measuring from the newest would keep a blocked caller blocked
  // for a full window every time they retried.
  it("counts down from the oldest event in the window", () => {
    const result = evaluateWindow(events(50, 30, 10), 3, 60, NOW);
    expect(result.retryAfterSeconds).toBe(10);
  });

  it("never reports zero seconds while blocked", () => {
    const result = evaluateWindow(events(60, 30, 10), 3, 60, NOW);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("treats a limit of zero as blocking everything", () => {
    const result = evaluateWindow(events(5), 0, 60, NOW);
    expect(result.allowed).toBe(false);
  });
});
