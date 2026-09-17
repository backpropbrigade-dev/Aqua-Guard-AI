import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminDashboardVersion } from "@/hooks/useAdminDashboardVersion";
import { getWorkersAdminSnapshot, type WorkerStatus } from "@/lib/admin-analytics";
import { updateWorkerStatus, type FieldWorker } from "@/lib/worker-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
};

const roleLabel: Record<FieldWorker["workerRole"], string> = {
  cleanup_crew: "Cleanup crew",
  drone_operator: "Drone operator",
  coastal_inspector: "Coastal inspector",
};

const statusOptions: WorkerStatus[] = ["available", "on_assignment", "off_duty", "training"];

export default function AdminWorkers() {
  useAdminDashboardVersion();
  const { workers, stats } = getWorkersAdminSnapshot();

  const roleChart = (["cleanup_crew", "drone_operator", "coastal_inspector"] as const).map((r) => ({
    name: roleLabel[r],
    count: stats.byRole[r],
    fill: r === "cleanup_crew" ? "#0ea5e9" : r === "drone_operator" ? "#6366f1" : "#14b8a6",
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div>
        <h2 className="font-heading text-2xl font-bold">Workers & field teams</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Demo registry for cleanup crews, drone operators, and inspectors. Status changes persist in localStorage for this browser.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total workers</CardDescription>
            <CardTitle className="text-3xl font-heading">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On assignment</CardDescription>
            <CardTitle className="text-3xl font-heading text-indigo-600">{stats.byStatus.on_assignment}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-3xl font-heading text-emerald-600">{stats.byStatus.available}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hours logged (month)</CardDescription>
            <CardTitle className="text-3xl font-heading tabular-nums">{stats.totalHoursThisMonth}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Workforce by role</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roleChart}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={28} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Workers" radius={[6, 6, 0, 0]}>
                {roleChart.map((e) => (
                  <Cell key={e.name} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {workers.map((w, i) => (
          <Card
            key={w.id}
            className={cn("border-border/70 animate-in fade-in slide-in-from-bottom-2")}
            style={{ animationDelay: `${Math.min(i * 60, 300)}ms`, animationFillMode: "backwards" }}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="font-heading text-lg">{w.name}</CardTitle>
                  <CardDescription>{roleLabel[w.workerRole]} · {w.region}</CardDescription>
                </div>
                <Badge variant="outline" className="capitalize rounded-full">
                  {w.status.replace("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">
                Missions: <span className="font-medium text-foreground">{w.missionsCompleted}</span> · This month:{" "}
                <span className="font-medium text-foreground">{w.hoursThisMonth}h</span>
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">Certs: {w.certifications.join(", ")}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">Set status</span>
                <Select
                  value={w.status}
                  onValueChange={(v) => {
                    updateWorkerStatus(w.id, v as WorkerStatus);
                    toast.success(`${w.name} → ${v.replace("_", " ")}`);
                  }}
                >
                  <SelectTrigger className="rounded-xl h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground">Last active {new Date(w.lastActiveAt).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
