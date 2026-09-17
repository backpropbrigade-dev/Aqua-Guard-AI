/**
 * Citizen domain store (localStorage by default). With `VITE_CITIZEN_API_URL`, bundles sync to SQLite via
 * `server/` (GET/PUT `/citizen/bundle`). Granular REST helpers: `citizen-api.ts`.
 */
import { getSession } from "@/lib/session";
import { distanceKm as haversineKm } from "@/lib/geo";
import { emitHotspotRealtimeTick } from "@/lib/hotspot-realtime";

// ——— Types ———

export type Severity = "low" | "medium" | "high";
export type ReportStatus = "uploaded" | "detected" | "cleaning" | "cleaned";
export type ResponseAction = "drone" | "ngo";

export type BoundingBox = { x: number; y: number; w: number; h: number };

/** Set when report is offered to NGO partners (accept / decline in NGO dashboard). */
export type NgoPartnerResponseStatus = "pending" | "accepted" | "declined";

export type PollutionReport = {
  id: string;
  userId: string;
  imageUrl: string;
  mediaType: "image" | "video";
  locationLabel: string;
  lat: number;
  lng: number;
  createdAt: string;
  plasticDetected: boolean;
  severityPercent: number;
  severity: Severity;
  boxes: BoundingBox[];
  status: ReportStatus;
  action: ResponseAction | null;
  notes?: string;
  afterImageUrl?: string;
  /** NGO partner queue: pending until partner accepts or declines */
  ngoPartnerStatus?: NgoPartnerResponseStatus;
  /** Authority must approve before request is visible to NGO (pending_review → approved) */
  authorityStatus?: "pending_review" | "approved" | "rejected";
};

export type HotspotStatus = "detected" | "cleaning" | "cleaned";

export type HotspotSource = "drone" | "citizen";

/** Live drone mission phase for high-severity / automated cleanup */
export type DroneFlightStatus = "traveling" | "cleaning" | "completed";

export type Hotspot = {
  id: string;
  lat: number;
  lng: number;
  severity: Severity;
  severityPercent: number;
  status: HotspotStatus;
  source: HotspotSource;
  pollutionType?: string;
  droneStatus?: DroneFlightStatus | null;
  imageUrl?: string;
  label: string;
  reportId?: string;
  isUserReport?: boolean;
};

export type NotificationType = "pollution_nearby" | "drone" | "cleanup" | "ngo";

export type CitizenNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type DashboardData = {
  totalReportsSubmitted: number;
  reportsCleaned: number;
  pointsEarned: number;
  activeAlertsNearby: number;
  mapMarkers: Hotspot[];
  /** Count of your reports by AI severity tier (for dashboard charts). */
  reportSeverityBreakdown: { low: number; medium: number; high: number };
  systemStatus: {
    droneActiveNearYou: boolean;
    criticalAlerts: boolean;
    droneMessage: string;
    alertMessage: string;
  };
  recentActivity: { id: string; text: string; at: string }[];
};

export type CitizenProfileState = {
  displayName: string;
  email: string;
  photoDataUrl: string | null;
  points: number;
  cleanupsTriggered: number;
  reportsSubmitted: number;
};

export type AlertTypeSettings = {
  pollutionNearby: boolean;
  drone: boolean;
  cleanup: boolean;
  ngo: boolean;
};

export type CitizenSettingsState = {
  pushNotifications: boolean;
  alertTypes: AlertTypeSettings;
  emailDigest: boolean;
  shareApproxLocation: boolean;
  /** Continuous GPS watch while using the citizen dashboard */
  liveLocationTracking: boolean;
};

export type FaqItem = { id: string; question: string; answer: string };

export type SupportTicket = {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
};

export type LeaderboardEntry = { rank: number; name: string; points: number; isYou?: boolean };

export type RewardsData = {
  points: number;
  totalContributions: number;
  rankPercentile: number;
  badges: { id: string; name: string; emoji: string; description: string; earned: boolean }[];
  leaderboard: LeaderboardEntry[];
  pointsLog: { delta: number; reason: string; at: string }[];
};

// ——— React subscription ———

let version = 0;
const listeners = new Set<() => void>();

