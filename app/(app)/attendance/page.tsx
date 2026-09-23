import type { Metadata } from "next";
import { CalendarX2 } from "lucide-react";

import { RecentAttendanceTable } from "@/components/attendance/RecentAttendanceTable";
import { EmptyState } from "@/components/common/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { getAttendanceHistory } from "@/lib/services/attendance.service";
import { getCurrentUser } from "@/lib/services/profile.service";

export const metadata: Metadata = { title: "My attendance" };

export default async function AttendancePage() {
  const user = await getCurrentUser();

  if (!user?.employee) {
    return (
      <>
        <TopBar title="My attendance" />
        <EmptyState
          title="No employee record linked"
          description="This account is not connected to an employee, so there is no attendance to show."
        />
      </>
    );
  }

  const records = await getAttendanceHistory(user.employee.id, 60);

  return (
    <>
      <TopBar
        title="My attendance"
        description={
          records.length === 1 ? "1 record" : `${records.length} records`
        }
      />

      <div className="flex-1 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          {records.length > 0 ? (
            <RecentAttendanceTable records={records} />
          ) : (
            <EmptyState
              icon={CalendarX2}
              title="No attendance yet"
              description="Records appear here once your clock-ins start syncing."
            />
          )}
        </Card>
      </div>
    </>
  );
}
