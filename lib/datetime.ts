/**
 * Attendance times are always rendered in the employee's scheduled timezone, never the
 * viewer's. Pinning it also keeps server and client output identical, which is what stops
 * the timestamps from tripping hydration mismatches.
 *
 * Defaults to the `work_schedules.timezone` default in docs/database.md. Once schedules are
 * loaded for real, pass the employee's own timezone through instead of relying on this.
 */
export const DEFAULT_TIMEZONE = "Asia/Manila";

export const EMPTY_VALUE = "—";

export function formatTime(
  iso: string | null,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  if (!iso) return EMPTY_VALUE;

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(iso));
}

/** Formats a YYYY-MM-DD calendar date without letting timezone shift the day. */
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatWeekday(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Formats a bare HH:MM:SS wall-clock time, as stored on a work schedule. */
export function formatClockTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

/** Span of a scheduled shift in hours, from two HH:MM:SS wall-clock times. */
export function hoursBetweenClockTimes(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return (endHour * 60 + endMinute - (startHour * 60 + startMinute)) / 60;
}

/** 0 = Sunday through 6 = Saturday, matching work_schedules.day_of_week. */
export function weekdayIndex(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Hours between two timestamps, or null when either punch is missing. */
export function hoursBetween(start: string | null, end: string | null) {
  if (!start || !end) return null;

  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms / 3_600_000;
}

export function formatHours(hours: number | null) {
  if (hours === null) return EMPTY_VALUE;

  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}h ${minutes.toString().padStart(2, "0")}m`;
}
