import { Link } from "react-router-dom";
import { Camera, ClipboardCheck, HandHeart, HardHat, Plane, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminDashboardVersion } from "@/hooks/useAdminDashboardVersion";
import { getAdminPlatformOverview } from "@/lib/admin-analytics";
import {
  chartCardClass,
  chartInnerClass,
  dashboardAxisTick,
  dashboardChartTooltipStyle,
  dashboardGridStroke,
  pieSliceLabel,
} from "@/lib/dashboard-charts";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AdminOverview() {
  useAdminDashboardVersion();
  const { citizen, ngo, workers } = getAdminPlatformOverview();

  const sevData = [
    { name: "Low", value: citizen.severity.low, fill: "#22c55e" },
    { name: "Medium", value: citizen.severity.medium, fill: "#eab308" },
    { name: "High", value: citizen.severity.high, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  const ngoPartnerData = [
    { name: "Pending", value: citizen.ngoPartner.pending, fill: "#0ea5e9" },
    { name: "Accepted", value: citizen.ngoPartner.accepted, fill: "#22c55e" },
    { name: "Declined", value: citizen.ngoPartner.declined, fill: "#94a3b8" },
  ].filter((d) => d.value > 0);

  const workerStatusData = [
    { name: "Available", value: workers.stats.byStatus.available, fill: "#22c55e" },
    { name: "On assignment", value: workers.stats.byStatus.on_assignment, fill: "#6366f1" },
    { name: "Off duty", value: workers.stats.byStatus.off_duty, fill: "#94a3b8" },
    { name: "Training", value: workers.stats.byStatus.training, fill: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const sevTotal = sevData.reduce((s, d) => s + d.value, 0);
  const workerTotal = workerStatusData.reduce((s, d) => s + d.value, 0);

  const kpis = [
    { label: "Citizen accounts (bundles)", value: citizen.totalUsers, sub: `${citizen.totalReports} reports`, accent: "from-sky-500/20 to-primary/5", icon: Users },
    { label: "NGO missions (active)", value: ngo.kpis.active, sub: `${ngo.incomingPending} citizen requests pending`, accent: "from-teal-500/20 to-ocean-mid/10", icon: HandHeart },
    { label: "Field workers", value: workers.stats.total, sub: `${workers.stats.totalHoursThisMonth} hrs this month`, accent: "from-amber-500/15 to-secondary/10", icon: HardHat },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-slate-500/[0.07] via-card to-primary/[0.05] p-6 md:p-8 shadow-sm">
        <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">Command center</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground leading-relaxed">
          Unified view of citizen activity (all stored user bundles on this device), NGO missions and citizen→NGO queue, and registered field workers.
          Connects to the same demo stores used by citizen and NGO dashboards.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/dashboard/admin/citizens">Citizen drill-down</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/dashboard/admin/ngo">NGO drill-down</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/dashboard/admin/workers">Workers</Link>
          </Button>
          <Button asChild variant="default" size="sm" className="rounded-full">
            <Link to="/dashboard/admin/verify" className="inline-flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Verify reports
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/dashboard/admin/verify-cleanup" className="inline-flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              Verify cleanups
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/dashboard/admin/uav-plastic" className="inline-flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5" />
              UAV & plastic AI
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k, i) => (
          <Card
            key={k.label}
            className={cn("overflow-hidden border-border/70 shadow-sm animate-in fade-in slide-in-from-bottom-2")}
            style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
          >
            <div className={cn("h-1 w-full bg-gradient-to-r", k.accent)} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold tabular-nums">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className={cn(chartCardClass, "lg:col-span-1")}>
          <CardHeader className="border-b border-border/50 bg-muted/15 pb-3">
            <CardTitle className="font-heading text-lg">Reports by severity</CardTitle>
            <CardDescription>Aggregated across citizen bundles</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-4">
            {sevData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No reports in local bundles yet.</p>
            ) : (
              <div className={cn(chartInnerClass, "h-full")}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <text
                      x="50%"
                      y="45%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: 22, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                    >
                      {sevTotal}
                    </text>
                    <text
                      x="50%"
                      y="56%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    >
                      reports
                    </text>
                    <Pie
                      data={sevData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={86}
                      paddingAngle={2.5}
                      label={pieSliceLabel}
                      labelLine={{ stroke: "hsl(var(--border))" }}
                    >
                      {sevData.map((e) => (
                        <Cell key={e.name} fill={e.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={dashboardChartTooltipStyle} formatter={(v: number, n: string) => [`${v}`, n]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(chartCardClass, "lg:col-span-1")}>
          <CardHeader className="border-b border-border/50 bg-muted/15 pb-3">
            <CardTitle className="font-heading text-lg">NGO partner outcomes</CardTitle>
            <CardDescription>Citizen report responses (all users)</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-4">
            {ngoPartnerData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No NGO response data yet.</p>
            ) : (
              <div className={cn(chartInnerClass, "h-full")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ngoPartnerData} layout="vertical" margin={{ left: 4, right: 12, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={dashboardGridStroke} horizontal={false} />
                    <XAxis type="number" tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={76} tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={dashboardChartTooltipStyle} formatter={(v: number) => [`${v} reports`, ""]} />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={26} animationDuration={600}>
                      {ngoPartnerData.map((e) => (
                        <Cell key={e.name} fill={e.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(chartCardClass, "lg:col-span-1")}>
          <CardHeader className="border-b border-border/50 bg-muted/15 pb-3">
            <CardTitle className="font-heading text-lg">Worker availability</CardTitle>
            <CardDescription>Platform workforce registry</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] pt-4">
            <div className={cn(chartInnerClass, "h-full")}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <text
                    x="50%"
                    y="45%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 22, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                  >
                    {workerTotal}
                  </text>
                  <text
                    x="50%"
                    y="56%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  >
                    workers
                  </text>
                  <Pie
                    data={workerStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    label={pieSliceLabel}
                    labelLine={{ stroke: "hsl(var(--border))" }}
                  >
                    {workerStatusData.map((e) => (
                      <Cell key={e.name} fill={e.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={dashboardChartTooltipStyle} formatter={(v: number, n: string) => [`${v}`, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={chartCardClass}>
        <CardHeader className="border-b border-border/50 bg-muted/15">
          <CardTitle className="font-heading text-lg">NGO pipeline snapshot</CardTitle>
          <CardDescription>Shared workspace on this device — relative load at a glance</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {(() => {
            const maxVal = Math.max(ngo.kpis.total, ngo.incomingPending, ngo.incomingAccepted, ngo.kpis.plasticEstimateTotalKg, 1);
            const rows = [
              { label: "Missions total", value: ngo.kpis.total, color: "hsl(var(--primary))", sub: "in workspace" },
              { label: "Citizen queue pending", value: ngo.incomingPending, color: "hsl(var(--primary))", sub: "awaiting NGO" },
              { label: "Queue accepted", value: ngo.incomingAccepted, color: "#22c55e", sub: "converted to missions" },
              { label: "Est. plastic (kg)", value: Math.round(ngo.kpis.plasticEstimateTotalKg), color: "hsl(var(--secondary))", sub: "mission estimates" },
            ];
            return (
              <div className="grid gap-5 sm:grid-cols-2">
                {rows.map((r) => (
                  <div key={r.label} className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-2">
                    <div className="flex justify-between gap-2 items-baseline">
                      <div>
                        <p className="text-sm text-muted-foreground">{r.label}</p>
                        <p className="text-xs text-muted-foreground/80">{r.sub}</p>
                      </div>
                      <p className="text-2xl font-heading font-bold tabular-nums shrink-0">{r.value}</p>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, (r.value / maxVal) * 100)}%`, backgroundColor: r.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
