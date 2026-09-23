import Link from "next/link";
import type { Metadata } from "next";
import { CalendarX2, FileText } from "lucide-react";

import { RecentAttendanceTable } from "@/components/attendance/RecentAttendanceTable";
import { StatusBadge } from "@/components/attendance/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { CorrectionRequestList } from "@/components/corrections/CorrectionRequestList";
import { StatTile } from "@/components/dashboard/StatTile";
import { HrOverview } from "@/components/hr/HrOverview";
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
  todayInTimezone,
  weekdayIndex,
} from "@/lib/datetime";
import {
  getAttendanceHistory,
  getScheduleForDate,
} from "@/lib/services/attendance.service";
import { getCorrectionRequests } from "@/lib/services/corrections.service";
import { getCurrentUser } from "@/lib/services/profile.service";
import { ATTENDANCE_STATUS_DISPLAY } from "@/lib/status";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Reviewers get the queue rather than their own attendance. Most HR accounts have no
  // employee record, so the employee view would be empty for them anyway.
  if (user && (user.profile.role === "hr" || user.profile.role === "admin")) {
    return (
      <>
        <TopBar title="Dashboard" description="Attendance operations" />
        <HrOverview />
      </>
    );
  }

  if (!user?.employee) {
    return (
      <>
        <TopBar title="Dashboard" />
        <EmptyState
          title="No employee record linked"
          description="This account is not connected to an employee, so there is no attendance to show. An administrator can link it."
        />
      </>
    );
  }

  const employeeId = user.employee.id;
  const today = todayInTimezone();

  const [records, requests, schedule] = await Promise.all([
    getAttendanceHistory(employeeId, 10),
    getCorrectionRequests(employeeId),
    getScheduleForDate(employeeId, today, weekdayIndex(today)),
  ]);

  const todayRecord = records.find((r) => r.attendance_date === today) ?? null;
  const scheduled = schedule
    ? hoursBetweenClockTimes(schedule.scheduled_start, schedule.scheduled_end)
    : null;
  const worked = hoursBetween(
    todayRecord?.clock_in ?? null,
    todayRecord?.clock_out ?? null,
  );
  const status = todayRecord
    ? ATTENDANCE_STATUS_DISPLAY[todayRecord.status]
    : null;

  return (
    <>
      <TopBar
        title="Dashboard"
        description={formatDate(today)}
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
                <span className="text-base font-normal text-muted-foreground">
                  No record today
                </span>
              )
            }
            hint={todayRecord?.source ? `Source: ${todayRecord.source}` : undefined}
          />
          <StatTile
            label="Clocked in"
            value={formatTime(todayRecord?.clock_in ?? null)}
            hint={
              schedule
                ? `Scheduled ${formatClockTime(schedule.scheduled_start)}`
                : "No schedule for today"
            }
          />
          <StatTile
            label="Scheduled hours"
            value={scheduled === null ? EMPTY_VALUE : formatHours(scheduled)}
            hint={
              schedule
                ? `${formatClockTime(schedule.scheduled_start)} – ${formatClockTime(schedule.scheduled_end)}`
                : undefined
            }
          />
          <StatTile
            label="Hours worked"
            value={
              worked === null
                ? todayRecord?.clock_in
                  ? "In progress"
                  : EMPTY_VALUE
                : formatHours(worked)
            }
            hint={
              todayRecord?.clock_out
                ? `Clocked out ${formatTime(todayRecord.clock_out)}`
                : "Not clocked out yet"
            }
          />
        </section>

        <Card className="overflow-hidden pb-0">
          <CardHeader>
            <CardTitle className="text-base">Recent attendance</CardTitle>
          </CardHeader>
          <div className="border-t">
            {records.length > 0 ? (
              <RecentAttendanceTable records={records} />
            ) : (
              <EmptyState
                icon={CalendarX2}
                title="No attendance yet"
                description="Records appear here once your clock-ins start syncing."
              />
            )}
          </div>
        </Card>

        <Card className="overflow-hidden pb-0">
          <CardHeader>
            <CardTitle className="text-base">Correction requests</CardTitle>
          </CardHeader>
          <div className="border-t">
            {requests.length > 0 ? (
              <CorrectionRequestList requests={requests} />
            ) : (
              <EmptyState
                icon={FileText}
                title="No correction requests"
                description="If a clock-in or clock-out is wrong, describe it and the system will work out what needs to change."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/corrections/new">Request correction</Link>
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