export function subscribeCitizen(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getCitizenVersion(): number {
  return version;
}

function bump(): void {
  version += 1;
  listeners.forEach((l) => l());
}

function uid(): string {
  return getSession()?.identifier ?? "guest";
}

function safeKey(id: string): string {
  return id.replace(/[^a-zA-Z0-9@._-]/g, "_");
}

const BUNDLE_KEY = (u: string) => `aquaguard_citizen_${safeKey(u)}`;

export type UserBundle = {
  reports: PollutionReport[];
  notifications: CitizenNotification[];
  profile: CitizenProfileState;
  settings: CitizenSettingsState;
  tickets: SupportTicket[];
  pointsLog: { delta: number; reason: string; at: string }[];
};

const CITIZEN_API_BASE = (import.meta.env.VITE_CITIZEN_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

/** When API sync is enabled, cached bundle for `uid()` wins over a stale localStorage read. */
const remoteBundleCache = new Map<string, UserBundle>();

const DEFAULT_PROFILE = (id: string): CitizenProfileState => ({
  displayName: id.includes("@") ? id.split("@")[0] : id || "Citizen",
  email: id.includes("@") ? id : "",
  photoDataUrl: null,
  points: 195,
  cleanupsTriggered: 2,
  reportsSubmitted: 0,
});

const DEFAULT_SETTINGS: CitizenSettingsState = {
  pushNotifications: true,
  alertTypes: {
    pollutionNearby: true,
    drone: true,
    cleanup: true,
    ngo: true,
  },
  emailDigest: true,
  shareApproxLocation: true,
  liveLocationTracking: true,
};

function normalizeStoredBundle(u: string, p: Partial<UserBundle>): UserBundle {
  return {
    reports: Array.isArray(p.reports) ? p.reports : [],
    notifications: Array.isArray(p.notifications) ? p.notifications : [],
    profile: { ...DEFAULT_PROFILE(u), ...p.profile },
    settings: { ...DEFAULT_SETTINGS, ...p.settings, alertTypes: { ...DEFAULT_SETTINGS.alertTypes, ...p.settings?.alertTypes } },
    tickets: Array.isArray(p.tickets) ? p.tickets : [],
    pointsLog: Array.isArray(p.pointsLog) ? p.pointsLog : [],
  };
}

function loadBundle(u: string): UserBundle {
  try {
    const raw = localStorage.getItem(BUNDLE_KEY(u));
    if (!raw) throw new Error("empty");
    const p = JSON.parse(raw) as UserBundle;
    return normalizeStoredBundle(u, p);
  } catch {
    return {
      reports: seedDemoPollutionReports(u),
      notifications: seedNotifications(u),
      profile: { ...DEFAULT_PROFILE(u), points: 265, cleanupsTriggered: 3 },
      settings: { ...DEFAULT_SETTINGS },
      tickets: [],
      pointsLog: [
        { delta: 10, reason: "Welcome bonus — AquaGuard AP & Telangana", at: new Date().toISOString() },
        { delta: 24, reason: "Plastic detected — RK Beach, Visakhapatnam", at: new Date(Date.now() - 3600_000).toISOString() },
        { delta: 18, reason: "Valid detection — Tenneti Park shore, Vizag", at: new Date(Date.now() - 7200_000).toISOString() },
        { delta: 50, reason: "High severity — UAV survey (Gangavaram port corridor)", at: new Date(Date.now() - 86400_000).toISOString() },
        { delta: 25, reason: "Cleanup verified — Suryalanka Beach, Bapatla", at: new Date(Date.now() - 2 * 86400_000).toISOString() },
      ],
    };
  }
}

function saveBundle(u: string, b: UserBundle): void {
  localStorage.setItem(BUNDLE_KEY(u), JSON.stringify(b));
  bump();
}

/** Storage key for the logged-in citizen bundle (`aquaguard_citizen_<safeId>`). */
export function getCitizenBundleStorageKey(): string {
  return BUNDLE_KEY(uid());
}

/** Read any citizen bundle by exact localStorage key (used by authority / NGO cross-bundle updates). */
export function readCitizenBundleByStorageKey(bundleKey: string): UserBundle | null {
  try {
    const raw = localStorage.getItem(bundleKey);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<UserBundle>;
    const seed =
      typeof p.profile?.displayName === "string" && p.profile.displayName
        ? p.profile.displayName
        : bundleKey.replace(/^aquaguard_citizen_/, "") || "citizen";
    return normalizeStoredBundle(seed, p);
  } catch {
    return null;
  }
}

export function writeCitizenBundleByStorageKey(bundleKey: string, b: UserBundle): void {
  localStorage.setItem(bundleKey, JSON.stringify(b));
  bump();
}

export function patchCitizenReportByStorageKey(
  bundleKey: string,
  reportId: string,
  patch: Partial<PollutionReport>,
): boolean {
  const b = readCitizenBundleByStorageKey(bundleKey);
  if (!b) return false;
  const idx = b.reports.findIndex((r) => r.id === reportId);
  if (idx < 0) return false;
  b.reports[idx] = { ...b.reports[idx], ...patch };
  writeCitizenBundleByStorageKey(bundleKey, b);
  return true;
}

export function addPointsToCitizenBundle(bundleKey: string, delta: number, reason: string): boolean {
  const b = readCitizenBundleByStorageKey(bundleKey);
  if (!b) return false;
  const at = new Date().toISOString();
  const next = addPoints(b, delta, reason);
  writeCitizenBundleByStorageKey(bundleKey, next);
  return true;
}

export function pushNotificationToCitizenBundle(
  bundleKey: string,
  n: Omit<CitizenNotification, "id" | "createdAt" | "read"> & { id?: string },
): boolean {
  const b = readCitizenBundleByStorageKey(bundleKey);
  if (!b) return false;
  writeCitizenBundleByStorageKey(bundleKey, pushNotification(b, n));
  return true;
}

function read(): UserBundle {
  const u = uid();
  if (CITIZEN_API_BASE && remoteBundleCache.has(u)) {
    return remoteBundleCache.get(u)!;
  }
  return loadBundle(u);
}

async function persistCitizenBundleRemote(u: string, b: UserBundle): Promise<void> {
  if (!CITIZEN_API_BASE) return;
  try {
    await fetch(`${CITIZEN_API_BASE}/citizen/bundle`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Aquaguard-User": u },
      credentials: "include",
      body: JSON.stringify(b),
    });
  } catch {
    /* offline — localStorage copy remains */
  }
}

function write(b: UserBundle): void {
  const u = uid();
  saveBundle(u, b);
  if (CITIZEN_API_BASE) {
    remoteBundleCache.set(u, b);
    void persistCitizenBundleRemote(u, b);
  }
}

/**
 * Pull the citizen bundle from the API into memory + localStorage (when `VITE_CITIZEN_API_URL` is set).
 * Call after citizen login / layout mount.
 */
export async function hydrateCitizenBundleFromApi(): Promise<void> {
  if (!CITIZEN_API_BASE) return;
  const u = getSession()?.identifier;
  if (!u) return;
  try {
    const r = await fetch(`${CITIZEN_API_BASE}/citizen/bundle`, {
      headers: { "X-Aquaguard-User": u },
      credentials: "include",
    });
    if (r.status === 404) return;
    if (!r.ok) return;
    const json = (await r.json()) as unknown;
    const partial = json && typeof json === "object" && !Array.isArray(json) ? (json as Partial<UserBundle>) : {};
    const merged = normalizeStoredBundle(u, partial);
    remoteBundleCache.set(u, merged);
    saveBundle(u, merged);
  } catch {
    /* ignore */
  }
}

function seedNotifications(userId: string): CitizenNotification[] {
  const now = Date.now();
  return [
    {
      id: `n-seed-1-${userId}`,
      type: "pollution_nearby",
      title: "High pollution nearby",
      body: "Elevated markers within ~1.2 km of RK Beach — open the map for live hotspots.",
      createdAt: new Date(now - 2 * 3600_000).toISOString(),
      read: false,
    },
    {
      id: `n-seed-2-${userId}`,
      type: "cleanup",
      title: "Cleanup completed",
      body: "Tenneti Park to Rushikonda stretch cleaned. +25 points awarded.",
      createdAt: new Date(now - 86400_000).toISOString(),
      read: false,
    },
    {
      id: `n-seed-3-${userId}`,
      type: "drone",
      title: "Drone dispatched",
      body: "UAV routed to Visakhapatnam harbour belt survey — window Tue 06:00–08:00 IST.",
      createdAt: new Date(now - 2 * 86400_000).toISOString(),
      read: true,
    },
  ];
}

/** Default map center (RK Beach, Visakhapatnam) — overridden by user location when available */
export const DEFAULT_MAP_CENTER: [number, number] = [17.721, 83.316];

const PLACEHOLDER_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect fill="#0d9488" width="120" height="80" rx="6"/><text x="60" y="44" text-anchor="middle" fill="white" font-family="system-ui" font-size="9">AquaGuard</text></svg>`,
  );

const AFTER_CLEAN_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect fill="#14b8a6" width="320" height="200"/><text x="160" y="100" text-anchor="middle" fill="white" font-family="system-ui" font-size="13">After cleanup</text></svg>`,
  );

