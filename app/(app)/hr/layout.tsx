import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/services/profile.service";

/**
 * Guards the whole HR section.
 *
 * Renders a not-found rather than redirecting, so an employee cannot use the response to
 * learn which HR routes exist. RLS still governs the data underneath; this only avoids
 * rendering a page whose queries would all come back empty.
 */
export default async function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || (user.profile.role !== "hr" && user.profile.role !== "admin")) {
    notFound();
  }

  return <>{children}</>;
}
