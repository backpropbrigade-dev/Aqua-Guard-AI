import { NavLink, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession } from "@/lib/session";
import { useAdminDashboardVersion } from "@/hooks/useAdminDashboardVersion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { adminMainNav, adminSecondaryNav, type AdminNavItem } from "./admin-nav-config";

type AdminSidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  forceExpanded?: boolean;
  onNavigate?: () => void;
};

function NavRow({
  item,
  collapsed,
  showTooltip,
  onNavigate,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  showTooltip: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      target={item.openInNewTab ? "_blank" : undefined}
      rel={item.openInNewTab ? "noopener noreferrer" : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
          "hover:bg-accent/80 hover:text-accent-foreground",
          isActive && "bg-primary/15 text-primary shadow-sm",
          !isActive && "text-muted-foreground",
        )
      }
    >
      <Icon className="h-[1.15rem] w-[1.15rem] shrink-0 transition-colors group-hover:text-primary" strokeWidth={2} />
      {(!collapsed || !showTooltip) && <span className="flex-1 truncate text-left">{item.label}</span>}
    </NavLink>
  );

  if (collapsed && showTooltip) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px]">
          <p className="font-medium">{item.label}</p>
          {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
  forceExpanded = false,
  onNavigate,
}: AdminSidebarProps) {
  const navigate = useNavigate();
  const expanded = forceExpanded || !collapsed;
  useAdminDashboardVersion();

  const handleLogout = () => {
    clearSession();
    onNavigate?.();
    navigate("/login?role=admin");
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl shadow-sm",
        expanded ? "w-[260px]" : "w-[72px]",
        "transition-[width] duration-300 ease-out",
      )}
    >
      <div
        className={cn(
          "flex border-b border-border/50 px-3 py-4 min-h-[4.5rem]",
          expanded ? "items-center gap-2" : "flex-col items-center justify-center py-3",
        )}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-primary shadow-md shadow-primary/20">
          <Shield className="h-6 w-6 text-primary-foreground" strokeWidth={1.75} />
        </div>
        {expanded && (
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-foreground leading-tight truncate">Authority</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Admin console</p>
          </div>
        )}
        {expanded && !forceExpanded && (
          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-lg h-9 w-9" onClick={onToggleCollapse} aria-label="Collapse sidebar">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!forceExpanded && !expanded && (
        <div className="flex justify-center border-b border-border/50 py-2">
          <Button type="button" variant="ghost" size="icon" className="rounded-lg h-9 w-9" onClick={onToggleCollapse} aria-label="Expand sidebar">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0 px-2 py-3">
        <p className={cn("mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", !expanded && !forceExpanded && "sr-only")}>
          Platform
        </p>
        <nav className="flex flex-col gap-1">
          {adminMainNav.map((item) => (
            <NavRow key={item.to} item={item} collapsed={!expanded} showTooltip={!forceExpanded} onNavigate={onNavigate} />
          ))}
        </nav>
        <p className={cn("mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", !expanded && !forceExpanded && "sr-only")}>
          More
        </p>
        <nav className="flex flex-col gap-1">
          {adminSecondaryNav.map((item) => (
            <NavRow key={item.to} item={item} collapsed={!expanded} showTooltip={!forceExpanded} onNavigate={onNavigate} />
          ))}
        </nav>
      </ScrollArea>

      <div className={cn("border-t border-border/50 p-3", !expanded && !forceExpanded && "px-2")}>
        {expanded || forceExpanded ? (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </Button>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleLogout} aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
