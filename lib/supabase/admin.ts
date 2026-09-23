import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";

/**
 * Privileged client that bypasses Row Level Security entirely.
 *
 * Only for operations that are legitimately beyond a single user's own rows — the AI tool
 * layer writing an approved correction, or an HR action already authorized in the service
 * layer. Every caller must have verified authentication, role, and record ownership
 * beforehand, because the database will not do it here.
 *
 * For anything acting on behalf of a signed-in user, use `lib/supabase/server.ts` instead.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
