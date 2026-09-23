import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AttendanceRule, Department, Employee, Role } from "@/types/domain";

export type EmployeeRow = {
  employee: Employee;
  department: Department | null;
  role: Role | null;
  hasAccount: boolean;
};

/**
 * The employee directory with each person's department and account role.
 *
 * Reads run through the session client, so the admin-only policies are what widen this
 * beyond a single row rather than anything written here.
 */
export async function getEmployeeDirectory(): Promise<EmployeeRow[]> {
  const supabase = await createClient();

  const { data: employees } = await supabase
    .from("employees")
    .select("*")
    .order("last_name");

  if (!employees || employees.length === 0) return [];

  const [{ data: departments }, { data: profiles }] = await Promise.all([
    supabase.from("departments").select("*"),
    supabase.from("profiles").select("employee_id, role"),
  ]);

  const departmentById = new Map(
    (departments ?? []).map((department) => [department.id, department]),
  );
  const roleByEmployee = new Map(
    (profiles ?? [])
      .filter((profile) => profile.employee_id !== null)
      .map((profile) => [profile.employee_id as string, profile.role]),
  );

  return employees.map((employee) => ({
    employee,
    department: employee.department_id
      ? (departmentById.get(employee.department_id) ?? null)
      : null,
    role: roleByEmployee.get(employee.id) ?? null,
    hasAccount: roleByEmployee.has(employee.id),
  }));
}

export async function getAttendanceRules(): Promise<AttendanceRule[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("attendance_rules")
    .select("*")
    .order("rule_code");

  return data ?? [];
}
