import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { StatusBadge } from "@/components/attendance/StatusBadge";
import { CorrectionRequestList } from "@/components/corrections/CorrectionRequestList";
import { StatTile } from "@/components/dashboard/StatTile";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EMPTY_VALUE,
  formatClockTime,
  formatDate,
  formatHours,
  formatTime,
  formatWeekday,
  hoursBetween,
  hoursBetweenClockTimes,
  weekdayIndex,
} from "@/lib/datetime";
import {
  getAttendanceForDate,
  getScheduleForDate,
} from "@/lib/services/attendance.service";
import { getCorrectionsForDate } from "@/lib/services/corrections.service";
import { getCurrentUser } from "@/lib/services/profile.service";
import { ATTENDANCE_STATUS_DISPLAY } from "@/lib/status";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const metadata: Metadata = { title: "Attendance detail" };

export default async function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  // Validated before it reaches a query: this segment comes from the URL and a malformed
  // value would otherwise be sent to Postgres as a date comparison.
  if (!ISO_DATE.test(date)) notFound();

  const user = await getCurrentUser();
  if (!user?.employee) notFound();

  const employeeId = user.employee.id;
  const [record, schedule, corrections] = await Promise.all([
    getAttendanceForDate(employeeId, date),
    getScheduleForDate(employeeId, date, weekdayIndex(date)),
    getCorrectionsForDate(employeeId, date),
  ]);

  if (!record) notFound();

  const status = ATTENDANCE_STATUS_DISPLAY[record.status];
  const worked = hoursBetween(record.clock_in, record.clock_out);
  const scheduled = schedule
    ? hoursBetweenClockTimes(schedule.scheduled_start, schedule.scheduled_end)
    : null;
  const difference =
    worked !== null && scheduled !== null ? worked - scheduled : null;

  return (
    <>
      <TopBar
        title={formatDate(date)}
        description={formatWeekday(date)}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href="/corrections/new">Request correction</Link>
          </Button>
        }
      />

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Status"
            value={
              <StatusBadge
                label={status.label}
                tone={status.tone}
                className="text-sm"
              />
            }
            hint={record.source ? `Source: ${record.source}` : undefined}
          />
          <StatTile
            label="Clock-in"
            value={formatTime(record.clock_in, schedule?.timezone)}
            hint={
              schedule
                ? `Scheduled ${formatClockTime(schedule.scheduled_start)}`
                : "No schedule"
            }
          />
          <StatTile
            label="Clock-out"
            value={formatTime(record.clock_out, schedule?.timezone)}
            hint={
              schedule
                ? `Scheduled ${formatClockTime(schedule.scheduled_end)}`
                : undefined
            }
          />
          <StatTile
            label="Hours worked"
            value={worked === null ? EMPTY_VALUE : formatHours(worked)}
            hint={
              difference === null
                ? scheduled === null
                  ? undefined
                  : `Scheduled ${formatHours(scheduled)}`
                : difference >= 0
                  ? `${formatHours(difference)} over schedule`
                  : `${formatHours(Math.abs(difference))} under schedule`
            }
          />
        </section>

        {record.notes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{record.notes}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden pb-0">
          <CardHeader>
            <CardTitle className="text-base">
              Corrections for this date
            </CardTitle>
          </CardHeader>
          <div className="border-t">
            {corrections.length > 0 ? (
              <CorrectionRequestList requests={corrections} />
            ) : (
              <p className="px-4 py-6 text-sm text-muted-foreground md:px-6">
                No correction has been filed for this date.
              </p>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
