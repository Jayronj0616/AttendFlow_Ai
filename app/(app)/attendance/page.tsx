import type { Metadata } from "next";

import { RecentAttendanceTable } from "@/components/attendance/RecentAttendanceTable";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { mockAttendance } from "@/lib/mock/data";

export const metadata: Metadata = { title: "My attendance" };

export default function AttendancePage() {
  return (
    <>
      <TopBar
        title="My attendance"
        description={`${mockAttendance.length} records`}
      />

      <div className="flex-1 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          <RecentAttendanceTable records={mockAttendance} />
        </Card>
      </div>
    </>
  );
}
