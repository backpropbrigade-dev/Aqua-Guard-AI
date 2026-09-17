/**
 * Every 2 hours, re-run UAV assignment against stored citizen reports as if new satellite imagery
 * had been ingested (demo: same policy as manual scan; timestamps persisted in localStorage).
 */
import { runPlasticUavAutoDispatchScan } from "@/lib/uav-plastic-automation";

export const SATELLITE_UAV_SCAN_INTERVAL_MS = 2 * 60 * 60 * 1000;

const LAST_SCAN_AT_KEY = "aquaguard_uav_satellite_scan_last_at";
const PASS_LOG_KEY = "aquaguard_uav_satellite_pass_log_v1";

export type SatellitePassLogEntry = {
  at: string;
  assigned: number;
  skippedNoUav: number;
};

function readLastScanAt(): number | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(LAST_SCAN_AT_KEY);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function writeLastScanAt(ts: number): void {
  localStorage.setItem(LAST_SCAN_AT_KEY, String(ts));
}

function readPassLog(): SatellitePassLogEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(PASS_LOG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SatellitePassLogEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function appendPassLog(entry: SatellitePassLogEntry): void {
  const next = [entry, ...readPassLog()].slice(0, 40);
  localStorage.setItem(PASS_LOG_KEY, JSON.stringify(next));
}

export function getSatelliteUavSchedulerStatus(): {
  intervalHours: number;
  lastScanAt: string | null;
  nextScanAt: string | null;
  recentPasses: SatellitePassLogEntry[];
} {
  const lastMs = readLastScanAt();
  const intervalHours = SATELLITE_UAV_SCAN_INTERVAL_MS / 3600_000;
  const lastScanAt = lastMs != null ? new Date(lastMs).toISOString() : null;
  const nextMs = lastMs == null ? null : lastMs + SATELLITE_UAV_SCAN_INTERVAL_MS;
  const nextScanAt = nextMs != null ? new Date(nextMs).toISOString() : null;
  return {
    intervalHours,
    lastScanAt,
    nextScanAt,
    recentPasses: readPassLog(),
  };
}

/**
 * If the 2h window has elapsed since the last satellite ingest simulation, run UAV dispatch scan.
 * @returns whether a scan actually executed this call
 */
export function runSatelliteUavScanIfDue(_reason: "startup" | "interval" | "visibility"): {
  ran: boolean;
  assigned: number;
  skippedNoUav: number;
} {
  if (typeof localStorage === "undefined") {
    return { ran: false, assigned: 0, skippedNoUav: 0 };
  }
  const now = Date.now();
  const last = readLastScanAt();
  if (last != null && now - last < SATELLITE_UAV_SCAN_INTERVAL_MS) {
    return { ran: false, assigned: 0, skippedNoUav: 0 };
  }

  const res = runPlasticUavAutoDispatchScan({ dispatchSource: "satellite_interval" });
  writeLastScanAt(now);
  appendPassLog({
    at: new Date().toISOString(),
    assigned: res.assigned,
    skippedNoUav: res.skippedNoUav,
  });
  return { ran: true, assigned: res.assigned, skippedNoUav: res.skippedNoUav };
}

/**
 * Start 2h interval + run overdue scan on mount; re-check when tab becomes visible after idle.
 */
export function startUavSatelliteAutoScheduler(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  void runSatelliteUavScanIfDue("startup");

  const intervalId = window.setInterval(() => {
    void runSatelliteUavScanIfDue("interval");
  }, SATELLITE_UAV_SCAN_INTERVAL_MS);

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void runSatelliteUavScanIfDue("visibility");
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
