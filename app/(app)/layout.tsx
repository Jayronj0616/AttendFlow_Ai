import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { mockEmployee } from "@/lib/mock/data";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const name = `${mockEmployee.first_name} ${mockEmployee.last_name}`;

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          role="employee"
          name={name}
          subtitle={mockEmployee.employee_number}
        />
        <SidebarInset className="min-w-0">{children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
