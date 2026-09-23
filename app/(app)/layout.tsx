import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { displayName, getCurrentUser } from "@/lib/services/profile.service";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // The proxy already redirects an unauthenticated request, so reaching here without a
  // user means the session exists but has no profile row. Treated as unauthenticated
  // rather than rendering a shell with nothing behind it.
  if (!user) redirect("/login");

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          role={user.profile.role}
          name={displayName(user)}
          subtitle={user.employee?.employee_number ?? user.profile.role}
        />
        <SidebarInset className="min-w-0">{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
