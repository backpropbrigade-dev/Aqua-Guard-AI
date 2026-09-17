import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNgoVersion } from "@/hooks/useNgoVersion";
import {
  chartCardClass,
  chartInnerClass,
  dashboardAxisTick,
  dashboardChartTooltipStyle,
  dashboardGridStroke,
  pieSliceLabel,
} from "@/lib/dashboard-charts";
import { getResponseTrend, getSeverityDistribution, getStatusDistribution } from "@/lib/ngo-store";
import { cn } from "@/lib/utils";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function severityGradientId(name: string) {
  return `sev-an-${name.replace(/\s+/g, "")}`;
}

export default function NgoAnalytics() {
  useNgoVersion();
  const trend = getResponseTrend();
  const severity = getSeverityDistribution();
  const statusMix = getStatusDistribution();

  const hoursTrend = trend.map((t) => ({ month: t.month, hours: t.volunteerHours }));
  const statusTotal = statusMix.reduce((s, x) => s + x.value, 0);
  const maxHours = Math.max(1, ...hoursTrend.map((h) => h.hours));

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">Analytics</h2>
        <p className="text-sm text-muted-foreground mt-1">Volunteer effort, mission flow, and risk composition.</p>
      </div>

      <Card className={cn(chartCardClass, "animate-in fade-in duration-500")}>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="font-heading text-lg">Volunteer hours momentum</CardTitle>
          <CardDescription>Monthly hours — shaded band shows scale of partner effort</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] pt-5">
          <div className={cn(chartInnerClass, "h-full")}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={hoursTrend} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="volHoursFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={dashboardGridStroke} vertical={false} />
                <XAxis dataKey="month" tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                <YAxis
                  tick={dashboardAxisTick()}
                  width={44}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, Math.ceil(maxHours * 1.12)]}
                />
                <Tooltip
                  contentStyle={dashboardChartTooltipStyle}
                  formatter={(v: number) => [`${v} hrs`, "Volunteer hours"]}
                />
                <Legend wrapperStyle={{ paddingTop: 10 }} />
                <Area type="monotone" dataKey="hours" stroke="none" fill="url(#volHoursFill)" name="Hours (band)" legendType="none" />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))" }}
                  activeDot={{ r: 7 }}
                  name="Hours"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={chartCardClass}>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="font-heading text-lg">Assignments vs completions</CardTitle>
            <CardDescription>Monthly field throughput</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-5">
            <div className={cn(chartInnerClass, "h-full")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="barAssigned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0369a1" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="barCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                      <stop offset="100%" stopColor="#15803d" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={dashboardGridStroke} vertical={false} />
                  <XAxis dataKey="month" tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                  <YAxis tick={dashboardAxisTick()} width={36} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={dashboardChartTooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: 8 }} />
                  <Bar dataKey="assigned" fill="url(#barAssigned)" name="Assigned" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="completed" fill="url(#barCompleted)" name="Completed" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={chartCardClass}>
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <CardTitle className="font-heading text-lg">Severity profile</CardTitle>
            <CardDescription>Mission count by risk tier</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-5">
            <div className={cn(chartInnerClass, "h-full")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severity} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                  <defs>
                    {severity.map((e) => (
                      <linearGradient key={e.name} id={severityGradientId(e.name)} x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor={e.fill} stopOpacity={0.75} />
                        <stop offset="100%" stopColor={e.fill} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={dashboardGridStroke} vertical={false} />
                  <XAxis dataKey="name" tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                  <YAxis tick={dashboardAxisTick()} width={36} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={dashboardChartTooltipStyle} formatter={(v: number) => [`${v} missions`, ""]} />
                  <Bar dataKey="value" name="Missions" radius={[10, 10, 0, 0]} animationDuration={700} maxBarSize={48}>
                    {severity.map((e) => (
                      <Cell key={e.name} fill={`url(#${severityGradientId(e.name)})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={chartCardClass}>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="font-heading text-lg">Status snapshot</CardTitle>
          <CardDescription>Workflow stages in your workspace</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 items-center">
            <div className="h-[240px]">
              <div className={cn(chartInnerClass, "h-full")}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <text
                      x="50%"
                      y="46%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: 24, fontWeight: 700, fill: "hsl(var(--foreground))" }}
                    >
                      {statusTotal}
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    >
                      total
                    </text>
                    <Pie
                      data={statusMix}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      label={pieSliceLabel}
                      labelLine={{ stroke: "hsl(var(--border))" }}
                    >
                      {statusMix.map((s) => (
                        <Cell key={s.name} fill={s.fill} stroke="hsl(var(--background))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={dashboardChartTooltipStyle}
                      formatter={(v: number, n: string) => [`${v}`, n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <ul className="space-y-3">
              {statusMix.map((s) => {
                const pct = statusTotal > 0 ? Math.round((s.value / statusTotal) * 100) : 0;
                return (
                  <li key={s.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{s.name}</span>
                      <span className="font-heading font-semibold tabular-nums" style={{ color: s.fill }}>
                        {s.value}{" "}
                        <span className="text-muted-foreground font-normal text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: s.fill }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
