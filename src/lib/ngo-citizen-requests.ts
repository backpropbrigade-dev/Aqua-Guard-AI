/**
 * Queue of citizen pollution reports for NGO triage (accept → field mission, or decline).
 * Persisted in localStorage; kept in sync with citizen-store report ngoPartnerStatus.
 */

import type { PollutionReport, Severity } from "@/lib/citizen-store";
import { patchCitizenReportByStorageKey, setReportNgoPartnerStatus } from "@/lib/citizen-store";
import { addNgoMission, notifyNgoWorkspaceChanged, type NgoMission } from "@/lib/ngo-store";

const INCOMING_KEY = "aquaguard_ngo_citizen_incoming_v1";

export type CitizenIncomingStatus = "pending" | "accepted" | "declined";

export type CitizenIncomingRequest = {
  id: string;
  reportId: string;
  locationLabel: string;
  lat: number;
  lng: number;
  severity: Severity;
  severityPercent: number;
  plasticDetected: boolean;
  imageUrl: string;
  notes?: string;
  citizenUserId: string;
  createdAt: string;
  /** AquaGuard routing: NGO lead (low/medium) vs drone lead (high). */
  platformAction: "ngo" | "drone";
  status: CitizenIncomingStatus;
  decidedAt?: string;
  /** Citizen localStorage bundle key — required to sync NGO decision back to the reporter. */
  citizenBundleKey?: string;
  /** Field workers assigned by authority — union of members from assigned groups. */
  assignedWorkerIds?: string[];
  /** Human-readable group names from authority assignment. */
  assignedWorkerGroupLabels?: string[];
};

