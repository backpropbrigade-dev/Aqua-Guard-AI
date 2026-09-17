import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Award, ClipboardList, Clock, HardHat, MapPin, PieChart as PieChartIcon, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { getWorkerSelfView, type WorkerRole } from "@/lib/worker-store";
import { getMissionsForWorkerRegion } from "@/lib/ngo-store";
import { useWorkerVersion } from "@/hooks/useWorkerVersion";
import {
  chartCardClass,
  chartInnerClass,
  dashboardAxisTick,
  dashboardChartTooltipStyle,
  dashboardGridStroke,
} from "@/lib/dashboard-charts";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const statusVisualLabels: Record<string, string> = {
  assigned: "Assigned",
  in_progress: "In progress",
  pending_verification: "Proof pending",
  completed: "Completed",
  deferred: "Deferred",
};

const statusVisualColors: Record<string, string> = {
  assigned: "#0ea5e9",
  in_progress: "#6366f1",
  pending_verification: "#f59e0b",
  completed: "#22c55e",
  deferred: "#94a3b8",
};

const fieldRoleLabels: Record<WorkerRole, string> = {
  cleanup_crew: "Cleanup crew",
  drone_operator: "Drone operator",
  coastal_inspector: "Coastal inspector",
};

const statusLabels: Record<string, string> = {
  available: "Available",
  on_assignment: "On assignment",
  off_duty: "Off duty",
  training: "Training",
};

export default function WorkerOverview() {
  useWorkerVersion();
  const session = getSession();
  const identifier = session?.identifier ?? "";
  const { profile, matchedRegistry } = getWorkerSelfView(identifier);
  const queue = getMissionsForWorkerRegion(profile.region);
  const activeMissions = queue.filter(
    (m) => m.status === "assigned" || m.status === "in_progress" || m.status === "pending_verification",
  ).length;

  const missionMix = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const m of queue) {
      acc[m.status] = (acc[m.status] ?? 0) + 1;
    }
    return Object.entries(acc).map(([status, value]) => ({
      status,
      name: statusVisualLabels[status] ?? status.replace(/_/g, " "),
      value,
      fill: statusVisualColors[status] ?? "#64748b",
    }));
  }, [queue]);

  const rewardPts = profile.rewardPoints ?? 0;
  const statCards = [
    { label: "Reward points", value: String(rewardPts), icon: Award, accent: "from-emerald-500/25 to-primary/5" },
    { label: "Status", value: statusLabels[profile.status] ?? profile.status, icon: ShieldAlert, accent: "from-amber-500/25 to-primary/5" },
    { label: "Home region", value: profile.region, icon: MapPin, accent: "from-sky-500/20 to-primary/5" },
    { label: "Hours (month)", value: String(profile.hoursThisMonth), icon: Clock, accent: "from-violet-500/20 to-secondary/5" },
    { label: "Missions done", value: String(profile.missionsCompleted), icon: HardHat, accent: "from-emerald-500/20 to-secondary/5" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-amber-500/[0.08] via-card to-primary/[0.04] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Field worker</p>
            <h2 className="font-heading mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">Welcome, {profile.name}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {fieldRoleLabels[profile.workerRole]} · Your queue is synced with the NGO mission registry on this device (demo data).
            </p>
            {!matchedRegistry && (
              <p className="mt-3 text-xs text-amber-800 dark:text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 max-w-xl">
                No registry match for <span className="font-medium">{identifier || "your login"}</span>. Try{" "}
                <span className="font-mono text-[11px]">priya@aquaguard.demo</span>,{" "}
                <span className="font-mono text-[11px]">marcus@aquaguard.demo</span>, or{" "}
                <span className="font-mono text-[11px]">elena@aquaguard.demo</span> to load a seeded field profile.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button asChild className="rounded-full">
              <Link to="/dashboard/worker/missions">
                <ClipboardList className="h-4 w-4 mr-2" />
                My missions
                {activeMissions > 0 && (
                  <span className="ml-2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs tabular-nums">{activeMissions}</span>
                )}
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard/worker/profile">Profile & status</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((s, i) => (
          <Card
            key={s.label}
            className={cn(
              "overflow-hidden border-border/70 shadow-sm transition-all duration-300 hover:shadow-md hover:border-amber-500/25",
              "animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
            )}
            style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
          >
            <div className={cn("h-1 w-full bg-gradient-to-r", s.accent)} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <p className="font-heading text-xl font-bold leading-snug">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {missionMix.length > 0 && (
        <Card className={chartCardClass}>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-amber-600" />
              Regional queue mix
            </CardTitle>
            <CardDescription>Mission statuses in your area (demo registry)</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] pt-5">
            <div className={cn(chartInnerClass, "h-full")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missionMix} layout="vertical" margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={dashboardGridStroke} horizontal={false} />
                  <XAxis type="number" tick={dashboardAxisTick()} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={dashboardChartTooltipStyle} formatter={(v: number) => [`${v} missions`, ""]} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22} animationDuration={600}>
                    {missionMix.map((e) => (
                      <Cell key={e.status} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Next up</CardTitle>
          <CardDescription>Missions prioritized for your region (demo).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.slice(0, 4).map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <div>
                <p className="font-medium text-sm">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.region}</p>
              </div>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.status.replace("_", " ")}</span>
            </div>
          ))}
          {queue.length === 0 && <p className="text-sm text-muted-foreground">No missions in queue.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
