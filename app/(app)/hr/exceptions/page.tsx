import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { StatusBadge } from "@/components/attendance/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/datetime";
import { getAttendanceExceptions } from "@/lib/services/hr.service";

export const metadata: Metadata = { title: "Exceptions" };

export default async function ExceptionsPage() {
  const exceptions = await getAttendanceExceptions();

  return (
    <>
      <TopBar
        title="Attendance exceptions"
        description={
          exceptions.length === 1
            ? "1 record missing a punch"
            : `${exceptions.length} records missing a punch`
        }
      />

      <div className="flex-1 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          {exceptions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock-in</TableHead>
                    <TableHead>Clock-out</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptions.map(({ record, employee }) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {employee
                          ? `${employee.first_name} ${employee.last_name}`
                          : "Unknown employee"}
                        {employee ? (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            {employee.employee_number}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(record.attendance_date)}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {formatTime(record.clock_in)}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {formatTime(record.clock_out)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge label="Incomplete" tone="warning" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No open exceptions"
              description="Attendance missing a clock-in or clock-out appears here. Nothing is currently outstanding."
            />
          )}
        </Card>
      </div>
    </>
  );
}
