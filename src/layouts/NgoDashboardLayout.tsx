import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NgoSidebar } from "@/components/dashboard/ngo/NgoSidebar";
const SIDEBAR_KEY = "aquaguard_ngo_sidebar_collapsed";

function titleFromPath(pathname: string): string {
  if (pathname === "/dashboard/ngo" || pathname === "/dashboard/ngo/") return "Overview";
  if (pathname.includes("/requests")) return "Citizen requests";
  if (pathname.includes("/missions")) return "Field missions";
  if (pathname.includes("/analytics")) return "Analytics";
  if (pathname.includes("/resources")) return "Partner resources";
  return "NGO dashboard";
}

export default function NgoDashboardLayout() {
  const session = getSession();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => typeof localStorage !== "undefined" && localStorage.getItem(SIDEBAR_KEY) === "1");

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const toggleCollapse = useCallback(() => setCollapsed((c) => !c), []);

  if (!session) {
    return <Navigate to="/login?role=ngo" replace />;
  }
  if (session.role === "citizen") {
    return <Navigate to="/dashboard/citizen" replace />;
  }
  if (session.role === "admin") {
    return <Navigate to="/dashboard/admin" replace />;
  }
  if (session.role === "worker") {
    return <Navigate to="/dashboard/worker" replace />;
  }
  if (session.role !== "ngo") {
    return <Navigate to="/login?role=ngo" replace />;
  }

  const pageTitle = titleFromPath(location.pathname);

  return (
    <div className="min-h-screen bg-background font-body text-foreground flex">
      <aside className="hidden md:flex h-screen sticky top-0 z-30">
        <NgoSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 glass px-4 shadow-sm md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden shrink-0 rounded-xl" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 border-border/60">
              <SheetTitle className="sr-only">NGO navigation</SheetTitle>
              <NgoSidebar collapsed={false} onToggleCollapse={() => {}} forceExpanded onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-lg font-semibold tracking-tight truncate">{pageTitle}</h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              Partner workspace{session.identifier ? ` · ${session.identifier.split("@")[0]}` : ""}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl shrink-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark mode"
          >
            <Sun className="h-[1.15rem] w-[1.15rem] dark:hidden" />
            <Moon className="h-[1.15rem] w-[1.15rem] hidden dark:block" />
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-gradient-to-b from-background via-background to-ocean-mid/[0.06] dark:to-ocean-mid/[0.09]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
