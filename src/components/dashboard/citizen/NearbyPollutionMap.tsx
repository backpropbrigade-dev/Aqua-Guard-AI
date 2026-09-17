import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { Crosshair, Layers, Radio, Search } from "lucide-react";
import { MapBasemapToggle } from "@/components/dashboard/citizen/MapBasemapToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getMapTileLayer, type MapBasemapId } from "@/lib/map-tile-providers";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import {
  DEFAULT_MAP_CENTER,
  severityHex,
  type DroneFlightStatus,
  type Hotspot,
  type HotspotSource,
  type HotspotStatus,
  type Severity,
} from "@/lib/citizen-store";
import { searchGeocodePlaces } from "@/lib/geocoding";
import { emitHotspotRealtimeTick, getHotspotRealtimeVersion, subscribeHotspotRealtime } from "@/lib/hotspot-realtime";
import { loadHotspotsForMap, type MapHotspotFilters } from "@/lib/hotspots-service";
import { cn } from "@/lib/utils";

type LWithHeat = typeof L & {
  heatLayer: (latlngs: [number, number, number][], options?: Record<string, unknown>) => L.Layer;
};

const USER_PIN_ICON = L.divIcon({
  className: "aquaguard-map-user-icon",
  html: '<div class="aquaguard-map-user-pin" aria-hidden="true"></div>',
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -34],
});