function loadIncoming(): CitizenIncomingRequest[] {
  try {
    const raw = localStorage.getItem(INCOMING_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as CitizenIncomingRequest[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveIncoming(list: CitizenIncomingRequest[]): void {
  localStorage.setItem(INCOMING_KEY, JSON.stringify(list));
  notifyNgoWorkspaceChanged();
}

function severityRank(s: Severity): number {
  return s === "high" ? 0 : s === "medium" ? 1 : 2;
}

/** New citizen report — idempotent per reportId (after authority approval). */
export function enqueueCitizenReport(
  report: PollutionReport,
  opts?: { citizenBundleKey?: string; assignedWorkerIds?: string[]; assignedWorkerGroupLabels?: string[] },
): void {
  const list = loadIncoming();
  if (list.some((x) => x.reportId === report.id)) return;
  const row: CitizenIncomingRequest = {
    id: `cr-${report.id}`,
    reportId: report.id,
    locationLabel: report.locationLabel,
    lat: report.lat,
    lng: report.lng,
    severity: report.severity,
    severityPercent: report.severityPercent,
    plasticDetected: report.plasticDetected,
    imageUrl: report.imageUrl,
    notes: report.notes,
    citizenUserId: report.userId,
    createdAt: report.createdAt,
    platformAction: report.action === "drone" ? "drone" : "ngo",
    status: "pending",
    citizenBundleKey: opts?.citizenBundleKey,
    assignedWorkerIds: opts?.assignedWorkerIds?.length ? [...opts.assignedWorkerIds] : undefined,
    assignedWorkerGroupLabels: opts?.assignedWorkerGroupLabels?.length ? [...opts.assignedWorkerGroupLabels] : undefined,
  };
  saveIncoming([row, ...list]);
}

export function getIncomingCitizenRequests(): CitizenIncomingRequest[] {
  return [...loadIncoming()].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    const sev = severityRank(a.severity) - severityRank(b.severity);
    if (sev !== 0) return sev;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getPendingCitizenRequestCount(): number {
  return loadIncoming().filter((x) => x.status === "pending").length;
}

const DEMO_INCOMING_MARKER = "demo-incoming";

/** Synthetic NGO queue rows for first-run polish (skipped if any demo row already exists). */
export function ensureDemoIncomingCitizenRequests(placeholderImageUrl: string): void {
  const list = loadIncoming();
  if (list.some((x) => x.reportId.startsWith(DEMO_INCOMING_MARKER))) return;
  const now = Date.now();
  const demo: CitizenIncomingRequest[] = [
    {
      id: "cr-demo-incoming-a",
      reportId: `${DEMO_INCOMING_MARKER}-a`,
      locationLabel: "Rushikonda Beach, Visakhapatnam, AP",
      lat: 17.902,
      lng: 83.385,
      severity: "high",
      severityPercent: 69,
      plasticDetected: true,
      imageUrl: placeholderImageUrl,
      notes: "Synthetic queue item — high-tide microplastic line.",
      citizenUserId: "demo-citizen-queue",
      createdAt: new Date(now - 4 * 3600_000).toISOString(),
      platformAction: "drone",
      status: "pending",
    },
    {
      id: "cr-demo-incoming-b",
      reportId: `${DEMO_INCOMING_MARKER}-b`,
      locationLabel: "Bhadrachalam Godavari ghat, Bhadradri Kothagudem, TG",
      lat: 17.668,
      lng: 80.889,
      severity: "medium",
      severityPercent: 37,
      plasticDetected: true,
      imageUrl: placeholderImageUrl,
      notes: "Riverbank foam and discarded nets (demo).",
      citizenUserId: "demo-citizen-queue",
      createdAt: new Date(now - 18 * 3600_000).toISOString(),
      platformAction: "ngo",
      status: "pending",
    },
    {
      id: "cr-demo-incoming-c",
      reportId: `${DEMO_INCOMING_MARKER}-c`,
      locationLabel: "Hussain Sagar, Necklace Road, Hyderabad, TG",
      lat: 17.423,
      lng: 78.474,
      severity: "low",
      severityPercent: 19,
      plasticDetected: false,
      imageUrl: placeholderImageUrl,
      citizenUserId: "demo-citizen-queue",
      createdAt: new Date(now - 52 * 3600_000).toISOString(),
      platformAction: "ngo",
      status: "pending",
      assignedWorkerIds: ["w-1", "w-2"],
      assignedWorkerGroupLabels: ["North Andhra coast unit"],
    },
  ];
  saveIncoming([...demo, ...list]);
}

function priorityFromSeverity(s: Severity): 1 | 2 | 3 {
  if (s === "high") return 1;
  if (s === "medium") return 2;
  return 3;
}

function missionFromRequest(item: CitizenIncomingRequest): NgoMission {
  const titleBase = item.locationLabel.length > 52 ? `${item.locationLabel.slice(0, 52)}…` : item.locationLabel;
  const noteLines = [
    `Citizen report ID: ${item.reportId}`,
    item.platformAction === "drone"
      ? "Severity: high — platform drone routing active; this mission is supplementary NGO field support."
      : "Severity routing: NGO lead cleanup / verification.",
    item.assignedWorkerGroupLabels?.length
      ? `Authority-assigned groups: ${item.assignedWorkerGroupLabels.join("; ")}`
      : "",
    item.assignedWorkerIds?.length
      ? `Authority-assigned workers: ${item.assignedWorkerIds.join(", ")}`
      : "",
    item.notes ? `Citizen notes: ${item.notes}` : "",
  ].filter(Boolean);

  return {
    id: `ngo-m-from-${item.reportId}`,
    title: `Citizen request · ${titleBase}`,
    region: item.locationLabel,
    lat: item.lat,
    lng: item.lng,
    severity: item.severity,
    status: "assigned",
    priority: priorityFromSeverity(item.severity),
    assignedAt: new Date().toISOString(),
    dueBy: new Date(Date.now() + 7 * 86400_000).toISOString(),
    source: "citizen_report",
    plasticEstimateKg: Math.max(1, Math.round(item.severityPercent / 3)),
    notes: noteLines.join("\n"),
  };
}

export function acceptCitizenRequest(requestId: string): boolean {
  const list = loadIncoming();
  const idx = list.findIndex((x) => x.id === requestId && x.status === "pending");
  if (idx < 0) return false;
  const item = list[idx];
  const mission = missionFromRequest(item);
  addNgoMission(mission);
  const next = [...list];
  next[idx] = { ...item, status: "accepted", decidedAt: new Date().toISOString() };
  saveIncoming(next);
  if (item.citizenBundleKey) {
    patchCitizenReportByStorageKey(item.citizenBundleKey, item.reportId, { ngoPartnerStatus: "accepted" });
  } else {
    setReportNgoPartnerStatus(item.reportId, "accepted");
  }
  return true;
}

export function declineCitizenRequest(requestId: string): boolean {
  const list = loadIncoming();
  const idx = list.findIndex((x) => x.id === requestId && x.status === "pending");
  if (idx < 0) return false;
  const item = list[idx];
  const next = [...list];
  next[idx] = { ...item, status: "declined", decidedAt: new Date().toISOString() };
  saveIncoming(next);
  if (item.citizenBundleKey) {
    patchCitizenReportByStorageKey(item.citizenBundleKey, item.reportId, { ngoPartnerStatus: "declined" });
  } else {
    setReportNgoPartnerStatus(item.reportId, "declined");
  }
  return true;
}

/** UI helper: how NGO should interpret severity + platform routing */
export function requestSeverityGuidance(item: CitizenIncomingRequest): string {
  if (item.platformAction === "drone") {
    return "High severity — AquaGuard prioritizes drone response. Accept to add a supplementary NGO field mission (coordination / shoreline follow-up).";
  }
  if (item.severity === "high") {
    return "High — treat as urgent; suggest dispatch within 24–48h.";
  }
  if (item.severity === "medium") {
    return "Medium — standard partner window (e.g. 3–7 days).";
  }
  return "Low — schedule with routine field rotations.";
}
