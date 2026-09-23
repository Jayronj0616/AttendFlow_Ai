import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { ApprovalQueue } from "@/components/hr/ApprovalQueue";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { getPendingApprovals } from "@/lib/services/hr.service";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const items = await getPendingApprovals();

  return (
    <>
      <TopBar
        title="Approvals"
        description={
          items.length === 1
            ? "1 request waiting"
            : `${items.length} requests waiting`
        }
      />

      <div className="flex-1 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          {items.length > 0 ? (
            <ApprovalQueue items={items} />
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="Nothing waiting for review"
              description="Corrections that trip an approval rule appear here. Straightforward ones are applied without reaching this queue."
            />
          )}
        </Card>
      </div>
    </>
  );
}
