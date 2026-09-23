import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Employee, Profile } from "@/types/domain";

export type CurrentUser = {
  userId: string;
  profile: Profile;
  employee: Employee | null;
};

/**
 * The signed-in user's profile and linked employee record, or null when there is no
 * session. Every query runs through the session-bound client, so RLS is what decides what
 * comes back rather than a filter written here.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  if (!profile.employee_id) {
    return { userId: user.id, profile, employee: null };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", profile.employee_id)
    .maybeSingle();

  return { userId: user.id, profile, employee: employee ?? null };
}

export function displayName(user: CurrentUser) {
  const first = user.employee?.first_name ?? user.profile.first_name;
  const last = user.employee?.last_name ?? user.profile.last_name;

  return [first, last].filter(Boolean).join(" ") || (user.profile.email ?? "Account");
}
