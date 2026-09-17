import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { getUnreadNotificationCount } from "@/lib/citizen-store";
import { cn } from "@/lib/utils";

export function HeaderNotificationsButton() {
  useCitizenVersion();
  const unread = getUnreadNotificationCount();

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("relative rounded-xl shrink-0", unread > 0 && "border-primary/30")}
      asChild
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <Link to="/dashboard/citizen/notifications">
        <Bell className="h-[1.15rem] w-[1.15rem]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
