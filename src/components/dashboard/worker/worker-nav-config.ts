import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ClipboardList, UserCircle, Leaf } from "lucide-react";

export type WorkerNavItem = {
  to: string;
  end?: boolean;
  openInNewTab?: boolean;
  icon: LucideIcon;
  label: string;
  description?: string;
};

export const workerMainNav: WorkerNavItem[] = [
  {
    to: "/dashboard/worker",
    end: true,
    icon: LayoutDashboard,
    label: "Overview",
    description: "Shift & region snapshot",
  },
  {
    to: "/dashboard/worker/missions",
    icon: ClipboardList,
    label: "My missions",
    description: "NGO assignments near you",
  },
  {
    to: "/dashboard/worker/profile",
    icon: UserCircle,
    label: "Profile",
    description: "Status & certifications",
  },
];

export const workerSecondaryNav: WorkerNavItem[] = [
  {
    to: "/",
    end: true,
    openInNewTab: true,
    icon: Leaf,
    label: "Public site",
    description: "AquaGuard home (new tab)",
  },
];
