import Link from "next/link";
import type { Metadata } from "next";

import { CorrectionRequestList } from "@/components/corrections/CorrectionRequestList";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mockCorrectionRequests } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Corrections" };

export default function CorrectionsPage() {
  return (
    <>
      <TopBar
        title="Corrections"
        description={`${mockCorrectionRequests.length} requests`}
        actions={
          <Button asChild size="sm">
            <Link href="/corrections/new">New request</Link>
          </Button>
        }
      />

      <div className="flex-1 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          <CorrectionRequestList requests={mockCorrectionRequests} />
        </Card>
      </div>
    </>
  );
}
