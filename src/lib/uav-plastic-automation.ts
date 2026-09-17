/**
 * Authority console: UAV fleet state + auto-dispatch when plastic severity crosses threshold.
 * Reads all citizen bundles from localStorage (same pattern as admin analytics).
 */
import type { PollutionReport } from "@/lib/citizen-store";
import { distanceKm } from "@/lib/geo";
import {
  plasticPollutionSeverityScore,
  shouldDispatchUavForReport,
  UAV_PLASTIC_WATER_ALERT_MIN_PERCENT,
  UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT,
} from "@/lib/plastic-uav-algorithm";

const CITIZEN_PREFIX = "aquaguard_citizen_";
const FLEET_KEY = "aquaguard_uav_fleet_v1";
const DISPATCH_KEY = "aquaguard_uav_plastic_dispatch_v1";

export type UavStatus = "idle" | "en_route" | "on_station" | "returning";

export type UavVehicle = {
  id: string;
  name: string;
  homeLat: number;
  homeLng: number;
  status: UavStatus;
  currentReportId: string | null;
};

export type UavDispatchPhase = "routing" | "on_station" | "completed";

export type UavDispatchTrigger = "citizen_sync" | "satellite_interval";

export type UavDispatchRecord = {
  id: string;
  reportId: string;
  sourceUserKey: string;
  lat: number;
  lng: number;
  locationLabel: string;
  severityPercent: number;
  triggeredAt: string;
  uavId: string;
  uavName: string;
  phase: UavDispatchPhase;
  distanceKmFromHomeApprox: number;
  /** How this dispatch was triggered (legacy rows may omit). */
  dispatchSource?: UavDispatchTrigger;
};

const SEED_FLEET: UavVehicle[] = [
  { id: "uav-1", name: "Godavari Eye I (Vizag)", homeLat: 17.74, homeLng: 83.32, status: "idle", currentReportId: null },
  { id: "uav-2", name: "Godavari Eye II (Kakinada)", homeLat: 16.99, homeLng: 82.25, status: "idle", currentReportId: null },
  { id: "uav-3", name: "Krishna Drishti (Vijayawada)", homeLat: 16.51, homeLng: 80.65, status: "idle", currentReportId: null },
  { id: "uav-4", name: "Telangana Lake Patrol (Hyderabad)", homeLat: 17.42, homeLng: 78.47, status: "idle", currentReportId: null },
];

let version = 0;
const listeners = new Set<() => void>();

