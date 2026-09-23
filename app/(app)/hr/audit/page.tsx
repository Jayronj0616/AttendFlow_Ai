import Link from "next/link";
import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
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
import { getAuditLogs, parseActorType } from "@/lib/services/hr.service";

export const metadata: Metadata = { title: "Audit log" };

const ACTOR_FILTERS = [
  { label: "All", value: undefined },
  { label: "Employee", value: "employee" },
  { label: "HR", value: "hr" },
  { label: "AI agent", value: "ai_agent" },
  { label: "System", value: "system" },
];

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string }>;
}) {
  const { actor } = await searchParams;
  // Narrowed rather than passed through: this value comes from the URL and an unknown
  // string would reach the query as a bogus enum comparison.
  const actorType = parseActorType(actor);
  const entries = await getAuditLogs(100, actorType);

  return (
    <>
      <TopBar
        title="Audit log"
        description={
          entries.length === 1 ? "1 event" : `${entries.length} events`
        }
      />

      <div className="flex-1 space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap gap-2">
          {ACTOR_FILTERS.map((filter) => (
            <Button
              key={filter.label}
              asChild
              size="sm"
              variant={actorType === filter.value ? "default" : "outline"}
            >
              <Link href={filter.value ? `/hr/audit?actor=${filter.value}` : "/hr/audit"}>
                {filter.label}
              </Link>
            </Button>
          ))}
        </div>

        <Card className="overflow-hidden py-0">
          {entries.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(({ log, actorName }) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(log.created_at.slice(0, 10))}
                        <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
                          {formatTime(log.created_at)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-medium">
                          {actorName ?? actorLabel(log.actor_type)}
                        </span>
                        {actorName ? (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {actorLabel(log.actor_type)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.action}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.entity_type}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={ScrollText}
              title="No events recorded"
              description="Corrections, approvals, and failures are written here as they happen."
            />
          )}
        </Card>
      </div>
    </>
  );
}

function actorLabel(actorType: string) {
  return actorType === "ai_agent"
    ? "AI agent"
    : actorType.charAt(0).toUpperCase() + actorType.slice(1);
}
