import { useEffect, useState } from "react";
import { Anchor, Cloud, Radio, ScanLine, Waves } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { NearbyPollutionMap } from "@/components/dashboard/citizen/NearbyPollutionMap";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { useLiveLocationVersion } from "@/hooks/useLiveLocation";
import { useWorldData } from "@/hooks/useWorldData";
import { formatDistanceKm } from "@/lib/geo";
import { getNearestHotspotWithin, simulateLiveUpdate } from "@/lib/citizen-store";
import { getLiveLocationState } from "@/lib/live-location";
import { weatherCodeLabel } from "@/lib/world-data";
import { cn } from "@/lib/utils";

const legend = [
  { color: "bg-emerald-500", label: "Low" },
  { color: "bg-amber-500", label: "Medium" },
  { color: "bg-red-500", label: "High" },
];

export default function NearbyMapPage() {
  useCitizenVersion();
  useLiveLocationVersion();
  const [livePulse, setLivePulse] = useState(false);
  const [followMe, setFollowMe] = useState(true);

  const live = getLiveLocationState();
  const pos = live.position;
  const userMap = pos ? { lat: pos.lat, lng: pos.lng, accuracyM: pos.accuracyM } : null;
  const nearest = pos ? getNearestHotspotWithin(pos.lat, pos.lng, 250) : null;
  const { data: world, loading: worldLoading } = useWorldData(pos?.lat ?? null, pos?.lng ?? null);

  useEffect(() => {
    const t = window.setInterval(() => {
      simulateLiveUpdate();
      setLivePulse(true);
      window.setTimeout(() => setLivePulse(false), 800);
    }, 28000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-6">
      <Card className={cn("overflow-hidden border border-border bg-card shadow-md")}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border/40 bg-muted/20">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <CardTitle className="font-heading text-xl md:text-2xl">Nearby pollution map</CardTitle>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full gap-1.5 font-normal border-primary/30 bg-background/60",
                  livePulse && "border-secondary text-secondary bg-secondary/10 scale-[1.02]",
                )}
              >
                <Radio className={cn("h-3.5 w-3.5", livePulse && "animate-pulse text-secondary")} />
                Live data stream
              </Badge>
            </div>
            <CardDescription className="mt-1.5 max-w-2xl">
              Full-screen style map: GPS pin, severity-colored markers, heatmap, filters, place search, layer toggles, and simulated
              real-time refresh (Socket.io-style). Data: GET <code className="text-xs">/hotspots</code> when{" "}
              <code className="text-xs">VITE_CITIZEN_API_URL</code> is set; otherwise local demo store.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 text-xs items-center">
            {legend.map((l) => (
              <span key={l.label} className="flex items-center gap-2 text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${l.color}`} />
                {l.label}
              </span>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[1fr_300px] gap-0">
            <div className="border-b lg:border-b-0 lg:border-r border-border/50 p-3 md:p-4 min-h-[min(560px,70vh)]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5">
                  <ScanLine className="h-4 w-4 text-primary" />
                  <Label htmlFor="follow" className="text-xs font-medium cursor-pointer">
                    Follow my live location
                  </Label>
                  <Switch id="follow" checked={followMe} onCheckedChange={setFollowMe} className="scale-90" />
                </div>
                {pos && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  </span>
                )}
              </div>
              <div className="rounded-2xl overflow-hidden ring-2 ring-primary/10 shadow-lg h-[min(560px,62vh)] min-h-[400px]">
                <NearbyPollutionMap height="100%" followUser={followMe} userLocation={userMap} />
              </div>
            </div>

            <div className="p-4 space-y-4 bg-gradient-to-b from-muted/15 to-transparent">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                  <Anchor className="h-3.5 w-3.5" />
                  Tracking
                </h3>
                {!pos ? (
                  <p className="text-sm text-muted-foreground">Waiting for GPS… Enable live tracking in Settings.</p>
                ) : (
                  <ul className="text-sm space-y-2 text-foreground">
                    <li className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Accuracy</span>
                      <span className="font-medium tabular-nums">{pos.accuracyM != null ? `±${Math.round(pos.accuracyM)} m` : "—"}</span>
                    </li>
                    {pos.speedMps != null && pos.speedMps >= 0 && (
                      <li className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Speed</span>
                        <span className="font-medium tabular-nums">{(pos.speedMps * 3.6).toFixed(1)} km/h</span>
                      </li>
                    )}
                    {nearest ? (
                      <li className="flex justify-between gap-2">
                        <span className="text-muted-foreground">Nearest hotspot</span>
                        <span className="font-semibold text-primary">{formatDistanceKm(nearest.distanceKm)}</span>
                      </li>
                    ) : (
                      <li className="text-xs text-muted-foreground">No hotspots within 250 km of you.</li>
                    )}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-2">
                  <Cloud className="h-3.5 w-3.5" />
                  Environment (live)
                </h3>
                {worldLoading && <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>}
                {!worldLoading && world?.reverse && (
                  <p className="text-sm font-medium text-foreground leading-snug mb-2">{world.reverse.label}</p>
                )}
                {!worldLoading && world?.weather && (
                  <p className="text-sm text-muted-foreground">
                    {world.weather.temperatureC != null ? `${Math.round(world.weather.temperatureC)}°C` : ""}
                    {world.weather.weatherCode != null ? ` · ${weatherCodeLabel(world.weather.weatherCode)}` : ""}
                  </p>
                )}
                {!worldLoading && world?.marine && (world.marine.seaTempC != null || world.marine.waveHeightM != null) && (
                  <p className="text-sm text-ocean-mid dark:text-ocean-light mt-2 flex items-start gap-2">
                    <Waves className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {world.marine.waveHeightM != null && <>Waves {world.marine.waveHeightM.toFixed(1)} m</>}
                      {world.marine.seaTempC != null && (
                        <>
                          {world.marine.waveHeightM != null ? " · " : ""}
                          Sea {world.marine.seaTempC.toFixed(1)}°C
                        </>
                      )}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[11px] text-muted-foreground">
        © OpenStreetMap · Places ©{" "}
        <a href="https://www.bigdatacloud.com" className="underline hover:text-foreground" target="_blank" rel="noreferrer">
          BigDataCloud
        </a>{" "}
        · Search ©{" "}
        <a href="https://open-meteo.com" className="underline hover:text-foreground" target="_blank" rel="noreferrer">
          Open-Meteo
        </a>
      </p>
    </div>
  );
}
