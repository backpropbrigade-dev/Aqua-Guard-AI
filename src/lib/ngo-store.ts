/**
 * Demo NGO partner workspace — local state (mirrors future GET /ngo/missions, /ngo/analytics).
 */

import { rewardAssignedWorkersFromMissionNotes } from "@/lib/worker-store";
import type { BoundingBox } from "@/lib/citizen-store";

/** Simulated AI analysis result for worker-uploaded photos */
export type WorkerImageAnalysis = {
  plasticDetected: boolean;
  severityPercent: number;
  severity: NgoSeverity;
  boxes: BoundingBox[];
};

/** Simulates AI plastic detection on worker-uploaded images.
 * In production, this would call an ML model API.
 */
export function simulateWorkerImageAnalysis(imageUrl: string): WorkerImageAnalysis {
  // Seed random based on image URL length + current minute for deterministic-ish demo behavior
  const seed = imageUrl.length + new Date().getMinutes();
  const pseudoRandom = Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000);
  
  // For demo: generate varied results based on the pseudo-random value
  const plasticDetected = pseudoRandom > 0.3; // 70% chance of detecting plastic
  
  let severityPercent: number;
  if (plasticDetected) {
    // If plastic detected, severity is 20-90%
    severityPercent = Math.floor(20 + (pseudoRandom * 70));
  } else {
    // No plastic = low severity (0-15%)
    severityPercent = Math.floor(pseudoRandom * 15);
  }
  
  // Map percent to severity tier
  let severity: NgoSeverity;
  if (severityPercent < 33) severity = "low";
  else if (severityPercent < 66) severity = "medium";
  else severity = "high";
  
  // Generate 1-3 bounding boxes for detected plastic
  const boxes: BoundingBox[] = [];
  if (plasticDetected) {
    const boxCount = 1 + Math.floor(pseudoRandom * 3); // 1-3 boxes
    for (let i = 0; i < boxCount; i++) {
      boxes.push({
        x: 0.1 + (pseudoRandom * 0.6) + (i * 0.1),
        y: 0.1 + (pseudoRandom * 0.5),
        w: 0.15 + (pseudoRandom * 0.2),
        h: 0.15 + (pseudoRandom * 0.2),
      });
    }
  }
  
  return { plasticDetected, severityPercent, severity, boxes };
}

export type NgoMissionStatus = "assigned" | "in_progress" | "pending_verification" | "completed" | "deferred";
export type NgoSeverity = "low" | "medium" | "high";
export type NgoMissionSource = "citizen_report" | "coastal_scan" | "government_referral";

export type NgoMission = {
  id: string;
  title: string;
  region: string;
  lat: number;
  lng: number;
  severity: NgoSeverity;
  status: NgoMissionStatus;
  priority: 1 | 2 | 3;
  assignedAt: string;
  dueBy: string;
  source: NgoMissionSource;
  plasticEstimateKg?: number;
  notes?: string;
  /** After-cleanup photo (data URL or https) — required before authority can verify and release rewards. */
  completionProofImageUrl?: string;
  completionProofSubmittedAt?: string;
  /** Worker-submitted before/after photos (data URL or https) — reviewed separately in authority. */
  workerBeforeImageUrl?: string;
  workerBeforeSubmittedAt?: string;
  workerBeforeReviewStatus?: "pending" | "approved" | "rejected";
  /** AI analysis of worker before photo */
  workerBeforePlasticDetected?: boolean;
  workerBeforeSeverityPercent?: number;
  workerBeforeSeverity?: NgoSeverity;
  workerBeforeBoxes?: BoundingBox[];
  workerAfterImageUrl?: string;
  workerAfterSubmittedAt?: string;
  workerAfterReviewStatus?: "pending" | "approved" | "rejected";
  /** AI analysis of worker after photo */
  workerAfterPlasticDetected?: boolean;
  workerAfterSeverityPercent?: number;
  workerAfterSeverity?: NgoSeverity;
  workerAfterBoxes?: BoundingBox[];
};

export type NgoAlert = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type MonthlyTrendPoint = {
  month: string;
  assigned: number;
  completed: number;
  volunteerHours: number;
};

let version = 0;
const listeners = new Set<() => void>();

