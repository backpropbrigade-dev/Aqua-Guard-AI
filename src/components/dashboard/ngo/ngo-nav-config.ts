import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ClipboardList, BarChart3, Leaf, BookOpen, Inbox } from "lucide-react";

export type NgoNavItem = {
  to: string;
  end?: boolean;
  openInNewTab?: boolean;
  icon: LucideIcon;
  label: string;
  description?: string;
  badgeCount?: number;
};

export const ngoMainNav: NgoNavItem[] = [
  {
    to: "/dashboard/ngo",
    end: true,
    icon: LayoutDashboard,
    label: "Overview",
    description: "KPIs & charts",
  },
  {
    to: "/dashboard/ngo/requests",
    icon: Inbox,
    label: "Citizen requests",
    description: "Accept or decline by severity",
  },
  {
    to: "/dashboard/ngo/missions",
    icon: ClipboardList,
    label: "Field missions",
    description: "Assignments & status",
  },
  {
    to: "/dashboard/ngo/analytics",
    icon: BarChart3,
    label: "Analytics",
    description: "Deeper metrics",
  },
];

export const ngoSecondaryNav: NgoNavItem[] = [
  {
    to: "/dashboard/ngo/resources",
    icon: BookOpen,
    label: "Partner resources",
    description: "Protocols & contacts",
  },
  {
    to: "/",
    end: true,
    openInNewTab: true,
    icon: Leaf,
    label: "Public site",
    description: "AquaGuard home (new tab)",
  },
];
