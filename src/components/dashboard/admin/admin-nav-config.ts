import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, HandHeart, HardHat, Leaf, Plane, ClipboardCheck, Camera } from "lucide-react";

export type AdminNavItem = {
  to: string;
  end?: boolean;
  /** Open in a new tab so the dashboard session stays open in this tab. */
  openInNewTab?: boolean;
  icon: LucideIcon;
  label: string;
  description?: string;
};

export const adminMainNav: AdminNavItem[] = [
  {
    to: "/dashboard/admin",
    end: true,
    icon: LayoutDashboard,
    label: "Command center",
    description: "Cross-platform analytics",
  },
  {
    to: "/dashboard/admin/verify",
    icon: ClipboardCheck,
    label: "Verify reports",
    description: "Before NGO sees them",
  },
  {
    to: "/dashboard/admin/verify-cleanup",
    icon: Camera,
    label: "Verify cleanups",
    description: "Photo proof before rewards",
  },
  {
    to: "/dashboard/admin/citizens",
    icon: Users,
    label: "Citizens",
    description: "Reports & NGO responses",
  },
  {
    to: "/dashboard/admin/ngo",
    icon: HandHeart,
    label: "NGO & missions",
    description: "Queue & field ops",
  },
  {
    to: "/dashboard/admin/workers",
    icon: HardHat,
    label: "Workers",
    description: "Crews & operators",
  },
  {
    to: "/dashboard/admin/uav-plastic",
    icon: Plane,
    label: "UAV & plastic AI",
    description: "Auto-dispatch over threshold",
  },
];

export const adminSecondaryNav: AdminNavItem[] = [
  {
    to: "/",
    end: true,
    openInNewTab: true,
    icon: Leaf,
    label: "Public site",
    description: "AquaGuard home (new tab)",
  },
];
