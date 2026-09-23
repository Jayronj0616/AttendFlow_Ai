import Link from "next/link";

import { StatusBadge } from "@/components/attendance/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatTime } from "@/lib/datetime";
import { AI_DECISION_DISPLAY, describeRequestedChange } from "@/lib/status";
import type { RequestWithContext } from "@/lib/services/hr.service";

export function ApprovalQueue({ items }: { items: RequestWithContext[] }) {
  return (
    <>
      <ul className="divide-y lg:hidden">
        {items.map(({ request, employee }) => {
          const decision = request.ai_decision
            ? AI_DECISION_DISPLAY[request.ai_decision]
            : null;

          return (
            <li key={request.id} className="space-y-2 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {employeeName(employee)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(request.requested_date)}
                  </p>
                </div>
                {decision ? (
                  <StatusBadge label={decision.label} tone={decision.tone} />
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {describeRequestedChange(request)}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/hr/approvals/${request.id}`}>Review</Link>
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Requested change</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(({ request, employee }) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  {employeeName(employee)}
                  {employee ? (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      {employee.employee_number}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(request.requested_date)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {describeRequestedChange(request)}
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {request.employee_reason}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDate(request.submitted_at.slice(0, 10))}
                  <span className="ml-1.5 text-xs tabular-nums">
                    {formatTime(request.submitted_at)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/hr/approvals/${request.id}`}>Review</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function employeeName(employee: RequestWithContext["employee"]) {
  if (!employee) return "Unknown employee";
  return `${employee.first_name} ${employee.last_name}`;
}