export function subscribeNgo(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getNgoVersion(): number {
  return version;
}

function bump(): void {
  version += 1;
  listeners.forEach((l) => l());
}

/** Call when missions/alerts change from outside this file (e.g. citizen request accepted). */
export function notifyNgoWorkspaceChanged(): void {
  bump();
}

const STORAGE_KEY = "aquaguard_ngo_workspace_v1";

const MISSION_PROOF_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect fill="#0f766e" width="320" height="200"/><text x="160" y="104" text-anchor="middle" fill="white" font-family="system-ui" font-size="13">After cleanup proof (demo)</text></svg>`,
  );

const SEED_MISSIONS: NgoMission[] = [
  {
    id: "ngo-m-1",
    title: "Visakhapatnam harbour foam & microplastic sweep",
    region: "Visakhapatnam port belt, AP",
    lat: 17.695,
    lng: 83.298,
    severity: "high",
    status: "in_progress",
    priority: 1,
    assignedAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
    dueBy: new Date(Date.now() + 3 * 86400_000).toISOString(),
    source: "citizen_report",
    plasticEstimateKg: 48,
    notes: "Coordinate with VPT environment cell; low-tide window preferred.",
  },
  {
    id: "ngo-m-2",
    title: "Godavari estuary debris barrier",
    region: "Kakinada coast, East Godavari, AP",
    lat: 16.992,
    lng: 82.251,
    severity: "medium",
    status: "assigned",
    priority: 2,
    assignedAt: new Date(Date.now() - 86400_000).toISOString(),
    dueBy: new Date(Date.now() + 5 * 86400_000).toISOString(),
    source: "coastal_scan",
    plasticEstimateKg: 22,
  },
  {
    id: "ngo-m-3",
    title: "RK Beach promenade litter audit",
    region: "RK Beach, Visakhapatnam, AP",
    lat: 17.721,
    lng: 83.316,
    severity: "low",
    status: "completed",
    priority: 3,
    assignedAt: new Date(Date.now() - 14 * 86400_000).toISOString(),
    dueBy: new Date(Date.now() - 7 * 86400_000).toISOString(),
    source: "citizen_report",
    plasticEstimateKg: 8,
  },
  {
    id: "ngo-m-4",
    title: "Gangavaram port channel sheen follow-up",
    region: "Gangavaram port, Visakhapatnam dist., AP",
    lat: 17.618,
    lng: 83.245,
    severity: "high",
    status: "assigned",
    priority: 1,
    assignedAt: new Date(Date.now() - 3600_000).toISOString(),
    dueBy: new Date(Date.now() + 2 * 86400_000).toISOString(),
    source: "government_referral",
    notes: "Coordinate with port environmental desk — window 06:00–09:00 IST.",
  },
  {
    id: "ngo-m-5",
    title: "Kolleru lake edge plastic removal",
    region: "Kolleru lake, Eluru dist., AP",
    lat: 16.652,
    lng: 81.215,
    severity: "medium",
    status: "in_progress",
    priority: 2,
    assignedAt: new Date(Date.now() - 3 * 86400_000).toISOString(),
    dueBy: new Date(Date.now() + 7 * 86400_000).toISOString(),
    source: "coastal_scan",
    plasticEstimateKg: 28,
  },
  {
    id: "ngo-m-6",
    title: "Nagarjuna Sagar tailwater cleanup (monsoon hold)",
    region: "Nagarjuna Sagar, Nalgonda, Telangana",
    lat: 16.574,
    lng: 79.319,
    severity: "low",
    status: "deferred",
    priority: 3,
    assignedAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
    dueBy: new Date(Date.now() + 21 * 86400_000).toISOString(),
    source: "citizen_report",
    notes: "Heavy inflow — reschedule with irrigation & fisheries teams.",
  },
  {
    id: "ngo-m-7",
    title: "Hussain Sagar lake-edge litter sweep",
    region: "Necklace Road, Hyderabad, Telangana",
    lat: 17.423,
    lng: 78.474,
    severity: "medium",
    status: "assigned",
    priority: 2,
    assignedAt: new Date(Date.now() - 12 * 3600_000).toISOString(),
    dueBy: new Date(Date.now() + 6 * 86400_000).toISOString(),
    source: "citizen_report",
    plasticEstimateKg: 15,
  },
  {
    id: "ngo-m-8",
    title: "Citizen request · Tenneti Park shoreline (proof submitted)",
    region: "Tenneti Park, Visakhapatnam, AP",
    lat: 17.745,
    lng: 83.345,
    severity: "medium",
    status: "pending_verification",
    priority: 2,
    assignedAt: new Date(Date.now() - 4 * 86400_000).toISOString(),
    dueBy: new Date(Date.now() + 4 * 86400_000).toISOString(),
    source: "citizen_report",
    plasticEstimateKg: 12,
    notes: [
      "Citizen report ID: demo-tenneti-proof",
      "Authority-assigned groups: North Andhra coast unit",
      "Authority-assigned workers: w-1, w-2",
    ].join("\n"),
    completionProofImageUrl: MISSION_PROOF_PLACEHOLDER,
    completionProofSubmittedAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
  },
];

const SEED_ALERTS: NgoAlert[] = [
  {
    id: "ngo-a-1",
    title: "Gangavaram port high-priority route",
    body: "Government referral ngo-m-4 — confirm field team lead by 18:00 IST.",
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
    read: false,
  },
  {
    id: "ngo-a-2",
    title: "AP–TG coastal partners quarterly report",
    body: "Draft impact summary due for state pollution board partner sync next week.",
    createdAt: new Date(Date.now() - 86400_000).toISOString(),
    read: true,
  },
  {
    id: "ngo-a-3",
    title: "Shoreline transect photo upload",
    body: "Upload Visakhapatnam & Vijayawada transect photos to the shared partner drive by Friday.",
    createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    read: false,
  },
];

/** Platform-wide trend (demo) — Andhra Pradesh & Telangana partner network */
const BASE_TREND: MonthlyTrendPoint[] = [
  { month: "Sep", assigned: 36, completed: 29, volunteerHours: 242 },
  { month: "Oct", assigned: 42, completed: 36, volunteerHours: 268 },
  { month: "Nov", assigned: 39, completed: 34, volunteerHours: 251 },
  { month: "Dec", assigned: 48, completed: 41, volunteerHours: 302 },
  { month: "Jan", assigned: 52, completed: 45, volunteerHours: 318 },
  { month: "Feb", assigned: 56, completed: 48, volunteerHours: 336 },
];

type Workspace = {
  missions: NgoMission[];
  alerts: NgoAlert[];
  partnerPoints: number;
  partnerPointsLog: { delta: number; reason: string; at: string }[];
};

/** Shown when workspace has no partner points history yet */
const SEED_PARTNER_POINTS_LOG: Workspace["partnerPointsLog"] = [
  { delta: 55, reason: "Verified cleanup — RK Beach promenade litter audit (+55)", at: new Date(Date.now() - 86400_000 * 10).toISOString() },
  { delta: 55, reason: "Verified cleanup — Suryalanka citizen segment (+55)", at: new Date(Date.now() - 86400_000 * 7).toISOString() },
  { delta: 40, reason: "Partner bonus — Vizag/Vijayawada transect upload (+40)", at: new Date(Date.now() - 86400_000 * 5).toISOString() },
  { delta: 55, reason: "Verified cleanup — Machilipatnam harbour walk (+55)", at: new Date(Date.now() - 86400_000 * 3).toISOString() },
  { delta: 30, reason: "Field verification — Kolleru buffer zone (+30)", at: new Date(Date.now() - 86400_000 * 2).toISOString() },
];

function load(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const p = JSON.parse(raw) as Partial<Workspace>;
    if (!Array.isArray(p.missions)) throw new Error("bad");
    const log = Array.isArray(p.partnerPointsLog) ? p.partnerPointsLog : [];
    return {
      missions: p.missions,
      alerts: Array.isArray(p.alerts) ? p.alerts : SEED_ALERTS,
      partnerPoints: typeof p.partnerPoints === "number" ? p.partnerPoints : 485,
      partnerPointsLog: log.length > 0 ? log : [...SEED_PARTNER_POINTS_LOG],
    };
  } catch {
    return {
      missions: SEED_MISSIONS.map((m) => ({ ...m })),
      alerts: SEED_ALERTS.map((a) => ({ ...a })),
      partnerPoints: 485,
      partnerPointsLog: [...SEED_PARTNER_POINTS_LOG],
    };
  }
}

function save(w: Workspace): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
  bump();
}

export function getNgoMissions(): NgoMission[] {
  return [...load().missions].sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
}

/** Missions linked to a field worker’s home region (demo heuristic for the worker dashboard). */
function missionIsOpenForField(m: NgoMission): boolean {
  return m.status === "assigned" || m.status === "in_progress" || m.status === "pending_verification";
}

export function getMissionsForWorkerRegion(workerRegion: string): NgoMission[] {
  const missions = getNgoMissions();
  const norm = workerRegion.trim().toLowerCase();
  if (!norm || norm.includes("assign") || norm.includes("unassigned") || norm.includes("coordinator")) {
    return missions.filter(missionIsOpenForField).slice(0, 6);
  }
  const token = norm.split(/[\s,]+/).filter(Boolean)[0] ?? norm;
  const matched = missions.filter((m) => m.region.toLowerCase().includes(token));
  if (matched.length > 0) return matched;
  return missions.filter(missionIsOpenForField).slice(0, 5);
}

export function getNgoAlerts(): NgoAlert[] {
  return [...load().alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUnreadNgoAlertCount(): number {
  return load().alerts.filter((a) => !a.read).length;
}

export function markNgoAlertRead(id: string): void {
  const w = load();
  save({
    ...w,
    alerts: w.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
  });
}

function addNgoPartnerPoints(w: Workspace, delta: number, reason: string): Workspace {
  if (delta === 0) return w;
  const at = new Date().toISOString();
  return {
    ...w,
    partnerPoints: Math.max(0, w.partnerPoints + delta),
    partnerPointsLog: [{ delta, reason, at }, ...w.partnerPointsLog].slice(0, 80),
  };
}

export function getNgoPartnerRewards() {
  const w = load();
  return { points: w.partnerPoints, log: w.partnerPointsLog };
}

export function updateMissionStatus(id: string, status: NgoMissionStatus): void {
  const w = load();
  const prev = w.missions.find((m) => m.id === id);
  if (!prev) return;
  // Rewards release only after authority verifies photo proof (see reviewMissionCompletionProof).
  if (status === "completed" && prev.status !== "completed") {
    return;
  }
  const nextMissions = w.missions.map((m) => (m.id === id ? { ...m, status } : m));
  save({ ...w, missions: nextMissions });
}

/** NGO / field team submits after-cleanup image; moves mission to pending authority verification. */
export function submitMissionCompletionProof(id: string, imageUrl: string): { ok: boolean; reason?: string } {
  const url = imageUrl.trim();
  if (!url) return { ok: false, reason: "empty" };
  const w = load();
  const prev = w.missions.find((m) => m.id === id);
  if (!prev) return { ok: false, reason: "not_found" };
  if (prev.status !== "assigned" && prev.status !== "in_progress") {
    return { ok: false, reason: "bad_status" };
  }
  const at = new Date().toISOString();
  const nextMissions = w.missions.map((m) =>
    m.id === id
      ? {
          ...m,
          status: "pending_verification" as const,
          completionProofImageUrl: url,
          completionProofSubmittedAt: at,
        }
      : m,
  );
  save({ ...w, missions: nextMissions });
  return { ok: true };
}

/** Authority approves or rejects cleanup proof. Approve → completed + partner/worker rewards for citizen-sourced missions. */
export function reviewMissionCompletionProof(id: string, decision: "approve" | "reject"): void {
  const w = load();
  const prev = w.missions.find((m) => m.id === id);
  if (!prev || prev.status !== "pending_verification") return;
  if (!prev.completionProofImageUrl?.trim()) return;

  if (decision === "reject") {
    const nextMissions = w.missions.map((m) =>
      m.id === id
        ? {
            ...m,
            status: "in_progress" as const,
            completionProofImageUrl: undefined,
            completionProofSubmittedAt: undefined,
          }
        : m,
    );
    save({ ...w, missions: nextMissions });
    return;
  }

  const nextMissions = w.missions.map((m) => (m.id === id ? { ...m, status: "completed" as const } : m));
  let nextW: Workspace = { ...w, missions: nextMissions };
  if (prev.source === "citizen_report") {
    nextW = addNgoPartnerPoints(nextW, 55, `Verified cleanup — ${prev.title.slice(0, 60)} (+55)`);
    rewardAssignedWorkersFromMissionNotes(prev.notes, 40, "Verified cleanup mission (+40)");
  }
  save(nextW);
}

export function getMissionsAwaitingProofVerification(): NgoMission[] {
  return getNgoMissions().filter((m) => m.status === "pending_verification");
}

export function getMissionsAwaitingWorkerProofReview(): NgoMission[] {
  return getNgoMissions().filter(
    (m) =>
      m.workerBeforeReviewStatus === "pending" ||
      m.workerAfterReviewStatus === "pending",
  );
}

function allowWorkerUploadStatus(status: NgoMissionStatus): boolean {
  return status === "assigned" || status === "in_progress" || status === "pending_verification";
}

export function submitWorkerMissionProof(
  id: string,
  kind: "before" | "after",
  imageUrl: string,
): { ok: boolean; reason?: string } {
  const url = imageUrl.trim();
  if (!url) return { ok: false, reason: "empty" };
  const w = load();
  const prev = w.missions.find((m) => m.id === id);
  if (!prev) return { ok: false, reason: "not_found" };
  if (!allowWorkerUploadStatus(prev.status)) return { ok: false, reason: "bad_status" };
  const at = new Date().toISOString();
  
  // Run AI analysis on the uploaded image
  const analysis = simulateWorkerImageAnalysis(url);

  const nextMissions = w.missions.map((m) => {
    if (m.id !== id) return m;
    if (kind === "before") {
      return {
        ...m,
        workerBeforeImageUrl: url,
        workerBeforeSubmittedAt: at,
        workerBeforeReviewStatus: "pending" as const,
        workerBeforePlasticDetected: analysis.plasticDetected,
        workerBeforeSeverityPercent: analysis.severityPercent,
        workerBeforeSeverity: analysis.severity,
        workerBeforeBoxes: analysis.boxes,
      };
    }
    return {
      ...m,
      workerAfterImageUrl: url,
      workerAfterSubmittedAt: at,
      workerAfterReviewStatus: "pending" as const,
      workerAfterPlasticDetected: analysis.plasticDetected,
      workerAfterSeverityPercent: analysis.severityPercent,
      workerAfterSeverity: analysis.severity,
      workerAfterBoxes: analysis.boxes,
    };
  });

  save({ ...w, missions: nextMissions });
  return { ok: true };
}

export function reviewWorkerMissionProof(
  id: string,
  kind: "before" | "after",
  decision: "approve" | "reject",
): void {
  const w = load();
  const prev = w.missions.find((m) => m.id === id);
  if (!prev) return;

  if (kind === "before") {
    if (prev.workerBeforeReviewStatus !== "pending") return;
    if (!prev.workerBeforeImageUrl?.trim()) return;
    const nextMissions = w.missions.map((m) =>
      m.id === id
        ? { ...m, workerBeforeReviewStatus: decision === "approve" ? ("approved" as const) : ("rejected" as const) }
        : m,
    );
    save({ ...w, missions: nextMissions });
    return;
  }

  if (prev.workerAfterReviewStatus !== "pending") return;
  if (!prev.workerAfterImageUrl?.trim()) return;
  const nextMissions = w.missions.map((m) =>
    m.id === id
      ? { ...m, workerAfterReviewStatus: decision === "approve" ? ("approved" as const) : ("rejected" as const) }
      : m,
  );
  save({ ...w, missions: nextMissions });
}

/** Append a mission (e.g. created when an NGO accepts a citizen report). */
export function addNgoMission(mission: NgoMission): void {
  const w = load();
  if (w.missions.some((m) => m.id === mission.id)) return;
  save({ ...w, missions: [mission, ...w.missions] });
}

/** KPIs derived from current missions */
export function getNgoKpis() {
  const missions = load().missions;
  const active = missions.filter(
    (m) => m.status === "assigned" || m.status === "in_progress" || m.status === "pending_verification",
  ).length;
  const completed = missions.filter((m) => m.status === "completed").length;
  const highOpen = missions.filter((m) => m.severity === "high" && m.status !== "completed" && m.status !== "deferred").length;
  const plastic = missions.reduce((s, m) => s + (m.plasticEstimateKg ?? 0), 0);
  return { active, completed, highOpen, plasticEstimateTotalKg: plastic, total: missions.length };
}

/** For pie / bar charts */
export function getSeverityDistribution(): { name: string; value: number; fill: string }[] {
  const missions = load().missions;
  const counts = { low: 0, medium: 0, high: 0 };
  for (const m of missions) counts[m.severity] += 1;
  return [
    { name: "Low", value: counts.low, fill: "hsl(142 71% 45%)" },
    { name: "Medium", value: counts.medium, fill: "hsl(38 92% 50%)" },
    { name: "High", value: counts.high, fill: "hsl(0 84% 60%)" },
  ].filter((x) => x.value > 0);
}

export function getStatusDistribution(): { name: string; value: number; fill: string }[] {
  const missions = load().missions;
  const map: Record<NgoMissionStatus, number> = {
    assigned: 0,
    in_progress: 0,
    pending_verification: 0,
    completed: 0,
    deferred: 0,
  };
  for (const m of missions) map[m.status] += 1;
  return [
    { name: "Assigned", value: map.assigned, fill: "#0ea5e9" },
    { name: "In progress", value: map.in_progress, fill: "#6366f1" },
    { name: "Proof pending", value: map.pending_verification, fill: "#f59e0b" },
    { name: "Completed", value: map.completed, fill: "#22c55e" },
    { name: "Deferred", value: map.deferred, fill: "#94a3b8" },
  ].filter((x) => x.value > 0);
}

export function getResponseTrend(): MonthlyTrendPoint[] {
  return BASE_TREND.map((p) => ({ ...p }));
}

export function resetNgoWorkspaceDemo(): void {
  localStorage.removeItem(STORAGE_KEY);
  bump();
}
