import { DEFAULT_TIMEZONE, daysBetweenDates, zonedTimeToIso } from "@/lib/datetime";
import type { AiExtraction } from "@/lib/validations/correction.schema";

/**
 * PLACEHOLDER for the Phase 5 agent.
 *
 * This reads dates and times out of an employee's sentence with regular expressions so the
 * correction flow is usable before the model is wired up. It is deliberately conservative:
 * anything it cannot read confidently comes back as null, which routes the request to
 * NEEDS_CLARIFICATION rather than guessing. docs/prompt.md is explicit that missing values
 * are never invented, and that holds whether the extraction is done by a model or by this.
 *
 * Replace the body with a call to the agent. The signature and the AiExtraction contract
 * stay as they are, so nothing downstream changes.
 */
export function extractCorrectionRequest(
  message: string,
  today: string,
  timeZone: string = DEFAULT_TIMEZONE,
): AiExtraction {
  const text = message.toLowerCase();

  return {
    requested_date: extractDate(text, today),
    requested_clock_in: extractPunch(text, "in", today, timeZone),
    requested_clock_out: extractPunch(text, "out", today, timeZone),
    employee_reason: message.trim(),
  };
}

function extractDate(text: string, today: string): string | null {
  const explicit = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) return explicit[1];

  if (/\btoday\b/.test(text)) return today;
  if (/\byesterday\b/.test(text)) return shiftDate(today, -1);

  const named = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/,
  );
  if (named) {
    const month = MONTHS.indexOf(named[1]) + 1;
    const day = Number(named[2]);
    const year = Number(today.slice(0, 4));
    const candidate = `${year}-${pad(month)}-${pad(day)}`;

    // A named month with no year means the most recent occurrence, not a future one.
    return daysBetweenDates(candidate, today) >= 0
      ? candidate
      : `${year - 1}-${pad(month)}-${pad(day)}`;
  }

  return null;
}

/**
 * Finds the time associated with a clock-in or clock-out. The direction keyword must appear
 * within a short window before the time, so "I clocked in at 8 and forgot to clock out
 * until 5:10 PM" assigns each time to the right punch.
 */
function extractPunch(
  text: string,
  direction: "in" | "out",
  today: string,
  timeZone: string,
): string | null {
  const date = extractDate(text, today);
  if (!date) return null;

  const keyword =
    direction === "in"
      ? /(clock(?:ed)?[ -]?in|tap(?:ped)?[ -]?in|time[ -]?in|arrived|got in|started)/g
      : /(clock(?:ed)?[ -]?out|tap(?:ped)?[ -]?out|time[ -]?out|left|finished|ended)/g;

  for (const match of text.matchAll(keyword)) {
    const window = text.slice(match.index, match.index + 60);
    const time = matchTime(window);
    if (time) return zonedTimeToIso(date, time.hour, time.minute, timeZone);
  }

  return null;
}

function matchTime(segment: string) {
  const meridiem = segment.match(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?/);
  if (meridiem) {
    let hour = Number(meridiem[1]) % 12;
    if (meridiem[3] === "p") hour += 12;
    return { hour, minute: Number(meridiem[2] ?? 0) };
  }

  const twentyFour = segment.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (twentyFour) {
    return { hour: Number(twentyFour[1]), minute: Number(twentyFour[2]) };
  }

  return null;
}

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
