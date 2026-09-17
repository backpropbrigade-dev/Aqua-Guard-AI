import type { Hotspot, HotspotSource, HotspotStatus, Severity } from "@/lib/citizen-store";
import { getHotspots, severityFromPercent } from "@/lib/citizen-store";
import { getSession } from "@/lib/session";
import { distanceKm } from "@/lib/geo";

const BASE = (import.meta.env.VITE_CITIZEN_API_URL as string | undefined)?.replace(/\/$/, "");

export type MapHotspotFilters = {
  latitude?: number;
  longitude?: number;
  /** Client-side radius when using local data or coarse API results */
  radiusKm?: number;
  severity?: Severity | "all";
  status?: HotspotStatus | "all";
  source?: HotspotSource | "all";
};

/** API row shape (GET /hotspots) — tolerant of extra fields */
export type ApiHotspotRow = {
  id?: string;
  lat?: number;
  lng?: number;
  longitude?: number;
  severity?: number | string;
  status?: string;
  source?: string;
  image?: string;
  imageUrl?: string;
  label?: string;
  pollutionType?: string;
  droneStatus?: string;
};

function asStatus(s: string | undefined): HotspotStatus {
  if (s === "cleaning" || s === "cleaned" || s === "detected") return s;
  return "detected";
}

function asSource(s: string | undefined): HotspotSource {
  return s === "drone" ? "drone" : "citizen";
}

function normalizeSeverity(raw: number | string | undefined, fallbackPercent?: number): { severity: Severity; severityPercent: number } {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const p = Math.max(0, Math.min(100, raw));
    return { severity: severityFromPercent(p), severityPercent: p };
  }
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    if (!Number.isNaN(n) && raw.trim() !== "") {
      const p = Math.max(0, Math.min(100, n));
      return { severity: severityFromPercent(p), severityPercent: p };
    }
    const t = raw.toLowerCase();
    if (t === "low" || t === "medium" || t === "high") {
      const p = t === "low" ? 15 : t === "medium" ? 35 : 65;
      return { severity: t, severityPercent: fallbackPercent ?? p };
    }
  }
  const p = fallbackPercent ?? 30;
  return { severity: severityFromPercent(p), severityPercent: p };
}

export function normalizeApiHotspot(row: ApiHotspotRow, index: number): Hotspot {
  const lat = row.lat ?? 0;
  const lng = row.lng ?? row.longitude ?? 0;
  const { severity, severityPercent } = normalizeSeverity(row.severity, typeof row.severity === "number" ? row.severity : undefined);
  const ds = row.droneStatus;
  const droneStatus =
    ds === "traveling" || ds === "cleaning" || ds === "completed" ? ds : null;
  return {
    id: row.id ?? `api-h-${index}`,
    lat,
    lng,
    severity,
    severityPercent,
    status: asStatus(row.status),
    source: asSource(row.source),
    pollutionType: row.pollutionType,
    droneStatus,
    imageUrl: row.imageUrl ?? row.image,
    label: row.label ?? `Hotspot ${index + 1}`,
  };
}

export function filterHotspotsForMap(hotspots: Hotspot[], f: MapHotspotFilters): Hotspot[] {
  let out = hotspots.filter((h) => Number.isFinite(h.lat) && Number.isFinite(h.lng));
  if (f.latitude != null && f.longitude != null && f.radiusKm != null && f.radiusKm > 0) {
    out = out.filter((h) => distanceKm(f.latitude!, f.longitude!, h.lat, h.lng) <= f.radiusKm!);
  }
  if (f.severity && f.severity !== "all") {
    out = out.filter((h) => h.severity === f.severity);
  }
  if (f.status && f.status !== "all") {
    out = out.filter((h) => h.status === f.status);
  }
  if (f.source && f.source !== "all") {
    out = out.filter((h) => h.source === f.source);
  }
  return out;
}

function buildHotspotsQuery(f: MapHotspotFilters): string {
  const q = new URLSearchParams();
  if (f.latitude != null) q.set("latitude", String(f.latitude));
  if (f.longitude != null) q.set("longitude", String(f.longitude));
  if (f.severity && f.severity !== "all") q.set("severity", f.severity);
  if (f.status && f.status !== "all") q.set("status", f.status);
  if (f.source && f.source !== "all") q.set("source", f.source);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Returns null when no remote base or request failed */
export async function fetchHotspotsFromApi(f: MapHotspotFilters, signal?: AbortSignal): Promise<Hotspot[] | null> {
  if (!BASE) return null;
  try {
    const id = getSession()?.identifier;
    const r = await fetch(`${BASE}/hotspots${buildHotspotsQuery(f)}`, {
      credentials: "include",
      signal,
      headers: id ? { "X-Aquaguard-User": id } : undefined,
    });
    if (!r.ok) return null;
    const json = (await r.json()) as ApiHotspotRow[] | { data?: ApiHotspotRow[] };
    const arr = Array.isArray(json) ? json : json.data;
    if (!Array.isArray(arr)) return null;
    return arr.map((row, i) => normalizeApiHotspot(row, i));
  } catch {
    return null;
  }
}

export async function loadHotspotsForMap(f: MapHotspotFilters, signal?: AbortSignal): Promise<Hotspot[]> {
  const remote = await fetchHotspotsFromApi(
    {
      latitude: f.latitude,
      longitude: f.longitude,
      severity: f.severity,
      status: f.status,
      source: f.source,
    },
    signal,
  );
  const base = remote ?? getHotspots();
  return filterHotspotsForMap(base, f);
}
