/**
 * Hybrid plastic monitoring hack demo — ported from standalone index.html.
 * Client-side map (Leaflet), canvas “detection”, simulated buoys/bots, forecast, crew dispatch.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import * as turf from "@turf/turf";
import {
  CircleMarker,
  LayerGroup,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapBasemapToggle } from "@/components/dashboard/citizen/MapBasemapToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getMapTileLayer, type MapBasemapId } from "@/lib/map-tile-providers";
import { cn } from "@/lib/utils";

const HYDERABAD: [number, number] = [17.385, 78.4867];
const DEFAULT_ZOOM = 10;

function uid(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

function destinationLatLng(lat: number, lng: number, km: number, angleRad: number) {
  const dLat = (km * Math.cos(angleRad)) / 111;
  const dLng = (km * Math.sin(angleRad)) / (111 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

function pseudoNoise(a: number, b: number) {
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return { x: v - Math.floor(v), y: v * 1.3 - Math.floor(v * 1.3) };
}

function currentVector(mapCenter: { lat: number; lng: number }, lat: number, lng: number) {
  const cx = mapCenter.lat;
  const cy = mapCenter.lng;
  const dx = lat - cx;
  const dy = lng - cy;
  let vx = 0.5 * Math.sin(dy * 5) + 0.3 * Math.cos(dx * 3);
  let vy = 0.4 * Math.cos(dx * 5) - 0.25 * Math.sin(dy * 4);
  const noise = pseudoNoise(lat, lng);
  vx = vx * 0.6 + noise.x * 0.2;
  vy = vy * 0.6 + noise.y * 0.2;
  return { vx, vy };
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toR = Math.PI / 180;
  const R = 6371;
  const dLat = (b[0] - a[0]) * toR;
  const dLon = (b[1] - a[1]) * toR;
  const lat1 = a[0] * toR;
  const lat2 = b[0] * toR;
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const x = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function centroidLatLng(coords: [number, number][], fallback: { lat: number; lng: number }): [number, number] {
  if (coords.length === 0) return [fallback.lat, fallback.lng];
  const s = coords.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1]] as [number, number], [0, 0]);
  return [s[0] / coords.length, s[1] / coords.length];
}

const buoyIcon = L.divIcon({
  className: "bg-transparent border-0 text-lg leading-none",
  html: '<span style="filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))">🔵</span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const boatIcon = L.divIcon({
  className: "bg-transparent border-0 text-lg leading-none",
  html: '<span style="filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))">🛥</span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

type Hotspot = { id: string; lat: number; lng: number; intensity: number };
type Device = { id: string; type: "buoy" | "boat"; lat: number; lng: number };
type Task = { id: string; title: string; detail: string };
type ForecastCentroid = { id: string; lat: number; lng: number; step: number };

function MapCenterSync({ onCenter }: { onCenter: (c: L.LatLng) => void }) {
  const map = useMap();
  useMapEvents({
    moveend: () => onCenter(map.getCenter()),
  });
  useEffect(() => {
    onCenter(map.getCenter());
  }, [map, onCenter]);
  return null;
}

/** Fit map to hotspots after "Generate hotspots" (matches standalone demo). */
function FitHotspotsBounds({ hotspots, token }: { hotspots: Hotspot[]; token: number }) {
  const map = useMap();
  useEffect(() => {
    if (token === 0 || hotspots.length === 0) return;
    const b = L.latLngBounds(hotspots.map((h) => [h.lat, h.lng] as L.LatLngTuple));
    if (b.isValid()) {
      map.fitBounds(b.pad(0.6), { maxZoom: 12 });
    }
  }, [map, hotspots, token]);
  return null;
}