const SEED_HOTSPOTS: Hotspot[] = [
  {
    id: "h-seed-1",
    lat: 17.728,
    lng: 83.322,
    severity: "high",
    severityPercent: 74,
    status: "cleaning",
    source: "drone",
    pollutionType: "Plastic debris",
    droneStatus: "cleaning",
    label: "RK Beach — debris line, Vizag",
    imageUrl: PLACEHOLDER_IMG,
  },
  {
    id: "h-seed-2",
    lat: 17.695,
    lng: 83.298,
    severity: "medium",
    severityPercent: 41,
    status: "detected",
    source: "drone",
    pollutionType: "Foam / runoff",
    label: "Visakhapatnam harbour belt",
    imageUrl: PLACEHOLDER_IMG,
  },
  {
    id: "h-seed-3",
    lat: 16.992,
    lng: 82.251,
    severity: "low",
    severityPercent: 14,
    status: "cleaned",
    source: "citizen",
    pollutionType: "Litter (cleared)",
    droneStatus: "completed",
    label: "Kakinada Beach promenade (cleared)",
    imageUrl: PLACEHOLDER_IMG,
  },
  {
    id: "h-seed-4",
    lat: 17.423,
    lng: 78.474,
    severity: "medium",
    severityPercent: 46,
    status: "detected",
    source: "citizen",
    pollutionType: "Lake-edge litter",
    label: "Hussain Sagar — Necklace Road",
    imageUrl: PLACEHOLDER_IMG,
  },
  {
    id: "h-seed-5",
    lat: 17.008,
    lng: 81.798,
    severity: "low",
    severityPercent: 22,
    status: "detected",
    source: "citizen",
    pollutionType: "Riverbank plastic",
    label: "Godavari ghats, Rajahmundry",
    imageUrl: PLACEHOLDER_IMG,
  },
];

