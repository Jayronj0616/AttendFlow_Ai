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

/**
 * Minutes since midnight that a timestamp falls on in a given timezone. Comparing a
 * timestamp against a schedule's wall-clock end time is only meaningful once both are
 * expressed in the same zone, which is what this makes possible.
 */
export function minutesSinceMidnight(
  iso: string,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(iso));

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/** Offset of a timezone, in minutes, at a specific instant. Accounts for DST. */
function timezoneOffsetMinutes(instant: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );

  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return (asIfUtc - instant.getTime()) / 60_000;
}

/**
 * Builds a timestamp from a calendar date and a wall-clock time as read in a given
 * timezone. "5:10 PM on 22 September in Manila" is a different instant from the same
 * wall-clock reading elsewhere, and storing the wrong one silently shifts payroll hours.
 */
export function zonedTimeToIso(
  date: string,
  hour: number,
  minute: number,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const naive = new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
  );

  const offset = timezoneOffsetMinutes(naive, timeZone);
  return new Date(naive.getTime() - offset * 60_000).toISOString();
}

/** Minutes since midnight for a bare HH:MM:SS wall-clock time. */
export function clockTimeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

/** Whole days from `from` to `to`, both YYYY-MM-DD. Negative when `to` is earlier. */
export function daysBetweenDates(from: string, to: string) {
  const ms =
    new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Whether two timestamps denote the same moment.
 *
 * Never compare timestamps as strings. The same instant has many valid spellings —
 * `2026-09-22T09:10:00.000Z` and `2026-09-22T17:10:00+08:00` are equal — so `===` reports
 * a difference that does not exist. Postgres also returns its own spelling, which rarely
 * matches whatever the application sent.
 */
export function isSameInstant(a: string | null, b: string | null) {
  if (a === null || b === null) return a === b;
  return new Date(a).getTime() === new Date(b).getTime();
}

/** Today's calendar date in a timezone, as YYYY-MM-DD. */
export function todayInTimezone(timeZone: string = DEFAULT_TIMEZONE) {
  // en-CA formats as YYYY-MM-DD, which is the shape the date columns use.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
