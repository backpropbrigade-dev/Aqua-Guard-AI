import { useEffect, useCallback, useState } from "react";
import { Plane, Radar, RefreshCw, MapPin, Satellite } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HybridUavMonitoringDemo } from "@/components/dashboard/admin/HybridUavMonitoringDemo";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminDashboardVersion } from "@/hooks/useAdminDashboardVersion";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import {
  UAV_PLASTIC_WATER_ALERT_MIN_PERCENT,
  UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT,
} from "@/lib/plastic-uav-algorithm";
import {
  completePlasticUavDispatch,
  getUavPlasticAutomationSnapshot,
  markUavArrivedOnStation,
  recallUavToBase,
  resetUavPlasticAutomationDemo,
  runPlasticUavAutoDispatchScan,
  type UavDispatchRecord,
} from "@/lib/uav-plastic-automation";
import { getSatelliteUavSchedulerStatus } from "@/lib/uav-satellite-scheduler";
import { formatDistanceKm } from "@/lib/geo";
import { cn } from "@/lib/utils";

function formatRelativeFuture(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Due now (on next check)";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 72) return new Date(iso).toLocaleString();
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

function dispatchSourceLabel(source: UavDispatchRecord["dispatchSource"]): { text: string; className: string } {
  if (source === "satellite_interval") {
    return {
      text: "Satellite ingest",
      className: "border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100",
    };
  }
  return { text: "Citizen sync", className: "border-border/60 bg-muted/50" };
}

const uavStatusClass: Record<string, string> = {
  idle: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  en_route: "bg-sky-500/15 text-sky-800 dark:text-sky-200",
  on_station: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  returning: "bg-violet-500/15 text-violet-800 dark:text-violet-200",
};

const phaseLabel: Record<string, string> = {
  routing: "En route",
  on_station: "On station",
  completed: "Completed",
};

export default function AdminUavPlastic() {
  useAdminDashboardVersion();
  const citizenV = useCitizenVersion();
  const [, setSchedTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSchedTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const satelliteSched = getSatelliteUavSchedulerStatus();

  const runScan = useCallback(
    (silent: boolean) => {
      const { assigned, skippedNoUav } = runPlasticUavAutoDispatchScan();
      if (!silent && assigned === 0 && skippedNoUav === 0) {
        toast.message("No new high-severity sites need a UAV.");
      }
      if (!silent && assigned > 0) {
        toast.success(`Dispatched ${assigned} UAV${assigned === 1 ? "" : "s"} to coordinates over ${UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT}% severity.`);
      }
      if (!silent && skippedNoUav > 0) {
        toast.warning(`${skippedNoUav} site(s) exceed threshold but all UAVs are busy — add fleet or complete missions.`);
      }
      return { assigned, skippedNoUav };
    },
    [],
  );

  useEffect(() => {
    const { assigned, skippedNoUav } = runPlasticUavAutoDispatchScan();
    if (assigned > 0) {
      toast.success(`Auto-routed ${assigned} UAV${assigned === 1 ? "" : "s"} (severity > ${UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT}%).`);
    }
    if (skippedNoUav > 0 && assigned === 0) {
      toast.warning(`${skippedNoUav} alert(s) waiting: no idle UAV.`);
    }
  }, [citizenV]);

  const snap = getUavPlasticAutomationSnapshot();

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-10">
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-sky-500/[0.07] via-card to-primary/[0.04] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">Authority · automation</p>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl flex items-center gap-2">
              <Plane className="h-8 w-8 text-sky-600 shrink-0" />
              Plastic detection & UAV routing
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed">
              UAVs launch when a report hits the <strong>authority review queue</strong> (every new citizen submission), when a{" "}
              <strong>plastic-in-water alert</strong> fires (plastic indicated and severity ≥ {UAV_PLASTIC_WATER_ALERT_MIN_PERCENT}%), or when an approved
              report exceeds <strong>{UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT}%</strong> severity. The nearest idle craft goes{" "}
              <strong>en route</strong> immediately after upload (demo scan). While the app is open, the same policy also runs{" "}
              <strong>every {satelliteSched.intervalHours} hours</strong> as a simulated <strong>satellite imagery ingest</strong> pass. Tune thresholds in{" "}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/lib/plastic-uav-algorithm.ts</code>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button type="button" className="rounded-full gap-2" onClick={() => runScan(false)}>
              <RefreshCw className="h-4 w-4" />
              Scan & dispatch now
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                resetUavPlasticAutomationDemo();
                toast.message("UAV demo state cleared.");
              }}
            >
              Reset demo
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-border/70 border-amber-500/25 bg-amber-500/[0.04]">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Satellite className="h-5 w-5 text-amber-600 shrink-0" />
            Satellite-linked auto-scan
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cadence</p>
            <p className="font-heading text-xl font-bold mt-1">{satelliteSched.intervalHours} hours</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last ingest + scan</p>
            <p className="font-medium mt-1 tabular-nums">
              {satelliteSched.lastScanAt ? new Date(satelliteSched.lastScanAt).toLocaleString() : "Not yet (opens first run)"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next scheduled</p>
            <p className="font-medium mt-1">{formatRelativeFuture(satelliteSched.nextScanAt)}</p>
            {satelliteSched.nextScanAt && (
              <p className="text-xs text-muted-foreground tabular-nums mt-0.5">{new Date(satelliteSched.nextScanAt).toLocaleString()}</p>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent passes</p>
            <p className="text-muted-foreground mt-1">
              {satelliteSched.recentPasses.length === 0
                ? "No logged passes yet."
                : `${satelliteSched.recentPasses.length} in history (see below).`}
            </p>
          </div>
        </CardContent>
        {satelliteSched.recentPasses.length > 0 && (
          <CardContent className="pt-0 border-t border-border/60">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Pass log (newest first)</p>
            <ul className="text-xs space-y-1.5 max-h-32 overflow-y-auto">
              {satelliteSched.recentPasses.slice(0, 8).map((p, i) => (
                <li key={`${p.at}-${i}`} className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                  <span className="tabular-nums text-foreground/90">{new Date(p.at).toLocaleString()}</span>
                  <span>
                    UAV assigned: <span className="font-medium text-foreground">{p.assigned}</span>, skipped (busy):{" "}
                    <span className="font-medium text-foreground">{p.skippedNoUav}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="automation" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="automation" className="rounded-lg">
            Fleet &amp; automation
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="rounded-lg">
            Hybrid monitoring (map demo)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automation" className="space-y-8 mt-0 outline-none">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "UAV triggers",
            value: "3 paths",
            sub: `Authority queue · plastic ≥${snap.plasticWaterAlertMinPercent}% · approved >${snap.thresholdPercent}%`,
            icon: Radar,
          },
          { label: "Sites needing UAV", value: String(snap.overThresholdCount), sub: "Across citizen bundles", icon: MapPin },
          { label: "Awaiting UAV", value: String(snap.pendingAssignmentCount), sub: "Not yet assigned", icon: Plane },
          { label: "Idle UAVs", value: String(snap.idleUavCount), sub: "Available for routing", icon: Plane },
        ].map((k) => (
          <Card key={k.label} className="border-border/70 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-bold tabular-nums">{k.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-heading text-lg">UAV fleet</CardTitle>
          <CardDescription>Live status; idle units are eligible for auto-assignment.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Home base</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current report</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snap.fleet.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {u.homeLat.toFixed(3)}, {u.homeLng.toFixed(3)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border-0 font-normal", uavStatusClass[u.status] ?? "")}>
                      {u.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{u.currentReportId ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {u.status !== "idle" && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => recallUavToBase(u.id)}>
                        Recall
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Dispatch log</CardTitle>
          <CardDescription>
            Automatic missions to report coordinates. <strong>Citizen sync</strong> runs after uploads / manual scan; <strong>Satellite ingest</strong> runs on
            the 2-hour cadence.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {snap.dispatchLog.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No UAV dispatches yet. Submit citizen reports with severity above {snap.thresholdPercent}% or run a scan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>UAV</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead className="text-right">Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.dispatchLog.map((d) => {
                  const src = dispatchSourceLabel(d.dispatchSource);
                  return (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm whitespace-nowrap">{new Date(d.triggeredAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-normal text-[11px]", src.className)}>
                        {src.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{d.locationLabel}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {d.lat.toFixed(4)}, {d.lng.toFixed(4)} · ~{formatDistanceKm(d.distanceKmFromHomeApprox)} from base
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-heading font-semibold tabular-nums">{d.severityPercent}%</span>
                    </TableCell>
                    <TableCell className="text-sm">{d.uavName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {phaseLabel[d.phase] ?? d.phase}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      {d.phase === "routing" && (
                        <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={() => markUavArrivedOnStation(d.id)}>
                          Arrived
                        </Button>
                      )}
                      {(d.phase === "routing" || d.phase === "on_station") && (
                        <Button type="button" size="sm" className="rounded-lg" onClick={() => completePlasticUavDispatch(d.id)}>
                          Complete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="mt-0 outline-none">
          <HybridUavMonitoringDemo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
