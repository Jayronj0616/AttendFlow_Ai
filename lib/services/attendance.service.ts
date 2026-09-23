import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AttendanceRecord, WorkSchedule } from "@/types/domain";

export async function getAttendanceHistory(
  employeeId: string,
  limit = 30,
): Promise<AttendanceRecord[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .order("attendance_date", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getAttendanceForDate(
  employeeId: string,
  date: string,
): Promise<AttendanceRecord | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("attendance_date", date)
    .maybeSingle();

  return data ?? null;
}

export async function getSchedules(
  employeeId: string,
): Promise<WorkSchedule[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("work_schedules")
    .select("*")
    .eq("employee_id", employeeId)
    .order("day_of_week");

  return data ?? [];
}

/**
 * The schedule governing a given date, honouring the effective_from/effective_until window
 * so a past date is evaluated against the schedule that applied then, not today's.
 */
export async function getScheduleForDate(
  employeeId: string,
  date: string,
  weekday: number,
): Promise<WorkSchedule | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("work_schedules")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("day_of_week", weekday)
    .lte("effective_from", date)
    .or(`effective_until.is.null,effective_until.gte.${date}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
