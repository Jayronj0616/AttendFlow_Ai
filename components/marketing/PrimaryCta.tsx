"use client";

import Link from "next/link";

import { SignInDialog } from "@/components/marketing/SignInDialog";
import { Button } from "@/components/ui/button";
import { useHasSessionCookie } from "@/hooks/use-has-session-cookie";

/**
 * "Sign in" for visitors, "Go to dashboard" for anyone already signed in. Decided on the
 * client so the landing page stays static; see useHasSessionCookie.
 */
export function PrimaryCta({ size }: { size: "sm" | "lg" }) {
  const isSignedIn = useHasSessionCookie();

  if (isSignedIn) {
    return (
      <Button asChild size={size}>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    );
  }

  return <SignInDialog trigger={<Button size={size}>Sign in</Button>} />;
}
