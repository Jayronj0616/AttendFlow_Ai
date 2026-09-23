import { StatusBadge } from "@/components/attendance/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTime, formatWeekday } from "@/lib/datetime";
import { ATTENDANCE_STATUS_DISPLAY } from "@/lib/status";
import type { AttendanceRecord } from "@/types/domain";

type RecentAttendanceTableProps = {
  records: AttendanceRecord[];
};

export function RecentAttendanceTable({
  records,
}: RecentAttendanceTableProps) {
  return (
    <>
      {/* Below sm the four columns cannot fit, and horizontal scrolling would hide
          status — the column that matters most — so rows become cards instead. */}
      <ul className="divide-y sm:hidden">
        {records.map((record) => {
          const display = ATTENDANCE_STATUS_DISPLAY[record.status];

          return (
            <li key={record.id} className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {formatDate(record.attendance_date)}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {formatWeekday(record.attendance_date)}
                  </span>
                </span>
                <StatusBadge label={display.label} tone={display.tone} />
              </div>
              <p className="text-sm tabular-nums text-muted-foreground">
                {formatTime(record.clock_in)} &rarr;{" "}
                {formatTime(record.clock_out)}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Clock-in</TableHead>
              <TableHead>Clock-out</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const display = ATTENDANCE_STATUS_DISPLAY[record.status];

              return (
                <TableRow key={record.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDate(record.attendance_date)}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {formatWeekday(record.attendance_date)}
                    </span>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatTime(record.clock_in)}
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatTime(record.clock_out)}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatusBadge label={display.label} tone={display.tone} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
