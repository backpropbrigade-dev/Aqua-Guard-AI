import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, useMapEvents, Circle, Marker } from "react-leaflet";
import { MapBasemapToggle } from "@/components/dashboard/citizen/MapBasemapToggle";
import { severityHex, type Hotspot } from "@/lib/citizen-store";
import { getMapTileLayer, type MapBasemapId } from "@/lib/map-tile-providers";
import "leaflet/dist/leaflet.css";

const USER_PIN_ICON = L.divIcon({
  className: "aquaguard-map-user-icon",
  html: '<div class="aquaguard-map-user-pin" aria-hidden="true"></div>',
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -34],
});

function statusLabel(status: Hotspot["status"]): string {
  switch (status) {
    case "cleaning":
      return "Cleaning (Drone active)";
    case "cleaned":
      return "Cleaned";
    default:
      return "Detected";
  }
}

type MapClickProps = {
  onLocationPick?: (lat: number, lng: number) => void;
};

function MapClickHandler({ onLocationPick }: MapClickProps) {
  useMapEvents({
    click(e) {
      onLocationPick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const lat = center[0];
  const lng = center[1];
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
}

export type MapUserLocation = {
  lat: number;
  lng: number;
  accuracyM?: number | null;
};

function UserLocationLayers({ userLocation }: { userLocation: MapUserLocation }) {
  const { lat, lng, accuracyM } = userLocation;
  const radius = Math.min(Math.max(accuracyM ?? 35, 20), 800);
  return (
    <>
      <Circle
        center={[lat, lng]}
        radius={radius}
        pathOptions={{
          color: "var(--map-user-ring)",
          fillColor: "var(--map-user-fill)",
          fillOpacity: 0.1,
          weight: 1,
          dashArray: "5 8",
        }}
      />
      <Marker position={[lat, lng]} icon={USER_PIN_ICON}>
        <Popup>
          <div className="text-sm font-semibold">You are here</div>
          <p className="text-xs text-muted-foreground mt-1">GPS accuracy ~{Math.round(radius)} m</p>
        </Popup>
      </Marker>
    </>
  );
}

type PollutionMapViewProps = {
  center: [number, number];
  zoom?: number;
  markers: Hotspot[];
  height: number | string;
  className?: string;
  /** When false, map is read-only preview */
  interactive?: boolean;
  onLocationPick?: (lat: number, lng: number) => void;
  /** Live device position (accuracy ring + pin) */
  userLocation?: MapUserLocation | null;
  /** Street vs satellite imagery (Esri World Imagery) */
  showBasemapToggle?: boolean;
};

export function PollutionMapView({
  center,
  zoom = 13,
  markers,
  height,
  className,
  interactive = true,
  onLocationPick,
  userLocation,
  showBasemapToggle = true,
}: PollutionMapViewProps) {
  const h = typeof height === "number" ? `${height}px` : height;
  const [basemap, setBasemap] = useState<MapBasemapId>("street");
  const tiles = getMapTileLayer(basemap);

  const validMarkers = useMemo(() => markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)), [markers]);

  return (
    <div className={`relative z-0 overflow-hidden rounded-xl ${className ?? ""}`} style={{ height: h, width: "100%" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full rounded-xl [&_.leaflet-control-attribution]:text-[10px]"
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
      >
        <TileLayer key={basemap} attribution={tiles.attribution} url={tiles.url} />
        <Recenter center={center} zoom={zoom} />
        {onLocationPick && <MapClickHandler onLocationPick={onLocationPick} />}
        {userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng) && (
          <UserLocationLayers userLocation={userLocation} />
        )}
        {validMarkers.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={interactive ? 11 : 8}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: severityHex(m.severity),
              fillOpacity: 0.85,
            }}
          >
            <Popup>
              <div className="min-w-[160px] max-w-[220px] text-sm">
                <p className="font-semibold text-foreground">{m.label}</p>
                {m.imageUrl && (
                  <img src={m.imageUrl} alt="" className="mt-2 h-20 w-full rounded-md object-cover border border-border" />
                )}
                <p className="mt-2 text-muted-foreground">
                  Severity: <span className="font-medium text-foreground">{m.severityPercent}%</span> ({m.severity})
                </p>
                {m.pollutionType && (
                  <p className="text-muted-foreground text-xs">
                    Type: <span className="font-medium text-foreground">{m.pollutionType}</span>
                  </p>
                )}
                <p className="text-muted-foreground text-xs">
                  Source: <span className="font-medium text-foreground">{m.source === "drone" ? "Drone" : "Citizen"}</span>
                </p>
                <p className="text-muted-foreground">
                  Status: <span className="font-medium text-foreground">{statusLabel(m.status)}</span>
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {showBasemapToggle && (
        <div className="pointer-events-none absolute right-2 top-2 z-[400]">
          <MapBasemapToggle value={basemap} onChange={setBasemap} className="pointer-events-auto" />
        </div>
      )}
    </div>
  );
}
