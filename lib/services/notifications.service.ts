import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types/domain";

export async function getNotifications(limit = 50): Promise<Notification[]> {
  const supabase = await createClient();

  // Not filtered by user here: the RLS policy on notifications already restricts rows to
  // the caller, and repeating that filter in application code would imply it is what
  // enforces the boundary.
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
