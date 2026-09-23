import Link from "next/link";
import { ClipboardCheck, TriangleAlert } from "lucide-react";

import { StatusBadge } from "@/components/attendance/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { StatTile } from "@/components/dashboard/StatTile";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/datetime";
import {
  getAttendanceExceptions,
  getEscalatedRequests,
  getPendingApprovals,
} from "@/lib/services/hr.service";
import { describeRequestedChange, REQUEST_STATUS_DISPLAY } from "@/lib/status";

export async function HrOverview() {
  const [pending, exceptions, escalated] = await Promise.all([
    getPendingApprovals(),
    getAttendanceExceptions(20),
    getEscalatedRequests(50),
  ]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Waiting for review"
          value={pending.length}
          hint={pending.length > 0 ? "Oldest first in the queue" : "Queue is clear"}
        />
        <StatTile
          label="Open exceptions"
          value={exceptions.length}
          hint="Attendance missing a punch"
        />
        <StatTile
          label="Escalated to HR"
          value={escalated.length}
          hint="Corrections the rules would not apply automatically"
        />
      </section>

      <Card className="overflow-hidden pb-0">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Pending approvals</CardTitle>
          {pending.length > 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/hr/approvals">View all</Link>
            </Button>
          ) : null}
        </CardHeader>
        <div className="border-t">
          {pending.length > 0 ? (
            <ul className="divide-y">
              {pending.slice(0, 5).map(({ request, employee }) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {employee
                        ? `${employee.first_name} ${employee.last_name}`
                        : "Unknown employee"}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {formatDate(request.requested_date)}
                      </span>
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {describeRequestedChange(request)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      label={REQUEST_STATUS_DISPLAY[request.status].label}
                      tone={REQUEST_STATUS_DISPLAY[request.status].tone}
                    />
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/hr/approvals/${request.id}`}>Review</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="Nothing waiting for review"
              description="Corrections that trip an approval rule appear here."
            />
          )}
        </div>
      </Card>

      <Card className="overflow-hidden pb-0">
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Attendance exceptions</CardTitle>
          {exceptions.length > 0 ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/hr/exceptions">View all</Link>
            </Button>
          ) : null}
        </CardHeader>
        <div className="border-t">
          {exceptions.length > 0 ? (
            <ul className="divide-y">
              {exceptions.slice(0, 5).map(({ record, employee }) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 md:px-6"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {employee
                        ? `${employee.first_name} ${employee.last_name}`
                        : "Unknown employee"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(record.attendance_date)}
                    </p>
                  </div>
                  <StatusBadge label="Incomplete" tone="warning" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={TriangleAlert}
              title="No open exceptions"
              description="Attendance missing a punch appears here."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
