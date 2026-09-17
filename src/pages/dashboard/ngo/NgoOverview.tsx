import { Link } from "react-router-dom";
import { AlertTriangle, Award, ClipboardList, Inbox, Leaf, Recycle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNgoVersion } from "@/hooks/useNgoVersion";
import { getPendingCitizenRequestCount } from "@/lib/ngo-citizen-requests";
import {
  getNgoAlerts,
  getNgoKpis,
  getNgoPartnerRewards,
  getResponseTrend,
  getSeverityDistribution,
  getStatusDistribution,
  markNgoAlertRead,
} from "@/lib/ngo-store";
import {
  chartCardClass,
  chartInnerClass,
  dashboardAxisTick,
  dashboardChartTooltipStyle,
  dashboardChartWrapperStyle,
  dashboardGridStroke,
  pieSliceLabel,
} from "@/lib/dashboard-charts";
import { cn } from "@/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function NgoOverview() {
  useNgoVersion();
  const partnerRewards = getNgoPartnerRewards();
  const kpis = getNgoKpis();
  const alerts = getNgoAlerts();
  const trend = getResponseTrend();
  const severity = getSeverityDistribution();
  const statusMix = getStatusDistribution();
  const pendingCitizen = getPendingCitizenRequestCount();
  const statusTotal = statusMix.reduce((s, x) => s + x.value, 0);

  const statCards = [
    { label: "Partner reward points", value: partnerRewards.points, icon: Award, accent: "from-emerald-500/20 to-secondary/5" },
    { label: "Active missions", value: kpis.active, icon: ClipboardList, accent: "from-sky-500/20 to-primary/5" },
    { label: "Completed", value: kpis.completed, icon: Leaf, accent: "from-emerald-500/20 to-secondary/5" },
    { label: "Open high severity", value: kpis.highOpen, icon: AlertTriangle, accent: "from-red-500/15 to-destructive/5" },
    { label: "Est. plastic (kg)", value: Math.round(kpis.plasticEstimateTotalKg), icon: Recycle, accent: "from-ocean-mid/25 to-primary/5" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-ocean-mid/[0.08] via-card to-primary/[0.04] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Partner overview</p>
            <h2 className="font-heading mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">NGO dashboard</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Same pattern as the citizen app: local demo data, expandable with your API. Track missions, severity, and network response trends.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button asChild variant="default" className="rounded-full">
              <Link to="/dashboard/ngo/requests">
                <Inbox className="h-4 w-4 mr-2" />
                Citizen requests
                {pendingCitizen > 0 && (
                  <span className="ml-2 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs tabular-nums">{pendingCitizen}</span>
                )}
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/dashboard/ngo/missions">
                <ClipboardList className="h-4 w-4 mr-2" />
                Field missions
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((s, i) => (
          <Card
            key={s.label}
            className={cn(
              "overflow-hidden border-border/70 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20",
              "animate-in fade-in slide-in-from-bottom-2 fill-mode-both",
            )}
            style={{ animationDelay: `${i * 70}ms`, animationFillMode: "backwards" }}
          >
            <div className={cn("h-1 w-full bg-gradient-to-r", s.accent)} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {alerts.some((a) => !a.read) && (
        <Card className="border-amber-500/30 bg-amber-500/5 animate-in fade-in duration-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Partner notices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts
              .filter((a) => !a.read)
              .map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border/60 bg-background/80 p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.body}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="rounded-lg shrink-0" onClick={() => markNgoAlertRead(a.id)}>
                    Dismiss
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={cn(chartCardClass, "animate-in fade-in slide-in-from-left-2 duration-500")}>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="font-heading text-lg">Response trend</CardTitle>
            <CardDescription>Assigned vs completed — network throughput</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-5">
            <div className={cn(chartInnerClass, "h-full")}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="ngoA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="ngoB" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={dashboardGridStroke} vertical={false} />
                  <XAxis dataKey="month" tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                  <YAxis tick={dashboardAxisTick()} width={36} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={dashboardChartTooltipStyle}
                    wrapperStyle={dashboardChartWrapperStyle}
                    formatter={(v: number) => [v, ""]}
                    labelFormatter={(l) => String(l)}
                  />
                  <Legend wrapperStyle={{ paddingTop: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="assigned"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#ngoA)"
                    name="Assigned"
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fill="url(#ngoB)"
                    name="Completed"
                    activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(chartCardClass, "animate-in fade-in slide-in-from-right-2 duration-500")}>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="font-heading text-lg">Mission status mix</CardTitle>
            <CardDescription>Share of missions by workflow stage</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-5">
            <div className={cn(chartInnerClass, "h-full")}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <text
                    x="50%"
                    y="46%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 26, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                  >
                    {statusTotal}
                  </text>
                  <text
                    x="50%"
                    y="56%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: 11, fontWeight: 500, fill: "hsl(var(--muted-foreground))" }}
                  >
                    missions
                  </text>
                  <Pie
                    data={statusMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={2.5}
                    animationDuration={700}
                    label={pieSliceLabel}
                    labelLine={{ stroke: "hsl(var(--border))" }}
                  >
                    {statusMix.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={dashboardChartTooltipStyle}
                    formatter={(v: number, name: string) => [`${v} missions`, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={chartCardClass}>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="font-heading text-lg">Severity distribution</CardTitle>
          <CardDescription>Portfolio weight by environmental risk level</CardDescription>
        </CardHeader>
        <CardContent className="h-[280px] pt-5">
          <div className={cn(chartInnerClass, "h-full")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severity} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <defs>
                  {severity.map((e) => (
                    <linearGradient key={e.name} id={`sev-${e.name.replace(/\s+/g, "")}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={e.fill} stopOpacity={0.88} />
                      <stop offset="100%" stopColor={e.fill} stopOpacity={0.42} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={dashboardGridStroke} horizontal={false} />
                <XAxis type="number" tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={dashboardAxisTick()} width={72} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={dashboardChartTooltipStyle} formatter={(v: number) => [`${v} missions`, "Count"]} />
                <Bar dataKey="value" name="Missions" radius={[0, 10, 10, 0]} animationDuration={700} barSize={28}>
                  {severity.map((e) => (
                    <Cell key={e.name} fill={`url(#sev-${e.name.replace(/\s+/g, "")})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
