import Link from "next/link";
import type { Metadata } from "next";

import { RecentAttendanceTable } from "@/components/attendance/RecentAttendanceTable";
import { StatusBadge } from "@/components/attendance/StatusBadge";
import { CorrectionRequestList } from "@/components/corrections/CorrectionRequestList";
import { StatTile } from "@/components/dashboard/StatTile";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EMPTY_VALUE,
  formatClockTime,
  formatDate,
  formatHours,
  formatTime,
  hoursBetween,
  hoursBetweenClockTimes,
  weekdayIndex,
} from "@/lib/datetime";
import {
  MOCK_TODAY,
  mockAttendance,
  mockCorrectionRequests,
  mockSchedule,
} from "@/lib/mock/data";
import { ATTENDANCE_STATUS_DISPLAY } from "@/lib/status";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const today = mockAttendance.find((r) => r.attendance_date === MOCK_TODAY);
  const schedule = mockSchedule.find(
    (s) => s.day_of_week === weekdayIndex(MOCK_TODAY),
  );

  const scheduled = schedule
    ? hoursBetweenClockTimes(schedule.scheduled_start, schedule.scheduled_end)
    : null;
  const worked = hoursBetween(today?.clock_in ?? null, today?.clock_out ?? null);
  const status = today ? ATTENDANCE_STATUS_DISPLAY[today.status] : null;

  return (
    <>
      <TopBar
        title="Dashboard"
        description={formatDate(MOCK_TODAY)}
        actions={
          <Button asChild size="sm">
            <Link href="/corrections/new">Request correction</Link>
          </Button>
        }
      />

      <div className="flex-1 space-y-6 p-4 md:p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Current status"
            value={
              status ? (
                <StatusBadge
                  label={status.label}
                  tone={status.tone}
                  className="text-sm"
                />
              ) : (
                EMPTY_VALUE
              )
            }
            hint={today?.source ? `Source: ${today.source}` : undefined}
          />
          <StatTile
            label="Clocked in"
            value={formatTime(today?.clock_in ?? null)}
            hint={
              schedule
                ? `Scheduled ${formatClockTime(schedule.scheduled_start)}`
                : "No schedule for today"
            }
          />
          <StatTile
            label="Scheduled hours"
            value={formatHours(scheduled)}
            hint={
              schedule
                ? `${formatClockTime(schedule.scheduled_start)} – ${formatClockTime(schedule.scheduled_end)}`
                : undefined
            }
          />
          <StatTile
            label="Hours worked"
            value={worked === null ? "In progress" : formatHours(worked)}
            hint={
              today?.clock_out
                ? `Clocked out ${formatTime(today.clock_out)}`
                : "Not clocked out yet"
            }
          />
        </section>

        <Card className="overflow-hidden pb-0">
          <CardHeader>
            <CardTitle className="text-base">Recent attendance</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto border-t">
            <RecentAttendanceTable records={mockAttendance} />
          </div>
        </Card>

        <Card className="overflow-hidden pb-0">
          <CardHeader>
            <CardTitle className="text-base">Correction requests</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto border-t">
            <CorrectionRequestList requests={mockCorrectionRequests} />
          </div>
        </Card>
      </div>
    </>
  );
}