export function subscribeUavPlasticAutomation(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getUavPlasticAutomationVersion(): number {
  return version;
}

function bump(): void {
  version += 1;
  listeners.forEach((l) => l());
}

function loadFleet(): UavVehicle[] {
  try {
    const raw = localStorage.getItem(FLEET_KEY);
    if (!raw) throw new Error("empty");
    const arr = JSON.parse(raw) as UavVehicle[];
    return Array.isArray(arr) && arr.length > 0 ? arr : SEED_FLEET.map((u) => ({ ...u }));
  } catch {
    return SEED_FLEET.map((u) => ({ ...u }));
  }
}

function saveFleet(list: UavVehicle[]): void {
  localStorage.setItem(FLEET_KEY, JSON.stringify(list));
  bump();
}

function loadDispatch(): UavDispatchRecord[] {
  try {
    const raw = localStorage.getItem(DISPATCH_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as UavDispatchRecord[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveDispatch(list: UavDispatchRecord[]): void {
  localStorage.setItem(DISPATCH_KEY, JSON.stringify(list));
  bump();
}

export function scanAllStoredPollutionReports(): { report: PollutionReport; storageKey: string }[] {
  const out: { report: PollutionReport; storageKey: string }[] = [];
  if (typeof localStorage === "undefined") return out;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(CITIZEN_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const b = JSON.parse(raw) as { reports?: PollutionReport[] };
      const reports = Array.isArray(b.reports) ? b.reports : [];
      for (const r of reports) {
        if (r?.id && typeof r.lat === "number" && typeof r.lng === "number") {
          out.push({ report: r, storageKey: key });
        }
      }
    } catch {
      /* skip bundle */
    }
  }
  return out;
}

function pickBestIdleUav(fleet: UavVehicle[], lat: number, lng: number): UavVehicle | null {
  const idle = fleet.filter((u) => u.status === "idle");
  if (idle.length === 0) return null;
  return idle.reduce((best, u) => {
    const d = distanceKm(u.homeLat, u.homeLng, lat, lng);
    const db = distanceKm(best.homeLat, best.homeLng, lat, lng);
    return d < db ? u : best;
  });
}

export type RunPlasticUavAutoDispatchScanOptions = {
  dispatchSource?: UavDispatchTrigger;
};

/** Run policy: assign nearest idle UAV to reports that need aerial verification (authority queue, plastic-in-water alert, or high severity). */
export function runPlasticUavAutoDispatchScan(options?: RunPlasticUavAutoDispatchScanOptions): {
  assigned: number;
  skippedNoUav: number;
  reportIdsAssigned: string[];
} {
  const dispatchSource: UavDispatchTrigger = options?.dispatchSource ?? "citizen_sync";
  const fleet = loadFleet();
  const log = loadDispatch();
  const dispatchedReportIds = new Set(log.map((d) => d.reportId));
  const rows = scanAllStoredPollutionReports();

  let assigned = 0;
  let skippedNoUav = 0;
  const reportIdsAssigned: string[] = [];

  const candidates = rows.filter(
    ({ report }) => shouldDispatchUavForReport(report) && !dispatchedReportIds.has(report.id),
  );

  for (const { report, storageKey } of candidates) {
    const uav = pickBestIdleUav(fleet, report.lat, report.lng);
    if (!uav) {
      skippedNoUav += 1;
      continue;
    }

    const score = plasticPollutionSeverityScore(report);
    const distanceKmFromHomeApprox = distanceKm(uav.homeLat, uav.homeLng, report.lat, report.lng);

    const record: UavDispatchRecord = {
      id: `uav-disp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${report.id.slice(0, 8)}`,
      reportId: report.id,
      sourceUserKey: storageKey,
      lat: report.lat,
      lng: report.lng,
      locationLabel: report.locationLabel,
      severityPercent: score,
      triggeredAt: new Date().toISOString(),
      uavId: uav.id,
      uavName: uav.name,
      phase: "routing",
      distanceKmFromHomeApprox,
      dispatchSource,
    };

    log.unshift(record);
    dispatchedReportIds.add(report.id);

    uav.status = "en_route";
    uav.currentReportId = report.id;
    assigned += 1;
    reportIdsAssigned.push(report.id);
  }

  saveFleet(fleet);
  saveDispatch(log);
  return { assigned, skippedNoUav, reportIdsAssigned };
}

export function markUavArrivedOnStation(dispatchId: string): void {
  const log = loadDispatch();
  const fleet = loadFleet();
  const d = log.find((x) => x.id === dispatchId);
  if (!d || d.phase !== "routing") return;
  d.phase = "on_station";
  const uav = fleet.find((u) => u.id === d.uavId);
  if (uav) uav.status = "on_station";
  saveFleet(fleet);
  saveDispatch(log);
}

export function completePlasticUavDispatch(dispatchId: string): void {
  const log = loadDispatch();
  const fleet = loadFleet();
  const d = log.find((x) => x.id === dispatchId);
  if (!d || d.phase === "completed") return;
  d.phase = "completed";
  const uav = fleet.find((u) => u.id === d.uavId);
  if (uav) {
    uav.status = "idle";
    uav.currentReportId = null;
  }
  saveFleet(fleet);
  saveDispatch(log);
}

export function recallUavToBase(uavId: string): void {
  const fleet = loadFleet();
  const log = loadDispatch();
  const uav = fleet.find((u) => u.id === uavId);
  if (!uav) return;
  uav.status = "idle";
  uav.currentReportId = null;
  for (const d of log) {
    if (d.uavId === uavId && d.phase !== "completed") {
      d.phase = "completed";
    }
  }
  saveFleet(fleet);
  saveDispatch(log);
}

export function getUavPlasticAutomationSnapshot() {
  const fleet = loadFleet();
  const dispatchLog = loadDispatch();
  const rows = scanAllStoredPollutionReports();
  const dispatchedIds = new Set(dispatchLog.map((d) => d.reportId));

  const needsUav = rows.filter(({ report }) => shouldDispatchUavForReport(report));
  const pendingAssignment = needsUav.filter(({ report }) => !dispatchedIds.has(report.id));

  return {
    thresholdPercent: UAV_SEVERITY_AUTO_DISPATCH_THRESHOLD_PERCENT,
    plasticWaterAlertMinPercent: UAV_PLASTIC_WATER_ALERT_MIN_PERCENT,
    fleet,
    dispatchLog,
    overThresholdCount: needsUav.length,
    pendingAssignmentCount: pendingAssignment.length,
    idleUavCount: fleet.filter((u) => u.status === "idle").length,
  };
}

export function resetUavPlasticAutomationDemo(): void {
  localStorage.removeItem(FLEET_KEY);
  localStorage.removeItem(DISPATCH_KEY);
  localStorage.removeItem("aquaguard_uav_satellite_scan_last_at");
  localStorage.removeItem("aquaguard_uav_satellite_pass_log_v1");
  bump();
}
