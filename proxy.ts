import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // robots.txt and sitemap.xml are excluded explicitly. They are public by definition and
  // need no session, and without this the auth guard redirects them to the sign-in page —
  // so a crawler asking for robots.txt receives a noindex HTML page instead.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
