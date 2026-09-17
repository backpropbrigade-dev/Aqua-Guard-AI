import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Camera,
  Map,
  FileStack,
  Trophy,
  UserRound,
  Settings,
  HelpCircle,
} from "lucide-react";

export type CitizenNavItem = {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  label: string;
  description?: string;
  /** Numeric badge (e.g. unread notifications) */
  badgeCount?: number;
};

export const citizenMainNav: CitizenNavItem[] = [
  {
    to: "/dashboard/citizen",
    end: true,
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Overview & quick stats",
  },
  {
    to: "/dashboard/citizen/report",
    icon: Camera,
    label: "Report Pollution",
    description: "Upload, camera, location",
  },
  {
    to: "/dashboard/citizen/map",
    icon: Map,
    label: "Nearby Pollution Map",
    description: "Hotspots & markers",
  },
  {
    to: "/dashboard/citizen/my-reports",
    icon: FileStack,
    label: "My Reports",
    description: "Track status & filter",
  },
  {
    to: "/dashboard/citizen/rewards",
    icon: Trophy,
    label: "Rewards & Achievements",
    description: "Points & badges",
  },
  {
    to: "/dashboard/citizen/profile",
    icon: UserRound,
    label: "Profile",
    description: "Your details & stats",
  },
];

export const citizenSecondaryNav: CitizenNavItem[] = [
  {
    to: "/dashboard/citizen/settings",
    icon: Settings,
    label: "Settings",
    description: "Notifications & privacy",
  },
  {
    to: "/dashboard/citizen/help",
    icon: HelpCircle,
    label: "Help / Support",
    description: "FAQs & contact",
  },
];