export function HybridUavMonitoringDemo() {
  const mapCenterRef = useRef({ lat: HYDERABAD[0], lng: HYDERABAD[1] });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastImageRef = useRef<HTMLImageElement | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [forecastDays, setForecastDays] = useState("3");
  const [forecastCentroids, setForecastCentroids] = useState<ForecastCentroid[]>([]);
  const [forecastHull, setForecastHull] = useState<[number, number][] | null>(null);
  const [forecastLogLines, setForecastLogLines] = useState<string[]>([]);
  const [mapBoundsKey, setMapBoundsKey] = useState(0);
  const [basemap, setBasemap] = useState<MapBasemapId>("street");
  const mapTiles = getMapTileLayer(basemap);

  const handleCenter = useCallback((c: L.LatLng) => {
    mapCenterRef.current = { lat: c.lat, lng: c.lng };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const c = mapCenterRef.current;
      setHotspots([
        { id: uid("hot_"), lat: c.lat + 0.02, lng: c.lng + 0.02, intensity: 82 },
        { id: uid("hot_"), lat: c.lat - 0.03, lng: c.lng - 0.015, intensity: 54 },
        { id: uid("hot_"), lat: c.lat + 0.04, lng: c.lng - 0.07, intensity: 40 },
      ]);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    return () => {
      if (simRef.current) clearInterval(simRef.current);
    };
  }, []);

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const maxW = 320;
      const maxH = 180;
      const w = img.width;
      const h = img.height;
      const scale = Math.min(maxW / w, maxH / h, 1);
      canvas.width = w * scale;
      canvas.height = h * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      lastImageRef.current = img;
    };
    img.src = URL.createObjectURL(f);
  };

  const runDetection = () => {
    const canvas = canvasRef.current;
    if (!canvas?.width) {
      toast.error("Upload an image first.");
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const im = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = im.data;
    let count = 0;
    for (let y = 0; y < canvas.height; y += 4) {
      for (let x = 0; x < canvas.width; x += 4) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const light = (r + g + b) / 3;
        const sat = 1 - Math.min(r, g, b) / (light + 1);
        if (light > 200 && sat < 0.35) {
          count += 1;
          ctx.fillStyle = "rgba(255,0,0,0.8)";
          ctx.fillRect(x - 1, y - 1, 3, 3);
        }
      }
    }
    toast.message(`Demo detection: ${count} candidate pixels (replace with a real model for production).`);
  };

  const generateHotspots = () => {
    const center = mapCenterRef.current;
    const N = 5 + Math.floor(Math.random() * 6);
    const next: Hotspot[] = [];
    for (let i = 0; i < N; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rKm = 1 + Math.random() * 7;
      const ll = destinationLatLng(center.lat, center.lng, rKm, ang);
      next.push({
        id: uid("hot_"),
        lat: ll.lat,
        lng: ll.lng,
        intensity: Math.round(30 + Math.random() * 70),
      });
    }
    setHotspots(next);
    setMapBoundsKey((k) => k + 1);
    toast.success(`Generated ${N} hotspots around map center.`);
  };

  const addDevice = (type: "buoy" | "boat") => {
    const center = mapCenterRef.current;
    const jitter = 0.02;
    const lat = center.lat + (Math.random() - 0.5) * jitter * 10;
    const lng = center.lng + (Math.random() - 0.5) * jitter * 10;
    setDevices((d) => [...d, { id: uid(type[0] + "_"), type, lat, lng }]);
  };

  const pingDevice = (id: string) => {
    setDevices((list) =>
      list.map((d) => {
        if (d.id !== id) return d;
        const nlat = d.lat + (Math.random() - 0.5) * 0.001;
        const nlng = d.lng + (Math.random() - 0.5) * 0.001;
        return { ...d, lat: nlat, lng: nlng };
      }),
    );
  };

  const startSim = () => {
    if (simRef.current) return;
    simRef.current = setInterval(() => {
      const mc = mapCenterRef.current;
      setDevices((list) =>
        list.map((d) => {
          const v = currentVector(mc, d.lat, d.lng);
          const speed = d.type === "buoy" ? 0.0003 : 0.0006;
          return { ...d, lat: d.lat + v.vy * speed, lng: d.lng + v.vx * speed };
        }),
      );
      setHotspots((list) =>
        list.map((h) => {
          const intensity = Math.max(5, h.intensity - Math.random() * 4);
          return { ...h, intensity };
        }),
      );
    }, 1500);
    toast.message("Simulation running (buoys / Cleanbots + hotspot decay).");
  };

  const stopSim = () => {
    if (simRef.current) {
      clearInterval(simRef.current);
      simRef.current = null;
    }
  };

  const runForecast = () => {
    const days = Number(forecastDays);
    const seeds = [...hotspots].sort((a, b) => b.intensity - a.intensity).slice(0, 5);
    if (seeds.length === 0) {
      toast.error('Generate hotspots first (use "Generate hotspots from image" or wait for samples).');
      return;
    }
    const mc = mapCenterRef.current;
    const particles: { lat: number; lng: number }[] = [];
    seeds.forEach((s) => {
      const n = Math.max(6, Math.round(s.intensity / 10));
      for (let i = 0; i < n; i++) {
        particles.push({
          lat: s.lat + (Math.random() - 0.5) * 0.01,
          lng: s.lng + (Math.random() - 0.5) * 0.01,
        });
      }
    });

    const centroids: ForecastCentroid[] = [];
    const log: string[] = [];
    const working = particles.map((p) => ({ ...p }));

    for (let step = 0; step < days; step++) {
      working.forEach((p) => {
        const v = currentVector(mc, p.lat, p.lng);
        p.lat += v.vy * 0.01 * (1 + Math.random() * 0.6);
        p.lng += v.vx * 0.01 * (1 + Math.random() * 0.6);
      });
      const coords = working.map((p): [number, number] => [p.lat, p.lng]);
      const c = centroidLatLng(coords, mc);
      centroids.push({ id: uid("fc_"), lat: c[0], lng: c[1], step: step + 1 });
      log.push(`Day ${step + 1}: predicted center ${c[0].toFixed(4)}, ${c[1].toFixed(4)}`);
    }

    setForecastCentroids(centroids);
    setForecastLogLines(log);

    try {
      const fc = turf.points(working.map((p) => [p.lng, p.lat]));
      const hull = turf.convex(fc);
      if (hull?.geometry?.type === "Polygon" && hull.geometry.coordinates[0]) {
        const ring = hull.geometry.coordinates[0];
        const latlngs: [number, number][] = ring.map((c) => [c[1], c[0]]);
        setForecastHull(latlngs);
      } else {
        setForecastHull(null);
      }
    } catch {
      setForecastHull(null);
    }
    toast.success(`Forecast complete (${days} step${days === 1 ? "" : "s"}).`);
  };

  const autoDispatch = () => {
    const top = [...hotspots].sort((a, b) => b.intensity - a.intensity)[0];
    if (!top) {
      toast.error("No hotspots — generate first.");
      return;
    }
    let boats = devices.filter((d) => d.type === "boat");
    if (boats.length === 0) {
      const center = mapCenterRef.current;
      const lat = center.lat + (Math.random() - 0.5) * 0.05;
      const lng = center.lng + (Math.random() - 0.5) * 0.05;
      const newBoat: Device = { id: uid("b_"), type: "boat", lat, lng };
      setDevices((d) => [...d, newBoat]);
      boats = [newBoat];
    }
    let nearest: Device | null = null;
    let best = Infinity;
    const target: [number, number] = [top.lat, top.lng];
    for (const b of boats) {
      const d = haversineKm([b.lat, b.lng], target);
      if (d < best) {
        best = d;
        nearest = b;
      }
    }
    if (!nearest) return;
    setDevices((list) =>
      list.map((d) => (d.id === nearest!.id ? { ...d, lat: top.lat, lng: top.lng } : d)),
    );
    setTasks((t) => [
      ...t,
      {
        id: uid("task_"),
        title: `Cleanup at ${top.lat.toFixed(4)}, ${top.lng.toFixed(4)}`,
        detail: `Assigned to ${nearest.id}`,
      },
    ]);
    setHotspots((list) =>
      list.map((h) => (h.id === top.id ? { ...h, intensity: Math.max(1, h.intensity - 30) } : h)),
    );
    toast.success("Cleanbot dispatched to top hotspot.");
  };

  const removeTask = (id: string) => setTasks((t) => t.filter((x) => x.id !== id));

  return (
    <Card className="border-border/70 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-lg">Hybrid plastic monitoring (live demo)</CardTitle>
        <CardDescription>
          Satellite/drone-style upload, simulated IoT buoys & Cleanbots, particle forecast, and crew dispatch — same flow as your hack{" "}
          <code className="text-xs">index.html</code>, integrated here.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-0">
        <div className="flex flex-col xl:flex-row xl:items-stretch min-h-[520px] border-t border-border/60">
          <div className="relative flex-1 min-h-[320px] xl:min-h-[520px] bg-muted/20">
            <MapContainer
              center={HYDERABAD}
              zoom={DEFAULT_ZOOM}
              className={cn("h-full min-h-[320px] w-full xl:min-h-[520px] z-0 [&_.leaflet-control-attribution]:text-[10px]")}
              scrollWheelZoom
            >
              <TileLayer key={basemap} attribution={mapTiles.attribution} url={mapTiles.url} />
              <MapCenterSync onCenter={handleCenter} />
              <FitHotspotsBounds hotspots={hotspots} token={mapBoundsKey} />
              <LayerGroup key={`hs-${mapBoundsKey}`}>
                {hotspots.map((h) => (
                  <CircleMarker
                    key={h.id}
                    center={[h.lat, h.lng]}
                    radius={6 + h.intensity / 20}
                    pathOptions={{
                      color: h.intensity > 60 ? "#d33" : "#f39c12",
                      fillColor: h.intensity > 60 ? "#d33" : "#f39c12",
                      fillOpacity: 0.6,
                    }}
                  >
                    <Popup>
                      <strong>Hotspot</strong>
                      <br />
                      Intensity: {Math.round(h.intensity)}
                    </Popup>
                  </CircleMarker>
                ))}
              </LayerGroup>
              <LayerGroup>
                {devices
                  .filter((d) => d.type === "buoy")
                  .map((d) => (
                    <Marker key={d.id} position={[d.lat, d.lng]} icon={buoyIcon}>
                      <Popup>
                        🔵 <strong>buoy</strong>
                        <br />
                        {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
                      </Popup>
                    </Marker>
                  ))}
                {devices
                  .filter((d) => d.type === "boat")
                  .map((d) => (
                    <Marker key={d.id} position={[d.lat, d.lng]} icon={boatIcon}>
                      <Popup>
                        🛥 <strong>boat</strong>
                        <br />
                        {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
                      </Popup>
                    </Marker>
                  ))}
              </LayerGroup>
              <LayerGroup>
                {forecastCentroids.map((c) => (
                  <CircleMarker
                    key={c.id}
                    center={[c.lat, c.lng]}
                    radius={8 + c.step * 2}
                    pathOptions={{ color: "#1976d2", fillColor: "#1976d2", fillOpacity: 0.35 }}
                  >
                    <Popup>
                      <strong>Forecast day {c.step}</strong>
                      <br />
                      Predicted accumulation center
                    </Popup>
                  </CircleMarker>
                ))}
                {forecastHull && forecastHull.length >= 3 && (
                  <Polygon positions={forecastHull} pathOptions={{ color: "#1976d2", weight: 1, dashArray: "4 4" }} />
                )}
              </LayerGroup>
            </MapContainer>
            <div className="absolute right-2 top-2 z-[400]">
              <MapBasemapToggle value={basemap} onChange={setBasemap} />
            </div>
          </div>

          <ScrollArea className="w-full xl:w-[420px] xl:max-w-[50%] border-t xl:border-t-0 xl:border-l border-border/60 bg-muted/30">
            <div className="p-3 space-y-3">
              <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                <div className="flex justify-between items-center gap-2 mb-2">
                  <strong className="text-sm">1) Satellite / drone input (demo)</strong>
                  <span className="text-xs text-muted-foreground">Client-side</span>
                </div>
                <Label className="text-xs">Upload sample image (jpg/png)</Label>
                <input type="file" accept="image/*" className="mt-1 block text-sm w-full" onChange={onImageChange} />
                <canvas ref={canvasRef} className="mt-2 max-w-full border border-dashed border-border rounded-md bg-background" />
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button type="button" size="sm" onClick={runDetection}>
                    Run simple detection
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={generateHotspots}>
                    Generate hotspots
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Detection uses a color threshold to simulate AI. Swap for MariNeXt / your HOG+SVM service for production.
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                <strong className="text-sm">2) Simulated IoT buoys & robots</strong>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => addDevice("buoy")}>
                    Add random buoy
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addDevice("boat")}>
                    Add Cleanbot
                  </Button>
                  <Button type="button" size="sm" onClick={startSim}>
                    Start simulation
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={stopSim}>
                    Stop
                  </Button>
                </div>
                <div className="mt-2 space-y-1">
                  {devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex justify-between items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-sm"
                    >
                      <div>
                        <strong>{d.type}</strong>
                        <div className="text-xs text-muted-foreground font-mono">{d.id}</div>
                      </div>
                      <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => pingDevice(d.id)}>
                        Ping
                      </Button>
                    </div>
                  ))}
                  {devices.length === 0 && <p className="text-xs text-muted-foreground">No devices yet.</p>}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                <strong className="text-sm">3) Prediction & dispatch</strong>
                <p className="text-xs text-muted-foreground mt-1">
                  Simulated drift over N steps. Use NOAA / Copernicus currents in production.
                </p>
                <div className="flex flex-wrap gap-2 items-center mt-2">
                  <Select value={forecastDays} onValueChange={setForecastDays}>
                    <SelectTrigger className="w-[120px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" onClick={runForecast}>
                    Run forecast
                  </Button>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {forecastLogLines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                <strong className="text-sm">4) Crew dispatch</strong>
                <div className="mt-2 space-y-1">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex justify-between items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5 text-sm">
                      <div>
                        <strong className="block text-xs">{t.title}</strong>
                        <span className="text-xs text-muted-foreground">{t.detail}</span>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={() => removeTask(t.id)}>
                        Done
                      </Button>
                    </div>
                  ))}
                  {tasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks yet.</p>}
                </div>
                <Button type="button" size="sm" className="mt-2 w-full sm:w-auto" onClick={autoDispatch}>
                  Auto-dispatch to top hotspot
                </Button>
              </div>

              <p className="text-xs text-muted-foreground px-1 pb-2">
                <strong className="text-foreground">Hack tips:</strong> present detection → buoys → forecast → dispatch; then roadmap (IBM Z inference,
                real currents, hardware).
              </p>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
