import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // robots.txt and sitemap.xml are excluded explicitly. They are public by definition and
  // need no session, and without this the auth guard redirects them to the sign-in page —
  // so a crawler asking for robots.txt receives a noindex HTML page instead.
  //
  //
  // api/op is the first-party OpenPanel proxy. Anonymous visitors hit it, and the auth
  // guard would otherwise answer with a redirect to the sign-in page.
  //
  // The landing page "/" is excluded too, by requiring at least one character after the
  // slash (`.+`). It is public and prerendered, and running the proxy in front of it would
  // invoke a function, and for signed-in visitors call the auth server, on every view of
  // a page the CDN could serve on its own. Its sign-in Server Action needs no proxy: it
  // writes the session cookies itself, and /dashboard, where it redirects, is matched.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/op|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).+)",
  ],
};
