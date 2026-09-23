import type { Metadata } from "next";

import { CorrectionRequestForm } from "@/components/corrections/CorrectionRequestForm";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = { title: "New correction" };

export default function NewCorrectionPage() {
  return (
    <>
      <TopBar
        title="New correction"
        description="Describe the correction in your own words"
      />

      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto w-full max-w-3xl">
          <CorrectionRequestForm />
        </div>
      </div>
    </>
  );
}
