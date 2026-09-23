import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/services/profile.service";

/**
 * Guards the administration section. Renders a not-found rather than redirecting, for the
 * same reason as the HR section: the response should not reveal which routes exist.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.profile.role !== "admin") {
    notFound();
  }

  return <>{children}</>;
}
