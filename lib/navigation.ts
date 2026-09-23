import {
  Bell,
  CalendarClock,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings2,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/types/domain";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

const ALL_ROLES: Role[] = ["employee", "hr", "admin"];
const HR_ROLES: Role[] = ["hr", "admin"];

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_ROLES,
      },
      {
        title: "My attendance",
        href: "/attendance",
        icon: CalendarClock,
        roles: ALL_ROLES,
      },
      {
        title: "Corrections",
        href: "/corrections",
        icon: FileText,
        roles: ALL_ROLES,
      },
      {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: "HR",
    items: [
      {
        title: "Approvals",
        href: "/hr/approvals",
        icon: ClipboardCheck,
        roles: HR_ROLES,
      },
      {
        title: "Exceptions",
        href: "/hr/exceptions",
        icon: TriangleAlert,
        roles: HR_ROLES,
      },
      {
        title: "Audit log",
        href: "/hr/audit",
        icon: ScrollText,
        roles: HR_ROLES,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Employees",
        href: "/admin/employees",
        icon: Users,
        roles: ["admin"],
      },
      {
        title: "Attendance rules",
        href: "/admin/rules",
        icon: Settings2,
        roles: ["admin"],
      },
    ],
  },
];

export function sectionsForRole(role: Role): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
