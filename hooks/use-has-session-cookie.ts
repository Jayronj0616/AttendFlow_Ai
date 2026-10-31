import * as React from "react";

// Cookies raise no change events, so there is nothing to subscribe to. The snapshot is
// read on hydration and on every later render, which is all a button label needs.
function subscribe() {
  return () => {};
}

function hasSessionCookie() {
  // @supabase/ssr writes its session cookies without httpOnly, so they are readable here.
  // A chunked session is stored as `sb-<ref>-auth-token.0`, `.1`, and so on.
  return document.cookie
    .split(";")
    .some((part) => {
      const name = part.trim().split("=", 1)[0];
      return name.startsWith("sb-") && name.includes("auth-token");
    });
}

/**
 * Whether a Supabase session cookie is present. Only a cookie check, not a verified
 * session: it chooses a call to action on public pages and protects nothing — the proxy
 * guards the app itself.
 *
 * Read on the client so those pages can be prerendered. The server snapshot is `false`,
 * so the prerendered HTML shows the signed-out state and a signed-in visitor sees the
 * label switch once hydration runs.
 */
export function useHasSessionCookie() {
  return React.useSyncExternalStore(subscribe, hasSessionCookie, () => false);
}