/** Sample reports for new citizen bundles — Andhra Pradesh & Telangana demo data. */
function seedDemoPollutionReports(userId: string): PollutionReport[] {
  const img = PLACEHOLDER_IMG;
  const t = Date.now();
  const sk = safeKey(userId).slice(0, 24);
  return [
    {
      id: `demo-${sk}-r1`,
      userId,
      imageUrl: img,
      mediaType: "image",
      locationLabel: "RK Beach, Visakhapatnam, Andhra Pradesh",
      lat: 17.724,
      lng: 83.318,
      createdAt: new Date(t - 2 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 71,
      severity: "high",
      boxes: [{ x: 0.18, y: 0.28, w: 0.44, h: 0.3 }],
      status: "detected",
      action: "drone",
      notes: "High-tide plastic line along RK Beach — bottles and wrappers.",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
    },
    {
      id: `demo-${sk}-r2`,
      userId,
      imageUrl: img,
      mediaType: "image",
      locationLabel: "Tenneti Park, Visakhapatnam, Andhra Pradesh",
      lat: 17.745,
      lng: 83.345,
      createdAt: new Date(t - 5 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 36,
      severity: "medium",
      boxes: [{ x: 0.25, y: 0.35, w: 0.3, h: 0.2 }],
      status: "cleaning",
      action: "ngo",
      notes: "Foam and litter near park storm-water outfall.",
      authorityStatus: "approved",
      ngoPartnerStatus: "pending",
    },
    {
      id: `demo-${sk}-r3`,
      userId,
      imageUrl: img,
      mediaType: "image",
      locationLabel: "Suryalanka Beach, Bapatla, Andhra Pradesh",
      lat: 15.754,
      lng: 80.518,
      createdAt: new Date(t - 9 * 86400_000).toISOString(),
      plasticDetected: false,
      severityPercent: 14,
      severity: "low",
      boxes: [],
      status: "cleaned",
      action: "ngo",
      notes: "Volunteer cleanup completed — shoreline sand quality improved.",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
      afterImageUrl: AFTER_CLEAN_SVG,
    },
  ];
}

export function severityFromPercent(p: number): Severity {
  if (p > 50) return "high";
  if (p >= 20) return "medium";
  return "low";
}

export function severityHex(s: Severity): string {
  switch (s) {
    case "low":
      return "#22c55e";
    case "medium":
      return "#eab308";
    case "high":
      return "#ef4444";
    default:
      return "#64748b";
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Simulated vision model output */
export function simulateAiDetection(seed: string): {
  plasticDetected: boolean;
  severityPercent: number;
  boxes: BoundingBox[];
} {
  const h = hashStr(seed);
  const plasticDetected = h % 10 !== 0;
  const severityPercent = plasticDetected ? 15 + (h % 80) : 5 + (h % 15);
  const nBoxes = plasticDetected ? 1 + (h % 3) : 0;
  const boxes: BoundingBox[] = [];
  for (let i = 0; i < nBoxes; i++) {
    const x = ((h >> (i * 3)) % 60) / 100;
    const y = ((h >> (i * 5)) % 50) / 100;
    const w = 0.15 + ((h >> (i * 7)) % 25) / 100;
    const hgt = 0.12 + ((h >> (i * 11)) % 20) / 100;
    boxes.push({ x, y, w, h: hgt });
  }
  return { plasticDetected, severityPercent, boxes };
}

export function decisionFromSeverity(severity: Severity): { action: ResponseAction; initialStatus: ReportStatus } {
  if (severity === "high") return { action: "drone", initialStatus: "cleaning" };
  return { action: "ngo", initialStatus: "detected" };
}

function addPoints(b: UserBundle, delta: number, reason: string): UserBundle {
  const at = new Date().toISOString();
  return {
    ...b,
    profile: { ...b.profile, points: Math.max(0, b.profile.points + delta) },
    pointsLog: [{ delta, reason, at }, ...b.pointsLog].slice(0, 50),
  };
}

function pushNotification(b: UserBundle, n: Omit<CitizenNotification, "id" | "createdAt" | "read"> & { id?: string }): UserBundle {
  const item: CitizenNotification = {
    id: n.id ?? `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: n.type,
    title: n.title,
    body: n.body,
    createdAt: new Date().toISOString(),
    read: false,
  };
  return { ...b, notifications: [item, ...b.notifications] };
}

export function getUnreadNotificationCount(): number {
  return read().notifications.filter((n) => !n.read).length;
}

export function getDashboardData(): DashboardData {
  const b = read();
  const u = uid();
  const cleaned = b.reports.filter((r) => r.status === "cleaned").length;
  const hotspots = getHotspots();
  const highNear = hotspots.filter((h) => h.severity === "high" && h.status !== "cleaned").length;
  const droneActive = b.reports.some((r) => r.status === "cleaning" && r.action === "drone") || hotspots.some((h) => h.status === "cleaning");

  const recentActivity: DashboardData["recentActivity"] = [];
  b.notifications.slice(0, 3).forEach((n, i) => {
    recentActivity.push({ id: `act-n-${i}`, text: `${n.title} — ${n.body.slice(0, 80)}${n.body.length > 80 ? "…" : ""}`, at: n.createdAt });
  });
  b.reports.slice(0, 2).forEach((r, i) => {
    recentActivity.push({
      id: `act-r-${i}`,
      text: `Report ${r.id.slice(0, 8)} ${r.status} — ${r.locationLabel}`,
      at: r.createdAt,
    });
  });
  recentActivity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const reportSeverityBreakdown = {
    low: b.reports.filter((r) => r.severity === "low").length,
    medium: b.reports.filter((r) => r.severity === "medium").length,
    high: b.reports.filter((r) => r.severity === "high").length,
  };

  return {
    totalReportsSubmitted: b.reports.length,
    reportsCleaned: cleaned,
    pointsEarned: b.profile.points,
    activeAlertsNearby: highNear + b.notifications.filter((n) => !n.read && n.type === "pollution_nearby").length,
    mapMarkers: hotspots.slice(0, 8),
    reportSeverityBreakdown,
    systemStatus: {
      droneActiveNearYou: droneActive,
      criticalAlerts: highNear > 0,
      droneMessage: droneActive ? "Drone active near your area" : "No drone deployment in your zone right now",
      alertMessage: highNear > 0 ? `${highNear} critical hotspot(s) nearby` : "No critical alerts",
    },
    recentActivity: recentActivity.slice(0, 6),
  };
}

export function getHotspots(): Hotspot[] {
  const b = read();
  const fromReports: Hotspot[] = b.reports.map((r) => {
    const st: HotspotStatus =
      r.status === "uploaded" ? "detected" : r.status === "detected" ? "detected" : r.status === "cleaning" ? "cleaning" : "cleaned";
    let droneStatus: DroneFlightStatus | null = null;
    if (r.action === "drone") {
      if (r.status === "cleaning") droneStatus = "cleaning";
      else if (r.status === "cleaned") droneStatus = "completed";
      else droneStatus = "traveling";
    }
    return {
      id: `h-${r.id}`,
      lat: r.lat,
      lng: r.lng,
      severity: r.severity,
      severityPercent: r.severityPercent,
      status: st,
      source: "citizen" as const,
      pollutionType: r.plasticDetected ? "Plastic debris" : "General / unclassified",
      droneStatus,
      imageUrl: r.imageUrl,
      label: r.locationLabel,
      reportId: r.id,
      isUserReport: true,
    };
  });
  const merged = [...SEED_HOTSPOTS.map((h) => ({ ...h })), ...fromReports];
  return merged;
}

export function getNearestHotspotFrom(lat: number, lng: number): { hotspot: Hotspot; distanceKm: number } | null {
  const hs = getHotspots();
  if (!hs.length) return null;
  let best = hs[0];
  let bestD = haversineKm(lat, lng, best.lat, best.lng);
  for (let i = 1; i < hs.length; i++) {
    const d = haversineKm(lat, lng, hs[i].lat, hs[i].lng);
    if (d < bestD) {
      best = hs[i];
      bestD = d;
    }
  }
  return { hotspot: best, distanceKm: bestD };
}

/** Nearest hotspot within radius (km) — avoids misleading distances when demo seeds are far away */
export function getNearestHotspotWithin(lat: number, lng: number, maxKm: number): { hotspot: Hotspot; distanceKm: number } | null {
  const hs = getHotspots();
  let best: { hotspot: Hotspot; distanceKm: number } | null = null;
  for (const h of hs) {
    const d = haversineKm(lat, lng, h.lat, h.lng);
    if (d <= maxKm && (!best || d < best.distanceKm)) {
      best = { hotspot: h, distanceKm: d };
    }
  }
  return best;
}

export function getMyReports(): PollutionReport[] {
  return [...read().reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Demo: mark a report cleaned and attach a placeholder after-image */
export function markReportCleaned(id: string): void {
  let b = read();
  b = {
    ...b,
    reports: b.reports.map((r) =>
      r.id === id ? { ...r, status: "cleaned" as const, afterImageUrl: r.afterImageUrl ?? AFTER_CLEAN_SVG } : r,
    ),
  };
  b = addPoints(b, 25, "Cleanup completed at your report (+25)");
  b = pushNotification(b, {
    type: "cleanup",
    title: "Cleanup completed",
    body: "A reported site was verified clean. Points have been added to your wallet.",
  });
  write(b);
  emitHotspotRealtimeTick();
}

export function getNotifications(): CitizenNotification[] {
  return [...read().notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markNotificationRead(id: string): void {
  const b = read();
  write({
    ...b,
    notifications: b.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  });
}

export function markAllNotificationsRead(): void {
  const b = read();
  write({ ...b, notifications: b.notifications.map((n) => ({ ...n, read: true })) });
}

export function getProfile(): CitizenProfileState {
  const b = read();
  return {
    ...b.profile,
    reportsSubmitted: b.reports.length,
    cleanupsTriggered: b.profile.cleanupsTriggered,
    points: b.profile.points,
  };
}

export function updateProfile(patch: Partial<Pick<CitizenProfileState, "displayName" | "email" | "photoDataUrl">>): void {
  const b = read();
  write({ ...b, profile: { ...b.profile, ...patch } });
}

export function updatePassword(_current: string, _next: string): boolean {
  void _current;
  void _next;
  bump();
  return true;
}

export function getSettings(): CitizenSettingsState {
  return { ...read().settings, alertTypes: { ...read().settings.alertTypes } };
}

export function updateSettings(patch: Partial<CitizenSettingsState>): void {
  const b = read();
  const nextAlert = patch.alertTypes ? { ...b.settings.alertTypes, ...patch.alertTypes } : b.settings.alertTypes;
  write({
    ...b,
    settings: {
      ...b.settings,
      ...patch,
      alertTypes: nextAlert,
    },
  });
}

function computeBadges(b: UserBundle) {
  const reports = b.reports.length;
  const valid = b.reports.filter((r) => r.plasticDetected).length;
  const warrior = b.reports.some((r) => r.severity === "high" || r.action === "drone");
  return [
    {
      id: "eco",
      name: "Eco Starter",
      emoji: "🌱",
      description: "Submit your first report",
      earned: reports >= 1,
    },
    {
      id: "reporter",
      name: "Active Reporter",
      emoji: "📸",
      description: "3+ reports with valid plastic detection",
      earned: valid >= 3,
    },
    {
      id: "warrior",
      name: "Pollution Warrior",
      emoji: "🌍",
      description: "Trigger cleanup (high severity / drone)",
      earned: warrior,
    },
  ];
}

export function getRewards(): RewardsData {
  const b = read();
  const badges = computeBadges(b);
  const leaderboard: LeaderboardEntry[] = [
    { rank: 1, name: "Aditi Verma", points: 1920 },
    { rank: 2, name: "Rohan Mehta", points: 1745 },
    { rank: 3, name: "Sneha Pillai", points: 1588 },
    { rank: 4, name: b.profile.displayName, points: b.profile.points, isYou: true },
    { rank: 5, name: "Karthik Bose", points: Math.max(220, b.profile.points - 35) },
    { rank: 6, name: "Divya Nambiar", points: Math.max(195, b.profile.points - 70) },
  ]
    .sort((a, b) => b.points - a.points)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const pct = Math.min(99, 40 + b.reports.length * 4 + Math.floor(b.profile.points / 50));

  return {
    points: b.profile.points,
    totalContributions: b.reports.length + b.profile.cleanupsTriggered,
    rankPercentile: pct,
    badges,
    leaderboard,
    pointsLog: b.pointsLog,
  };
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "1",
    question: "How do I report pollution?",
    answer:
      "Open Report Pollution, upload a photo or short video (or use your camera), confirm location, and submit. Our AI estimates plastic presence and severity to route the right response.",
  },
  {
    id: "2",
    question: "How does the AI work?",
    answer:
      "Images are analyzed for plastic-like debris (demo uses on-device simulation). You’ll see bounding boxes and a severity score. High severity can trigger drone survey; other cases go to NGO partners.",
  },
  {
    id: "3",
    question: "Is my exact location stored?",
    answer:
      "Only what you submit: GPS or a pin you choose. You can disable approximate location sharing in Settings; the map may be less accurate.",
  },
  {
    id: "4",
    question: "What do map colors mean?",
    answer: "Green: low severity, Yellow: medium, Red: high. Click a marker for status: Detected, Cleaning (drone active), or Cleaned.",
  },
  {
    id: "5",
    question: "How do points and badges work?",
    answer: "+10 for a submitted report, +20 when plastic is detected, +50 when cleanup is triggered. Badges unlock as you hit milestones on the Rewards page.",
  },
];

export function getFaq(): FaqItem[] {
  return FAQ_ITEMS;
}

export function submitSupportTicket(subject: string, message: string): SupportTicket {
  const b = read();
  const ticket: SupportTicket = {
    id: `t-${Date.now()}`,
    subject,
    message,
    createdAt: new Date().toISOString(),
  };
  write({ ...b, tickets: [ticket, ...b.tickets] });
  return ticket;
}

export function getSupportTickets(): SupportTicket[] {
  return read().tickets;
}

const VIDEO_POSTER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect fill="#0e7490" width="320" height="200"/><text x="160" y="105" text-anchor="middle" fill="white" font-family="system-ui" font-size="14">Video report</text></svg>`,
  );

export async function resizeImageToDataUrl(file: File, maxW = 480): Promise<string> {
  if (!file.type.startsWith("image/")) return VIDEO_POSTER;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return VIDEO_POSTER;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export type UploadReportResult = {
  report: PollutionReport;
  pointsAwarded: { base: number; severity: number; plastic: number; routingNote: string };
  /** Nearest idle UAV assigned to this report’s coordinates (local demo). */
  uavDispatched: boolean;
};

export async function uploadReport(input: {
  file: File | null;
  dataUrlFallback?: string;
  mediaType: "image" | "video";
  lat: number;
  lng: number;
  locationLabel: string;
  notes?: string;
}): Promise<UploadReportResult> {
  let imageUrl = input.dataUrlFallback ?? VIDEO_POSTER;
  if (input.file && input.mediaType === "image") {
    imageUrl = await resizeImageToDataUrl(input.file);
  } else if (input.file && input.mediaType === "video") {
    imageUrl = VIDEO_POSTER;
  }

  const seed = `${input.lat},${input.lng},${Date.now()},${input.file?.name ?? "cam"}`;
  const ai = simulateAiDetection(seed);
  const severity = severityFromPercent(ai.severityPercent);
  const { action, initialStatus } = decisionFromSeverity(severity);

  const report: PollutionReport = {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId: uid(),
    imageUrl,
    mediaType: input.mediaType,
    locationLabel: input.locationLabel,
    lat: input.lat,
    lng: input.lng,
    createdAt: new Date().toISOString(),
    plasticDetected: ai.plasticDetected,
    severityPercent: ai.severityPercent,
    severity,
    boxes: ai.boxes,
    status: "detected",
    action,
    notes: input.notes,
    ngoPartnerStatus: "pending",
    authorityStatus: "pending_review",
  };

  const b0 = read();
  let b1: UserBundle = {
    ...b0,
    reports: [report, ...b0.reports],
    profile: { ...b0.profile, reportsSubmitted: b0.profile.reportsSubmitted + 1 },
  };

  const ptsBase = 5;
  const ptsSeverity = severity === "high" ? 45 : severity === "medium" ? 25 : 12;
  const ptsPlastic = ai.plasticDetected ? 18 : 0;
  b1 = addPoints(b1, ptsBase, `Citizen responsibility — report filed (+${ptsBase})`);
  b1 = addPoints(b1, ptsSeverity, `Severity (${severity}) contribution (+${ptsSeverity})`);
  if (ptsPlastic > 0) {
    b1 = addPoints(b1, ptsPlastic, `Plastic indicated — detection bonus (+${ptsPlastic})`);
  }

  const routingNote =
    action === "drone"
      ? `AI classifies ${ai.severityPercent}% as high — drone/rapid response is recommended after authority approval.`
      : `AI classifies ${ai.severityPercent}% — NGO field response is appropriate after authority approval.`;

  b1 = pushNotification(b1, {
    type: "ngo",
    title: "Report received — authority review",
    body: `Your report for ${input.locationLabel} is queued for verification. You earned points for responsible reporting; NGOs see it only after approval.`,
  });

  write(b1);
  emitHotspotRealtimeTick();

  const bundleKey = getCitizenBundleStorageKey();
  void import("@/lib/authority-review-queue").then((m) =>
    m.enqueueAuthorityReview({
      report,
      citizenBundleKey: bundleKey,
      citizenLabel: uid(),
    }),
  );

  const { runPlasticUavAutoDispatchScan } = await import("@/lib/uav-plastic-automation");
  const uavScan = runPlasticUavAutoDispatchScan({ dispatchSource: "citizen_sync" });
  const uavDispatched = uavScan.reportIdsAssigned.includes(report.id);

  return {
    report,
    pointsAwarded: {
      base: ptsBase,
      severity: ptsSeverity,
      plastic: ptsPlastic,
      routingNote,
    },
    uavDispatched,
  };
}

/** NGO dashboard: mark partner decision on a citizen report (by report id). */
export function setReportNgoPartnerStatus(reportId: string, status: NgoPartnerResponseStatus): void {
  const b = read();
  const next = b.reports.map((r) => (r.id === reportId ? { ...r, ngoPartnerStatus: status } : r));
  if (next.every((r, i) => r === b.reports[i])) return;
  write({ ...b, reports: next });
}

/** Simulated websocket tick — nudges hotspot/live feel */
export function simulateLiveUpdate(): void {
  if (Math.random() > 0.35) return;
  const b = read();
  const msg =
    Math.random() > 0.5
      ? "Map refreshed: NGO team checked a nearby marker."
      : "Live: slight wind shift — stay alert for new uploads.";
  write(
    pushNotification(b, {
      type: "ngo",
      title: "AquaGuard live",
      body: msg,
    }),
  );
  emitHotspotRealtimeTick();
}
