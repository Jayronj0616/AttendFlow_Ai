import { StatusBadge } from "@/components/attendance/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EMPTY_VALUE, formatDate, formatTime } from "@/lib/datetime";
import { REQUEST_STATUS_DISPLAY } from "@/lib/status";
import type { CorrectionRequest } from "@/types/domain";

type CorrectionRequestListProps = {
  requests: CorrectionRequest[];
};

export function CorrectionRequestList({
  requests,
}: CorrectionRequestListProps) {
  if (requests.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground md:px-6">
        No correction requests yet.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y sm:hidden">
        {requests.map((request) => {
          const display = REQUEST_STATUS_DISPLAY[request.status];

          return (
            <li key={request.id} className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {formatDate(request.requested_date)}
                </span>
                <StatusBadge label={display.label} tone={display.tone} />
              </div>
              <p className="text-sm text-muted-foreground">
                {describeRequestedChange(request)}
              </p>
              <p className="text-xs text-muted-foreground">
                Submitted {formatDate(request.submitted_at.slice(0, 10))}
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
              <TableHead>Requested change</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => {
              const display = REQUEST_STATUS_DISPLAY[request.status];

              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {formatDate(request.requested_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {describeRequestedChange(request)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(request.submitted_at.slice(0, 10))}
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

function describeRequestedChange(request: CorrectionRequest) {
  const parts: string[] = [];

  if (request.requested_clock_in) {
    parts.push(`Clock-in ${formatTime(request.requested_clock_in)}`);
  }
  if (request.requested_clock_out) {
    parts.push(`Clock-out ${formatTime(request.requested_clock_out)}`);
  }

  return parts.length > 0 ? parts.join(" · ") : EMPTY_VALUE;
}
