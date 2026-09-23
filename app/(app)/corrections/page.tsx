import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { CorrectionRequestList } from "@/components/corrections/CorrectionRequestList";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCorrectionRequests } from "@/lib/services/corrections.service";
import { getCurrentUser } from "@/lib/services/profile.service";

export const metadata: Metadata = { title: "Corrections" };

export default async function CorrectionsPage() {
  const user = await getCurrentUser();
  const requests = user?.employee
    ? await getCorrectionRequests(user.employee.id)
    : [];

  return (
    <>
      <TopBar
        title="Corrections"
        description={
          requests.length === 1 ? "1 request" : `${requests.length} requests`
        }
        actions={
          <Button asChild size="sm">
            <Link href="/corrections/new">New request</Link>
          </Button>
        }
      />

      <div className="flex-1 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          {requests.length > 0 ? (
            <CorrectionRequestList requests={requests} />
          ) : (
            <EmptyState
              icon={FileText}
              title="No correction requests"
              description="If a clock-in or clock-out is wrong, describe it in your own words and the system will work out what needs to change."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link href="/corrections/new">New request</Link>
                </Button>
              }
            />
          )}
        </Card>
      </div>
    </>
  );
}
