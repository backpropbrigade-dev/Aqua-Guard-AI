import { useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Camera,
  CheckCircle2,
  Cloud,
  Droplets,
  MapPin,
  Radio,
  Sparkles,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PollutionMapView } from "@/components/dashboard/citizen/PollutionMapView";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { useLiveLocationVersion } from "@/hooks/useLiveLocation";
import { useWorldData } from "@/hooks/useWorldData";
import { distanceKm, formatDistanceKm } from "@/lib/geo";
import {
  DEFAULT_MAP_CENTER,
  getDashboardData,
  getNearestHotspotWithin,
  simulateLiveUpdate,
} from "@/lib/citizen-store";
import { getLiveLocationState } from "@/lib/live-location";
import { weatherCodeLabel } from "@/lib/world-data";
import { chartCardClass, chartInnerClass, dashboardAxisTick, dashboardChartTooltipStyle, dashboardGridStroke } from "@/lib/dashboard-charts";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function CitizenOverview() {
  useCitizenVersion();
  useLiveLocationVersion();
  const data = getDashboardData();
  const live = getLiveLocationState();
  const pos = live.position;
  const { data: world, loading: worldLoading } = useWorldData(pos?.lat ?? null, pos?.lng ?? null);
  const NEARBY_KM = 250;
  const MAP_RADIUS_KM = 400;
  const nearest = pos ? getNearestHotspotWithin(pos.lat, pos.lng, NEARBY_KM) : null;

  const mapCenter: [number, number] = pos ? [pos.lat, pos.lng] : DEFAULT_MAP_CENTER;
  const userMap = pos
    ? { lat: pos.lat, lng: pos.lng, accuracyM: pos.accuracyM }
    : null;

  const markersForMiniMap = useMemo(() => {
    const all = data.mapMarkers;
    if (!pos) return all.slice(0, 10);
    const local = all.filter((m) => distanceKm(pos.lat, pos.lng, m.lat, m.lng) <= MAP_RADIUS_KM);
    return local.length > 0 ? local.slice(0, 12) : [];
  }, [data.mapMarkers, pos]);

  const severityChartData = useMemo(
    () => [
      { name: "Low", count: data.reportSeverityBreakdown.low, fill: "hsl(142 71% 42%)" },
      { name: "Medium", count: data.reportSeverityBreakdown.medium, fill: "hsl(38 92% 48%)" },
      { name: "High", count: data.reportSeverityBreakdown.high, fill: "hsl(0 84% 58%)" },
    ],
    [data.reportSeverityBreakdown],
  );
  const severityTotal = severityChartData.reduce((s, r) => s + r.count, 0);

  useEffect(() => {
    const id = window.setInterval(() => simulateLiveUpdate(), 40000);
    return () => window.clearInterval(id);
  }, []);

  const cards = [
    {
      label: "Total reports submitted",
      value: data.totalReportsSubmitted,
      icon: Activity,
      href: "/dashboard/citizen/my-reports",
      accent: "from-ocean-light/25 to-primary/5",
    },
    {
      label: "Reports cleaned",
      value: data.reportsCleaned,
      icon: CheckCircle2,
      href: "/dashboard/citizen/my-reports",
      accent: "from-aqua/25 to-secondary/10",
    },
    {
      label: "Points earned",
      value: data.pointsEarned,
      icon: Sparkles,
      href: "/dashboard/citizen/rewards",
      accent: "from-secondary/25 to-primary/10",
      sub: "Includes severity bonuses on each report",
    },
    {
      label: "Active alerts nearby",
      value: data.activeAlertsNearby,
      icon: AlertTriangle,
      href: "/dashboard/citizen/notifications",
      accent: "from-red-500/15 to-destructive/5",
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-8">
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
        <h2 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Your impact at a glance
        </h2>
        <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed text-[15px]">
          Track reports, rewards, and local conditions. Use the bell (top right) for alerts.
        </p>
        {pos && (
          <p className="text-xs text-muted-foreground mt-2 tabular-nums">
            Location updated {new Date(pos.updatedAt).toLocaleTimeString()}
          </p>
        )}
        <div className="flex flex-wrap gap-3 mt-6">
          <Button className="rounded-lg" size="lg" asChild>
            <Link to="/dashboard/citizen/report">
              <Camera className="h-4 w-4 mr-2" />
              Report pollution
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="rounded-lg" asChild>
            <Link to="/dashboard/citizen/map">
              <MapPin className="h-4 w-4 mr-2" />
              Open map
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s) => (
          <Link key={s.label} to={s.href} className="group">
            <Card
              className={cn(
                "h-full overflow-hidden border border-border bg-card shadow-sm transition-shadow duration-200",
                "hover:shadow-md hover:border-primary/25",
              )}
            >
              <div className={cn("h-1 w-full bg-gradient-to-r opacity-80", s.accent)} />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {s.label}
                </CardTitle>
                <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary/15 transition-colors">
                  <s.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-heading text-3xl font-bold text-foreground tabular-nums">{s.value}</p>
                {"sub" in s && s.sub ? <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{s.sub}</p> : null}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className={chartCardClass}>
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Your reports by severity
          </CardTitle>
          <CardDescription>How your submissions distribute across AI risk tiers</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {severityTotal === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-12 text-center text-sm text-muted-foreground">
              No reports yet —{" "}
              <Link to="/dashboard/citizen/report" className="text-primary font-medium underline-offset-4 hover:underline">
                file your first observation
              </Link>{" "}
              to see this chart fill in.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-5 lg:items-center">
              <div className="lg:col-span-2 space-y-3">
                {severityChartData.map((row) => {
                  const pct = Math.round((row.count / severityTotal) * 100);
                  return (
                    <div key={row.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{row.name}</span>
                        <span className="font-semibold tabular-nums" style={{ color: row.fill }}>
                          {row.count}{" "}
                          <span className="text-muted-foreground font-normal text-xs">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: row.fill }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="lg:col-span-3 h-[200px]">
                <div className={cn(chartInnerClass, "h-full")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={severityChartData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                      <defs>
                        {severityChartData.map((row) => (
                          <linearGradient key={row.name} id={`cit-sev-${row.name}`} x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor={row.fill} stopOpacity={0.65} />
                            <stop offset="100%" stopColor={row.fill} stopOpacity={1} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke={dashboardGridStroke} vertical={false} />
                      <XAxis dataKey="name" tick={dashboardAxisTick()} axisLine={false} tickLine={false} />
                      <YAxis tick={dashboardAxisTick()} width={32} allowDecimals={false} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={dashboardChartTooltipStyle} formatter={(v: number) => [`${v} reports`, ""]} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} animationDuration={600} maxBarSize={56}>
                        {severityChartData.map((row) => (
                          <Cell key={row.name} fill={`url(#cit-sev-${row.name})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        <Card className="lg:col-span-2 flex flex-col border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle className="font-heading flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Map & your position
            </CardTitle>
            <CardDescription>
              Hotspots within ~{MAP_RADIUS_KM} km when location is on; dashed ring shows GPS accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 px-4 pb-4 flex-1 flex flex-col min-h-0">
            <div className="rounded-xl overflow-hidden border border-border bg-muted/30 flex-1 min-h-[280px]">
              <PollutionMapView
                center={mapCenter}
                zoom={pos ? 13 : 12}
                markers={markersForMiniMap}
                height="100%"
                interactive={false}
                userLocation={userMap}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4 min-h-0 lg:min-h-[420px]">
          <Card className="flex-1 flex flex-col border border-border bg-card shadow-sm min-h-0">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Cloud className="h-4 w-4 text-ocean-light" />
                Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm flex-1">
              {!pos ? (
                <p className="text-muted-foreground">Enable location in Settings to load live weather & marine data for your coordinates.</p>
              ) : worldLoading ? (
                <p className="text-muted-foreground animate-pulse">Fetching live environmental data…</p>
              ) : world?.error && !world.weather && !world.marine ? (
                <p className="text-destructive text-sm">{world.error}</p>
              ) : (
                <>
                  {world?.reverse && (
                    <p className="font-medium text-foreground leading-snug">{world.reverse.label}</p>
                  )}
                  {world?.weather && (
                    <div className="rounded-xl bg-muted/40 border border-border/50 p-3 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Air</p>
                      <p className="text-foreground">
                        {world.weather.temperatureC != null ? `${Math.round(world.weather.temperatureC)}°C` : "—"}
                        <span className="text-muted-foreground"> · {weatherCodeLabel(world.weather.weatherCode)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Humidity {world.weather.humidityPct != null ? `${world.weather.humidityPct}%` : "—"}
                        {world.weather.windKmh != null ? ` · Wind ${Math.round(world.weather.windKmh)} km/h` : ""}
                      </p>
                    </div>
                  )}
                  {world?.marine && (world.marine.waveHeightM != null || world.marine.seaTempC != null) && (
                    <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ocean-mid dark:text-ocean-light flex items-center gap-1">
                        <Waves className="h-3.5 w-3.5" />
                        Marine
                      </p>
                      <p className="text-foreground">
                        {world.marine.waveHeightM != null ? `Waves ${world.marine.waveHeightM.toFixed(1)} m` : "—"}
                        {world.marine.seaTempC != null ? ` · Sea ${world.marine.seaTempC.toFixed(1)}°C` : ""}
                      </p>
                      {world.marine.currentVelocityKmh != null && (
                        <p className="text-xs text-muted-foreground">Surface current ~{world.marine.currentVelocityKmh.toFixed(1)} km/h</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col border border-border bg-card shadow-sm">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Droplets className="h-4 w-4 text-secondary" />
                Nearest hotspot
              </CardTitle>
              <CardDescription className="text-xs">Within {NEARBY_KM} km of you</CardDescription>
            </CardHeader>
            <CardContent className="text-sm flex-1">
              {!pos ? (
                <p className="text-muted-foreground">Enable location in Settings to see nearby hotspots.</p>
              ) : !nearest ? (
                <p className="text-muted-foreground">
                  No hotspot markers within {NEARBY_KM} km. Submit a report or zoom the full map to see other regions.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-foreground">{nearest.hotspot.label}</p>
                  <p className="text-2xl font-heading font-bold text-primary tabular-nums">{formatDistanceKm(nearest.distanceKm)}</p>
                  <p className="text-xs text-muted-foreground">
                    {nearest.hotspot.severity} severity · {nearest.hotspot.status}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading">System status</CardTitle>
            <CardDescription>Fleet and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 shadow-sm">
                <Radio className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Drone fleet</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{data.systemStatus.droneMessage}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-2xl border border-destructive/15 bg-destructive/5 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Alerts</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{data.systemStatus.alertMessage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-heading">Recent activity</CardTitle>
            <CardDescription>Notifications and reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {data.recentActivity.length === 0 ? (
              <p>No recent activity yet — submit your first report.</p>
            ) : (
              data.recentActivity.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 leading-relaxed"
                >
                  <span className="text-foreground/90">{a.text}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
