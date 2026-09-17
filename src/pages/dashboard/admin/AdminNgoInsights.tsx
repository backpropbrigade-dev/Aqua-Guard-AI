import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminDashboardVersion } from "@/hooks/useAdminDashboardVersion";
import { getNgoAdminSnapshot } from "@/lib/admin-analytics";
import { chartCardClass, chartInnerClass, dashboardChartTooltipStyle, pieSliceLabel } from "@/lib/dashboard-charts";
import { cn } from "@/lib/utils";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const missionStatusColors: Record<string, string> = {
  assigned: "#0ea5e9",
  in_progress: "#6366f1",
  pending_verification: "#f59e0b",
  completed: "#22c55e",
  deferred: "#94a3b8",
};

export default function AdminNgoInsights() {
  useAdminDashboardVersion();
  const snap = getNgoAdminSnapshot();

  const missionMix = ["assigned", "in_progress", "pending_verification", "completed", "deferred"].map((s) => ({
    name: s.replace("_", " "),
    value: snap.missions.filter((m) => m.status === s).length,
    fill: missionStatusColors[s] ?? "#64748b",
  })).filter((d) => d.value > 0);

  const missionMixTotal = missionMix.reduce((s, d) => s + d.value, 0);
  const queueRows = [
    { label: "Pending partner action", value: snap.incomingPending, color: "hsl(var(--primary))" },
    { label: "Accepted (missions created)", value: snap.incomingAccepted, color: "#22c55e" },
    { label: "Declined", value: snap.incomingDeclined, color: "#94a3b8" },
  ];
  const queueMax = Math.max(snap.incomingTotal, 1);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div>
        <h2 className="font-heading text-2xl font-bold">NGO & missions</h2>
        <p className="text-sm text-muted-foreground mt-1">Same NGO workspace as the partner dashboard — missions and citizen request queue.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active missions</CardDescription>
            <CardTitle className="text-3xl font-heading">{snap.kpis.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl font-heading">{snap.kpis.completed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Citizen queue pending</CardDescription>
            <CardTitle className="text-3xl font-heading text-primary">{snap.incomingPending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High-severity open</CardDescription>
            <CardTitle className="text-3xl font-heading text-red-600">{snap.kpis.highOpen}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={chartCardClass}>
          <CardHeader className="border-b border-border/50 bg-muted/15">
            <CardTitle className="font-heading text-lg">Mission status mix</CardTitle>
            <CardDescription>Workspace distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            {missionMix.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-16">No missions.</p>
            ) : (
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
                      {missionMixTotal}
                    </text>
                    <text
                      x="50%"
                      y="58%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    >
                      missions
                    </text>
                    <Pie
                      data={missionMix}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={2.5}
                      label={pieSliceLabel}
                      labelLine={{ stroke: "hsl(var(--border))" }}
                    >
                      {missionMix.map((e) => (
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

        <Card className={chartCardClass}>
          <CardHeader className="border-b border-border/50 bg-muted/15">
            <CardTitle className="font-heading text-lg">Citizen → NGO queue</CardTitle>
            <CardDescription>Lifecycle load vs total queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5 text-sm">
            <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
              <div className="flex justify-between items-baseline">
                <span className="text-muted-foreground">Total in queue</span>
                <span className="text-2xl font-heading font-bold tabular-nums">{snap.incomingTotal}</span>
              </div>
            </div>
            {queueRows.map((row) => (
              <div key={row.label} className="space-y-2 rounded-xl border border-border/60 px-4 py-3">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-semibold tabular-nums" style={{ color: row.color }}>
                    {row.value}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (row.value / queueMax) * 100)}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">All missions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snap.missions.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="max-w-[220px]">
                    <span className="font-medium line-clamp-2">{m.title}</span>
                    <p className="text-xs text-muted-foreground truncate">{m.region}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("capitalize rounded-full", m.severity === "high" && "border-red-500/40")}>
                      {m.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize text-sm">{m.status.replace("_", " ")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.source.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right tabular-nums">P{m.priority}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