function makeHotspotIcon(h: Hotspot): L.DivIcon {
  const emoji = h.status === "detected" ? "⚠️" : h.status === "cleaning" ? "🚁" : "✅";
  const color = severityHex(h.severity);
  return L.divIcon({
    className: "aquaguard-hotspot-icon",
    html: `<div class="aquaguard-hotspot-pin" style="--pin-color:${color}" role="img" aria-label="Pollution ${h.severity}">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
    popupAnchor: [0, -28],
  });
}

const DRONE_ICON = L.divIcon({
  className: "aquaguard-drone-icon",
  html: '<div class="aquaguard-drone-marker" aria-hidden="true">🚁</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function statusHuman(s: HotspotStatus): string {
  switch (s) {
    case "cleaning":
      return "Cleaning";
    case "cleaned":
      return "Cleaned";
    default:
      return "Detected";
  }
}

function sourceHuman(s: HotspotSource): string {
  return s === "drone" ? "Drone" : "Citizen";
}

function droneFlightHuman(d: DroneFlightStatus | null | undefined): string {
  switch (d) {
    case "traveling":
      return "Traveling";
    case "cleaning":
      return "Cleaning";
    case "completed":
      return "Completed";
    default:
      return "—";
  }
}

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const [la, ln] = center;
  useEffect(() => {
    map.setView([la, ln], zoom);
  }, [la, ln, zoom, map]);
  return null;
}

function HeatmapLayer({ points, visible }: { points: [number, number, number][]; visible: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!visible || points.length === 0) return;
    const layer = (L as LWithHeat).heatLayer(points, {
      radius: 28,
      blur: 18,
      maxZoom: 17,
      max: 0.92,
      gradient: { 0.35: "#0ea5e9", 0.55: "#22c55e", 0.75: "#eab308", 1: "#ef4444" },
    });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, visible, points]);
  return null;
}

export type NearbyPollutionMapProps = {
  height: string;
  className?: string;
  /** When true, map view follows `userLocation` when it updates */
  followUser?: boolean;
  userLocation?: { lat: number; lng: number; accuracyM?: number | null } | null;
};

export function NearbyPollutionMap({ height, className, followUser = true, userLocation }: NearbyPollutionMapProps) {
  useCitizenVersion();
  const rtTick = useSyncExternalStore(subscribeHotspotRealtime, getHotspotRealtimeVersion, () => 0);

  const [severityQ, setSeverityQ] = useState<Severity | "all">("all");
  const [statusQ, setStatusQ] = useState<HotspotStatus | "all">("all");
  const [sourceQ, setSourceQ] = useState<HotspotSource | "all">("all");
  const [layerDrone, setLayerDrone] = useState(true);
  const [layerCitizen, setLayerCitizen] = useState(true);
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchHits, setSearchHits] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [basemap, setBasemap] = useState<MapBasemapId>("street");
  const mapTiles = getMapTileLayer(basemap);

  const [rawHotspots, setRawHotspots] = useState<Hotspot[]>([]);

  const queryCenter = userLocation ?? { lat: mapCenter[0], lng: mapCenter[1] };

  const apiFilters: MapHotspotFilters = useMemo(
    () => ({
      latitude: queryCenter.lat,
      longitude: queryCenter.lng,
      radiusKm: 450,
      severity: severityQ,
      status: statusQ,
      source: sourceQ,
    }),
    [queryCenter.lat, queryCenter.lng, severityQ, statusQ, sourceQ],
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadHotspotsForMap(apiFilters, ac.signal).then((list) => {
      if (!ac.signal.aborted) setRawHotspots(list);
    });
    return () => ac.abort();
  }, [apiFilters, rtTick]);

  useEffect(() => {
    const id = window.setInterval(() => emitHotspotRealtimeTick(), 16000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (followUser && userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(14);
    }
  }, [followUser, userLocation]);

  const displayed = useMemo(() => {
    return rawHotspots.filter((h) => {
      if (!layerDrone && h.source === "drone") return false;
      if (!layerCitizen && h.source === "citizen") return false;
      return true;
    });
  }, [rawHotspots, layerDrone, layerCitizen]);

  const heatPoints = useMemo(
    () => displayed.map((h) => [h.lat, h.lng, Math.min(1, h.severityPercent / 100)] as [number, number, number]),
    [displayed],
  );

  const droneTarget = useMemo(() => {
    return displayed.find(
      (h) =>
        h.severityPercent > 50 &&
        h.source === "drone" &&
        (h.status === "cleaning" || h.droneStatus === "cleaning" || h.droneStatus === "traveling"),
    );
  }, [displayed]);

  const [dronePos, setDronePos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!droneTarget) {
      setDronePos(null);
      return;
    }
    const startLat = droneTarget.lat - 0.0028;
    const startLng = droneTarget.lng - 0.0022;
    const id = window.setInterval(() => {
      const t = (Date.now() % 10000) / 10000;
      const ping = t < 0.5 ? t * 2 : 2 - t * 2;
      setDronePos({
        lat: startLat + (droneTarget.lat - startLat) * ping,
        lng: startLng + (droneTarget.lng - startLng) * ping,
      });
    }, 280);
    return () => window.clearInterval(id);
  }, [droneTarget]);

  const recenterUser = useCallback(() => {
    if (userLocation && Number.isFinite(userLocation.lat)) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(14);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(14);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, [userLocation]);

  const runSearch = useCallback(async () => {
    setSearchBusy(true);
    try {
      const hits = await searchGeocodePlaces(searchText);
      setSearchHits(hits);
      if (hits[0]) {
        setMapCenter([hits[0].lat, hits[0].lng]);
        setMapZoom(13);
      }
    } finally {
      setSearchBusy(false);
    }
  }, [searchText]);

  const hStyle = typeof height === "string" ? height : `${height}px`;

  const userRing =
    userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng)
      ? Math.min(Math.max(userLocation.accuracyM ?? 40, 20), 800)
      : null;

  return (
    <div className={cn("relative z-0 overflow-hidden rounded-2xl", className)} style={{ height: hStyle, width: "100%", position: "relative" }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full rounded-2xl [&_.leaflet-control-attribution]:text-[10px]"
        scrollWheelZoom
        zoomControl
      >
        <TileLayer key={basemap} attribution={mapTiles.attribution} url={mapTiles.url} />
        <MapRecenter center={mapCenter} zoom={mapZoom} />
        <HeatmapLayer points={heatPoints} visible={heatmapOn} />

        {userLocation && Number.isFinite(userLocation.lat) && userRing != null && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userRing}
              pathOptions={{
                color: "var(--map-user-ring)",
                fillColor: "var(--map-user-fill)",
                fillOpacity: 0.1,
                weight: 1,
                dashArray: "5 8",
              }}
            />
            <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_PIN_ICON}>
              <Popup>
                <div className="text-sm font-semibold">You are here</div>
                <p className="text-xs text-muted-foreground mt-1">GPS accuracy ~{Math.round(userRing)} m</p>
              </Popup>
            </Marker>
          </>
        )}

        {displayed.map((h) => (
          <Marker key={h.id} position={[h.lat, h.lng]} icon={makeHotspotIcon(h)}>
            <Popup>
              <div className="min-w-[180px] max-w-[240px] text-sm space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                {h.imageUrl && (
                  <img src={h.imageUrl} alt="" className="w-full h-24 rounded-md object-cover border border-border" />
                )}
                <p className="font-semibold text-foreground leading-tight">{h.label}</p>
                <p className="text-muted-foreground text-xs">
                  Severity: <span className="font-medium text-foreground">{h.severityPercent}%</span> ({h.severity})
                </p>
                {h.pollutionType && (
                  <p className="text-xs text-muted-foreground">
                    Type: <span className="font-medium text-foreground">{h.pollutionType}</span>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Source: <span className="font-medium text-foreground">{sourceHuman(h.source)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: <span className="font-medium text-foreground">{statusHuman(h.status)}</span>
                </p>
                {h.severityPercent > 50 && (
                  <p className="text-xs font-semibold text-primary pt-1 border-t border-border/60">🚁 Drone dispatched</p>
                )}
                {h.severityPercent > 50 && h.source === "drone" && (
                  <p className="text-[11px] text-muted-foreground">
                    Live drone: <span className="font-medium text-foreground">{droneFlightHuman(h.droneStatus)}</span>
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {dronePos && droneTarget && (
          <Marker position={[dronePos.lat, dronePos.lng]} icon={DRONE_ICON}>
            <Popup>
              <div className="text-sm font-medium">AquaGuard drone</div>
              <p className="text-xs text-muted-foreground mt-1">En route to {droneTarget.label}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Phase: {droneFlightHuman(droneTarget.droneStatus ?? (droneTarget.status === "cleaning" ? "cleaning" : "traveling"))}
              </p>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute right-3 top-3 z-[520]">
        <MapBasemapToggle value={basemap} onChange={setBasemap} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-[500] flex flex-col justify-start items-start p-3 md:p-4">
        <div className="pointer-events-auto w-[min(100%,320px)] max-h-[min(72vh,520px)] overflow-y-auto rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-md shadow-xl p-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 text-primary">
            <Radio className="h-4 w-4 shrink-0" />
            <span className="font-heading font-semibold text-foreground">Nearby pollution</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Use <strong>Satellite</strong> (top-right) for real imagery over water. Filters apply instantly; heatmap shows density by severity.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" className="rounded-full gap-1.5" onClick={recenterUser}>
              <Crosshair className="h-3.5 w-3.5" />
              Recenter
            </Button>
            <Button
              type="button"
              size="sm"
              variant={heatmapOn ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setHeatmapOn((v) => !v)}
            >
              Heatmap
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Search place</Label>
            <div className="flex gap-2">
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="City, bay, landmark…"
                className="h-9 rounded-xl text-xs"
                onKeyDown={(e) => e.key === "Enter" && void runSearch()}
              />
              <Button type="button" size="icon" className="h-9 w-9 shrink-0 rounded-xl" onClick={() => void runSearch()} disabled={searchBusy}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchHits.length > 0 && (
              <ul className="text-[11px] border border-border/60 rounded-lg divide-y divide-border/40 max-h-28 overflow-y-auto">
                {searchHits.map((hit, i) => (
                  <li key={`${hit.label}-${i}`}>
                    <button
                      type="button"
                      className="w-full text-left px-2 py-1.5 hover:bg-muted/60 rounded-none"
                      onClick={() => {
                        setMapCenter([hit.lat, hit.lng]);
                        setMapZoom(13);
                      }}
                    >
                      {hit.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Severity</Label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
              value={severityQ}
              onChange={(e) => setSeverityQ(e.target.value as Severity | "all")}
            >
              <option value="all">All</option>
              <option value="low">Low (&lt;20%)</option>
              <option value="medium">Medium (20–50%)</option>
              <option value="high">High (&gt;50%)</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Status</Label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
              value={statusQ}
              onChange={(e) => setStatusQ(e.target.value as HotspotStatus | "all")}
            >
              <option value="all">All</option>
              <option value="detected">Detected</option>
              <option value="cleaning">Cleaning</option>
              <option value="cleaned">Cleaned</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Source (API filter)</Label>
            <select
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
              value={sourceQ}
              onChange={(e) => setSourceQ(e.target.value as HotspotSource | "all")}
            >
              <option value="all">All</option>
              <option value="drone">Drone</option>
              <option value="citizen">Citizen</option>
            </select>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Layers
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="layer-drone" className="text-xs cursor-pointer">
                Drone data
              </Label>
              <Switch id="layer-drone" checked={layerDrone} onCheckedChange={setLayerDrone} className="scale-90" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="layer-citizen" className="text-xs cursor-pointer">
                Citizen reports
              </Label>
              <Switch id="layer-citizen" checked={layerCitizen} onCheckedChange={setLayerCitizen} className="scale-90" />
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground tabular-nums">{displayed.length} marker(s) visible</p>
        </div>
      </div>
    </div>
  );
}
