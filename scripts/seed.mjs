// Seeds the development database with the demo employee and their attendance history.
//
// Idempotent: it deletes the demo employee's rows and recreates them, so running it twice
// leaves the same state rather than duplicating records.
//
// Uses the service role key deliberately. This is tooling that runs outside a request, so
// there is no session for RLS to key on, and seeding is exactly the privileged case the
// admin client exists for.

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Read from the environment with no fallback. A default here would be a working password
// for a real account in a live project, committed to the repository.
const demoPassword = process.env.SEED_DEMO_PASSWORD;

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

if (!demoPassword) {
  console.error("SEED_DEMO_PASSWORD is not set in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_EMAIL = "maria.santos@example.com";
const HR_EMAIL = "hr.lead@example.com";
// A second employee exists so RLS isolation can be tested for real. Without another
// employee's rows in the table, "Maria sees only her own" proves nothing.
const OTHER_EMAIL = "diego.cruz@example.com";
const at = (date, time) => `${date}T${time}+08:00`;

function check(label, { error }) {
  if (error) {
    console.error(`${label}: ${error.message}`);
    process.exit(1);
  }
  console.log(`  ${label}`);
}

// --- Auth user ---------------------------------------------------------------

const { data: existing } = await db.auth.admin.listUsers();

async function recreateUser(email) {
  const prior = existing?.users.find((u) => u.email === email);
  if (prior) await db.auth.admin.deleteUser(prior.id);

  const { data, error } = await db.auth.admin.createUser({
    email,
    password: demoPassword,
    email_confirm: true,
  });

  if (error) {
    console.error(`create ${email}: ${error.message}`);
    process.exit(1);
  }

  console.log(`  auth user ${email}`);
  return data.user.id;
}

const userId = await recreateUser(DEMO_EMAIL);
const hrUserId = await recreateUser(HR_EMAIL);
const otherUserId = await recreateUser(OTHER_EMAIL);

// --- Reference data -----------------------------------------------------------

await db.from("employees").delete().in("employee_number", ["EMP-0142", "EMP-0207"]);
await db.from("departments").delete().eq("name", "Operations");

const { data: department } = await db
  .from("departments")
  .insert({ name: "Operations", description: "Service delivery and fulfilment" })
  .select()
  .single();

console.log("  department");

const { data: employee, error: employeeError } = await db
  .from("employees")
  .insert({
    employee_number: "EMP-0142",
    first_name: "Maria",
    last_name: "Santos",
    email: DEMO_EMAIL,
    department_id: department.id,
    position: "Operations Associate",
    employment_status: "active",
  })
  .select()
  .single();

if (employeeError) {
  console.error(`employee: ${employeeError.message}`);
  process.exit(1);
}
console.log("  employee");

// The auth trigger does not exist yet, so the profile is created explicitly.
check(
  "profile",
  await db.from("profiles").upsert({
    id: userId,
    employee_id: employee.id,
    role: "employee",
    first_name: "Maria",
    last_name: "Santos",
    email: DEMO_EMAIL,
    is_active: true,
  }),
);

const { data: otherEmployee, error: otherEmployeeError } = await db
  .from("employees")
  .insert({
    employee_number: "EMP-0207",
    first_name: "Diego",
    last_name: "Cruz",
    email: OTHER_EMAIL,
    department_id: department.id,
    position: "Warehouse Associate",
    employment_status: "active",
  })
  .select()
  .single();

if (otherEmployeeError) {
  console.error(`second employee: ${otherEmployeeError.message}`);
  process.exit(1);
}
console.log("  second employee");

check(
  "second employee profile",
  await db.from("profiles").upsert({
    id: otherUserId,
    employee_id: otherEmployee.id,
    role: "employee",
    first_name: "Diego",
    last_name: "Cruz",
    email: OTHER_EMAIL,
    is_active: true,
  }),
);

check(
  "second employee attendance",
  await db.from("attendance_records").insert({
    employee_id: otherEmployee.id,
    attendance_date: "2026-09-22",
    clock_in: at("2026-09-22", "07:45:00"),
    clock_out: at("2026-09-22", "17:00:00"),
    status: "present",
    source: "biometric",
  }),
);

// No employee_id: HR staff here review attendance rather than record their own, which also
// exercises the "no employee record linked" path on the employee-facing pages.
check(
  "hr profile",
  await db.from("profiles").upsert({
    id: hrUserId,
    employee_id: null,
    role: "hr",
    first_name: "Ana",
    last_name: "Reyes",
    email: HR_EMAIL,
    is_active: true,
  }),
);

check(
  "work schedules",
  await db.from("work_schedules").insert(
    [1, 2, 3, 4, 5].map((day) => ({
      employee_id: employee.id,
      day_of_week: day,
      scheduled_start: "08:00:00",
      scheduled_end: "17:00:00",
      timezone: "Asia/Manila",
      effective_from: "2026-01-01",
    })),
  ),
);

// --- Attendance rules ----------------------------------------------------------

await db.from("attendance_rules").delete().neq("rule_code", "");

check(
  "attendance rules",
  await db.from("attendance_rules").insert([
    {
      rule_code: "maximum_auto_corrections",
      rule_name: "Maximum automatic corrections",
      description: "Corrections applied automatically per employee per calendar month.",
      configuration: { limit: 2, period: "calendar_month" },
    },
    {
      rule_code: "overtime_requires_approval",
      rule_name: "Overtime requires approval",
      description: "Minutes past the scheduled shift end before HR approval is required.",
      configuration: { threshold_minutes: 60 },
    },
    {
      rule_code: "correction_submission_deadline",
      rule_name: "Correction filing deadline",
      description: "Days after the attendance date that a correction may still be filed.",
      configuration: { days: 14 },
    },
    {
      rule_code: "locked_payroll_period",
      rule_name: "Locked payroll periods",
      description: "Date ranges whose attendance is frozen for payroll.",
      configuration: { periods: [{ start: "2026-09-01", end: "2026-09-15" }] },
    },
  ]),
);

// --- Attendance history ---------------------------------------------------------

const attendance = [
  ["2026-09-23", "07:58:00", null, "present", "biometric", null],
  ["2026-09-22", "08:01:00", null, "incomplete", "biometric", null],
  ["2026-09-21", "07:55:00", "17:04:00", "present", "biometric", null],
  ["2026-09-20", null, null, "rest_day", null, null],
  ["2026-09-19", null, null, "rest_day", null, null],
  ["2026-09-18", "08:14:00", "17:02:00", "late", "biometric", null],
  ["2026-09-17", "07:59:00", "16:32:00", "undertime", "biometric", "Left early, approved verbally"],
  ["2026-09-16", "08:00:00", "17:10:00", "present", "biometric", null],
  ["2026-09-15", null, null, "on_leave", "leave_system", "Approved vacation leave"],
  ["2026-09-11", null, null, "absent", null, null],
];

const { data: records, error: attendanceError } = await db
  .from("attendance_records")
  .insert(
    attendance.map(([date, clockIn, clockOut, status, source, notes]) => ({
      employee_id: employee.id,
      attendance_date: date,
      clock_in: clockIn ? at(date, clockIn) : null,
      clock_out: clockOut ? at(date, clockOut) : null,
      status,
      source,
      notes,
    })),
  )
  .select();

if (attendanceError) {
  console.error(`attendance: ${attendanceError.message}`);
  process.exit(1);
}
console.log(`  attendance (${records.length} records)`);

const recordFor = (date) =>
  records.find((r) => r.attendance_date === date)?.id ?? null;

// --- Correction requests ----------------------------------------------------------

const { data: seededRequests, error: requestsError } = await db
  .from("correction_requests")
  .insert([
    {
      employee_id: employee.id,
      attendance_record_id: recordFor("2026-09-18"),
      requested_date: "2026-09-18",
      requested_clock_out: at("2026-09-18", "21:30:00"),
      employee_reason:
        "Stayed late to finish the quarterly stock count with the warehouse team.",
      status: "pending_hr",
      ai_decision: "requires_hr_approval",
      ai_confidence: 0.91,
      ai_reason:
        "The requested clock-out is four and a half hours beyond the scheduled shift end, which creates significant overtime.",
      submitted_at: at("2026-09-21", "09:12:00"),
    },
    {
      employee_id: employee.id,
      attendance_record_id: recordFor("2026-09-16"),
      requested_date: "2026-09-16",
      requested_clock_out: at("2026-09-16", "17:10:00"),
      employee_reason: "Forgot to tap out before leaving the building.",
      status: "completed",
      ai_decision: "auto_approve",
      ai_confidence: 0.97,
      ai_reason:
        "The requested clock-out is ten minutes past the scheduled shift end and no approval rule was triggered.",
      submitted_at: at("2026-09-17", "08:22:00"),
      reviewed_at: at("2026-09-17", "08:22:00"),
      completed_at: at("2026-09-17", "08:22:00"),
    },
    {
      employee_id: employee.id,
      attendance_record_id: recordFor("2026-09-11"),
      requested_date: "2026-09-11",
      requested_clock_out: at("2026-09-11", "17:00:00"),
      employee_reason: "I was marked absent but I was at the client site all day.",
      status: "rejected",
      ai_decision: "reject",
      ai_confidence: 0.88,
      ai_reason:
        "Field work must be filed as an off-site assignment rather than an attendance correction.",
      submitted_at: at("2026-09-14", "10:05:00"),
      reviewed_at: at("2026-09-14", "14:40:00"),
      completed_at: at("2026-09-14", "14:40:00"),
    },
  ])
  .select();

if (requestsError) {
  console.error(`correction requests: ${requestsError.message}`);
  process.exit(1);
}
console.log(`  correction requests (${seededRequests.length})`);

// Every escalated correction needs its matching approval row, or the HR queue would show
// a request nobody can act on.
const pending = seededRequests.filter((r) => r.status === "pending_hr");

check(
  "approval requests",
  await db.from("approval_requests").insert(
    pending.map((request) => ({
      correction_request_id: request.id,
      status: "pending",
    })),
  ),
);

check(
  "notifications",
  await db.from("notifications").insert([
    {
      user_id: userId,
      type: "approval_required",
      title: "Sent to HR for review",
      message:
        "Your correction for Sep 18 needs HR approval because it creates overtime.",
      is_read: false,
      created_at: at("2026-09-21", "09:12:00"),
    },
    {
      user_id: userId,
      type: "request_completed",
      title: "Correction applied",
      message: "Your clock-out for Sep 16 was updated to 5:10 PM.",
      is_read: false,
      created_at: at("2026-09-17", "08:22:00"),
    },
    {
      user_id: userId,
      type: "request_rejected",
      title: "Request rejected",
      message:
        "Your correction for Sep 11 was rejected. File off-site work as a field assignment instead.",
      is_read: true,
      created_at: at("2026-09-14", "14:40:00"),
    },
  ]),
);

console.log(
  `\nSeeded. Sign in with SEED_DEMO_PASSWORD as:\n` +
    `  employee  ${DEMO_EMAIL}\n` +
    `  employee  ${OTHER_EMAIL}\n` +
    `  HR        ${HR_EMAIL}`,
);
