// Temporary fixtures standing in for the database while the UI is built ahead of the
// Supabase project. Deliberately isolated in this one module so wiring in real queries is
// a single deletion rather than a hunt through component files.
//
// Shapes match types/domain.ts exactly, so components written against these need no
// changes when the real data arrives.

import type {
  AttendanceRecord,
  CorrectionRequest,
  Department,
  Employee,
  WorkSchedule,
} from "@/types/domain";

export const MOCK_TODAY = "2026-09-23";

export const mockDepartment: Department = {
  id: "dept-ops",
  name: "Operations",
  description: "Service delivery and fulfilment",
};

export const mockEmployee: Employee = {
  id: "emp-0142",
  employee_number: "EMP-0142",
  first_name: "Maria",
  last_name: "Santos",
  email: "maria.santos@example.com",
  department_id: mockDepartment.id,
  position: "Operations Associate",
  employment_status: "active",
};

// Monday through Friday, 08:00–17:00.
export const mockSchedule: WorkSchedule[] = [1, 2, 3, 4, 5].map((day) => ({
  id: `sched-${day}`,
  employee_id: mockEmployee.id,
  day_of_week: day,
  scheduled_start: "08:00:00",
  scheduled_end: "17:00:00",
  timezone: "Asia/Manila",
  effective_from: "2026-01-01",
  effective_until: null,
}));

const at = (date: string, time: string) => `${date}T${time}+08:00`;

export const mockAttendance: AttendanceRecord[] = [
  {
    id: "att-0923",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-23",
    clock_in: at("2026-09-23", "07:58:00"),
    clock_out: null,
    status: "present",
    source: "biometric",
    notes: null,
  },
  {
    id: "att-0922",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-22",
    clock_in: at("2026-09-22", "08:01:00"),
    clock_out: null,
    status: "incomplete",
    source: "biometric",
    notes: null,
  },
  {
    id: "att-0921",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-21",
    clock_in: at("2026-09-21", "07:55:00"),
    clock_out: at("2026-09-21", "17:04:00"),
    status: "present",
    source: "biometric",
    notes: null,
  },
  {
    id: "att-0920",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-20",
    clock_in: null,
    clock_out: null,
    status: "rest_day",
    source: null,
    notes: null,
  },
  {
    id: "att-0919",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-19",
    clock_in: null,
    clock_out: null,
    status: "rest_day",
    source: null,
    notes: null,
  },
  {
    id: "att-0918",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-18",
    clock_in: at("2026-09-18", "08:14:00"),
    clock_out: at("2026-09-18", "17:02:00"),
    status: "late",
    source: "biometric",
    notes: null,
  },
  {
    id: "att-0917",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-17",
    clock_in: at("2026-09-17", "07:59:00"),
    clock_out: at("2026-09-17", "16:32:00"),
    status: "undertime",
    source: "biometric",
    notes: "Left early, approved verbally",
  },
  {
    id: "att-0916",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-16",
    clock_in: at("2026-09-16", "08:00:00"),
    clock_out: at("2026-09-16", "17:10:00"),
    status: "present",
    source: "biometric",
    notes: null,
  },
  {
    id: "att-0915",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-15",
    clock_in: null,
    clock_out: null,
    status: "on_leave",
    source: "leave_system",
    notes: "Approved vacation leave",
  },
  {
    id: "att-0911",
    employee_id: mockEmployee.id,
    attendance_date: "2026-09-11",
    clock_in: null,
    clock_out: null,
    status: "absent",
    source: null,
    notes: null,
  },
];

export const mockCorrectionRequests: CorrectionRequest[] = [
  {
    id: "req-0003",
    employee_id: mockEmployee.id,
    attendance_record_id: "att-0918",
    requested_date: "2026-09-18",
    requested_clock_in: null,
    requested_clock_out: at("2026-09-18", "21:30:00"),
    employee_reason:
      "Stayed late to finish the quarterly stock count with the warehouse team.",
    status: "pending_hr",
    ai_decision: "requires_hr_approval",
    ai_confidence: 0.91,
    ai_reason:
      "The requested clock-out is four and a half hours beyond the scheduled shift end, which creates significant overtime.",
    submitted_at: at("2026-09-21", "09:12:00"),
    reviewed_at: null,
    reviewed_by: null,
    completed_at: null,
  },
  {
    id: "req-0002",
    employee_id: mockEmployee.id,
    attendance_record_id: "att-0916",
    requested_date: "2026-09-16",
    requested_clock_in: null,
    requested_clock_out: at("2026-09-16", "17:10:00"),
    employee_reason: "Forgot to tap out before leaving the building.",
    status: "completed",
    ai_decision: "auto_approve",
    ai_confidence: 0.97,
    ai_reason:
      "The requested clock-out is ten minutes past the scheduled shift end and no approval rule was triggered.",
    submitted_at: at("2026-09-17", "08:22:00"),
    reviewed_at: at("2026-09-17", "08:22:00"),
    reviewed_by: null,
    completed_at: at("2026-09-17", "08:22:00"),
  },
  {
    id: "req-0001",
    employee_id: mockEmployee.id,
    attendance_record_id: "att-0911",
    requested_date: "2026-09-11",
    requested_clock_in: null,
    requested_clock_out: null,
    employee_reason: "I was marked absent but I was at the client site all day.",
    status: "rejected",
    ai_decision: "reject",
    ai_confidence: 0.88,
    ai_reason:
      "Field work must be filed as an off-site assignment rather than an attendance correction.",
    submitted_at: at("2026-09-14", "10:05:00"),
    reviewed_at: at("2026-09-14", "14:40:00"),
    reviewed_by: "hr-001",
    completed_at: at("2026-09-14", "14:40:00"),
  },
];
