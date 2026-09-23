// Verifies Row Level Security against the live database.
//
// Signs in as each seeded role using the anon key — the same path the application uses —
// and asserts what each one can and cannot reach. This deliberately does not use the
// service role, because that bypasses RLS and would prove nothing.
//
// Run with: pnpm db:verify-rls   (requires the seed to have been run first)

import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.SEED_DEMO_PASSWORD;

if (!url || !anonKey || !password) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SEED_DEMO_PASSWORD are required",
  );
  process.exit(1);
}

let failures = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function anonClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedInAs(email) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(`could not sign in as ${email}: ${error.message}`);
    process.exit(1);
  }

  return client;
}

// --- Anonymous ------------------------------------------------------------------

console.log("\nAnonymous (no session)");
{
  const db = anonClient();

  for (const table of [
    "attendance_records",
    "employees",
    "correction_requests",
    "audit_logs",
    "notifications",
  ]) {
    const { data } = await db.from(table).select("*");
    assert(
      `${table} returns nothing`,
      (data ?? []).length === 0,
      `${(data ?? []).length} rows leaked`,
    );
  }
}

// --- Employee -------------------------------------------------------------------

console.log("\nEmployee (maria.santos@example.com)");
{
  const db = await signedInAs("maria.santos@example.com");

  const { data: profile } = await db
    .from("profiles")
    .select("employee_id")
    .single();
  const ownId = profile?.employee_id;

  const { data: attendance } = await db.from("attendance_records").select("*");
  assert(
    "sees own attendance",
    (attendance ?? []).length > 0,
    "no rows returned",
  );
  assert(
    "sees no other employee's attendance",
    (attendance ?? []).every((row) => row.employee_id === ownId),
    "rows from another employee were visible",
  );

  const { data: employees } = await db.from("employees").select("id");
  assert(
    "sees only their own employee record",
    (employees ?? []).length === 1 && employees[0].id === ownId,
    `${(employees ?? []).length} employee rows visible`,
  );

  const { data: corrections } = await db
    .from("correction_requests")
    .select("employee_id");
  assert(
    "sees only their own corrections",
    (corrections ?? []).every((row) => row.employee_id === ownId),
    "another employee's corrections were visible",
  );

  const { data: audit } = await db.from("audit_logs").select("id");
  assert(
    "cannot read the audit log",
    (audit ?? []).length === 0,
    `${(audit ?? []).length} audit rows visible`,
  );

  // No policy grants insert on attendance, deliberately: corrections are applied by the
  // server after the rules have run, never by a client statement.
  const { error: insertError } = await db.from("attendance_records").insert({
    employee_id: ownId,
    attendance_date: "2026-01-02",
    status: "present",
  });
  assert(
    "cannot write attendance directly",
    insertError !== null,
    "the insert was accepted",
  );

  // Updating a correction is a staff action. RLS filters the row out rather than erroring,
  // so an empty result is what proves the policy held.
  const { data: updated } = await db
    .from("correction_requests")
    .update({ status: "completed" })
    .eq("employee_id", ownId)
    .select();
  assert(
    "cannot approve their own correction",
    (updated ?? []).length === 0,
    "a correction was updated",
  );
}

// --- Second employee -------------------------------------------------------------

console.log("\nSecond employee (diego.cruz@example.com)");
{
  const db = await signedInAs("diego.cruz@example.com");

  const { data: profile } = await db
    .from("profiles")
    .select("employee_id")
    .single();

  const { data: attendance } = await db.from("attendance_records").select("*");
  assert(
    "sees only their own attendance",
    (attendance ?? []).every((row) => row.employee_id === profile?.employee_id),
    "another employee's attendance was visible",
  );
}

// --- HR ---------------------------------------------------------------------------

console.log("\nHR (hr.lead@example.com)");
{
  const db = await signedInAs("hr.lead@example.com");

  const { data: attendance } = await db
    .from("attendance_records")
    .select("employee_id");
  const distinct = new Set((attendance ?? []).map((row) => row.employee_id));
  assert(
    "sees attendance across employees",
    distinct.size > 1,
    `only ${distinct.size} employee(s) visible`,
  );

  const { data: audit } = await db.from("audit_logs").select("id");
  assert("can read the audit log", (audit ?? []).length > 0, "no audit rows");

  const { data: corrections } = await db
    .from("correction_requests")
    .select("id");
  assert(
    "sees correction requests",
    (corrections ?? []).length > 0,
    "no corrections visible",
  );

  const { error: insertError } = await db.from("attendance_records").insert({
    employee_id: distinct.values().next().value,
    attendance_date: "2026-01-03",
    status: "present",
  });
  assert(
    "cannot write attendance directly either",
    insertError !== null,
    "the insert was accepted",
  );
}

console.log(
  failures === 0
    ? "\nAll RLS checks passed.\n"
    : `\n${failures} RLS check(s) FAILED.\n`,
);

process.exit(failures === 0 ? 0 : 1);
