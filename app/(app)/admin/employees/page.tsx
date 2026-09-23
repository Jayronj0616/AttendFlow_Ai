import type { Metadata } from "next";
import { Users } from "lucide-react";

import { StatusBadge } from "@/components/attendance/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EMPTY_VALUE } from "@/lib/datetime";
import { getEmployeeDirectory } from "@/lib/services/admin.service";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const rows = await getEmployeeDirectory();

  return (
    <>
      <TopBar
        title="Employees"
        description={rows.length === 1 ? "1 employee" : `${rows.length} employees`}
      />

      <div className="flex-1 p-4 md:p-6">
        <Card className="overflow-hidden py-0">
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ employee, department, role, hasAccount }) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {employee.first_name} {employee.last_name}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {employee.email}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {employee.employee_number}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {department?.name ?? EMPTY_VALUE}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {employee.position ?? EMPTY_VALUE}
                      </TableCell>
                      <TableCell>
                        {hasAccount ? (
                          <StatusBadge
                            label={role === "employee" ? "Employee" : (role ?? "Linked")}
                            tone="info"
                          />
                        ) : (
                          <StatusBadge label="No account" tone="neutral" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge
                          label={
                            employee.employment_status === "active"
                              ? "Active"
                              : employee.employment_status
                          }
                          tone={
                            employee.employment_status === "active"
                              ? "success"
                              : "neutral"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No employees yet"
              description="Employees appear here once they are added to the system."
            />
          )}
        </Card>
      </div>
    </>
  );
}
