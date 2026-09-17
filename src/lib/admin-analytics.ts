/**
 * Cross-cutting analytics for Admin / Authority — aggregates citizen bundles (localStorage),
 * NGO workspace, citizen→NGO queue, and worker registry.
 */

import type { PollutionReport, Severity } from "@/lib/citizen-store";
import { getIncomingCitizenRequests } from "@/lib/ngo-citizen-requests";
import { getNgoKpis, getNgoMissions } from "@/lib/ngo-store";
import { getFieldWorkers, getWorkerStats, type FieldWorker, type WorkerRole, type WorkerStatus } from "@/lib/worker-store";

const CITIZEN_PREFIX = "aquaguard_citizen_";

type RawBundle = {
  reports?: PollutionReport[];
  profile?: { displayName?: string; points?: number; reportsSubmitted?: number };
};

export type CitizenUserSummary = {
  storageKey: string;
  displayLabel: string;
  reportsCount: number;
  points: number;
  cleanupsTriggeredApprox: number;
  bySeverity: Record<Severity, number>;
  ngoPending: number;
  ngoAccepted: number;
  ngoDeclined: number;
};

function parseBundle(key: string): CitizenUserSummary | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const b = JSON.parse(raw) as RawBundle;
    const reports = Array.isArray(b.reports) ? b.reports : [];
    const bySeverity: Record<Severity, number> = { low: 0, medium: 0, high: 0 };
    let ngoPending = 0;
    let ngoAccepted = 0;
    let ngoDeclined = 0;
    for (const r of reports) {
      bySeverity[r.severity] += 1;
      if (r.ngoPartnerStatus === "pending") ngoPending += 1;
      if (r.ngoPartnerStatus === "accepted") ngoAccepted += 1;
      if (r.ngoPartnerStatus === "declined") ngoDeclined += 1;
    }
    const profile = b.profile ?? {};
    return {
      storageKey: key,
      displayLabel: profile.displayName || key.replace(CITIZEN_PREFIX, "").replace(/_/g, "@") || "User",
      reportsCount: reports.length,
      points: typeof profile.points === "number" ? profile.points : 0,
      cleanupsTriggeredApprox: reports.filter((r) => r.status === "cleaned").length,
      bySeverity,
      ngoPending,
      ngoAccepted,
      ngoDeclined,
    };
  } catch {
    return null;
  }
}

export function scanCitizenSummaries(): CitizenUserSummary[] {
  const out: CitizenUserSummary[] = [];
  if (typeof localStorage === "undefined") return out;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(CITIZEN_PREFIX)) continue;
    const row = parseBundle(key);
    if (row) out.push(row);
  }
  return out.sort((a, b) => b.reportsCount - a.reportsCount);
}

export function getCitizenAggregate() {
  const rows = scanCitizenSummaries();
  const totalUsers = rows.length;
  let totalReports = 0;
  let totalPoints = 0;
  const severity: Record<Severity, number> = { low: 0, medium: 0, high: 0 };
  let ngoPending = 0;
  let ngoAccepted = 0;
  let ngoDeclined = 0;
  for (const r of rows) {
    totalReports += r.reportsCount;
    totalPoints += r.points;
    severity.low += r.bySeverity.low;
    severity.medium += r.bySeverity.medium;
    severity.high += r.bySeverity.high;
    ngoPending += r.ngoPending;
    ngoAccepted += r.ngoAccepted;
    ngoDeclined += r.ngoDeclined;
  }
  return {
    totalUsers,
    totalReports,
    totalPoints,
    severity,
    ngoPartner: { pending: ngoPending, accepted: ngoAccepted, declined: ngoDeclined },
    users: rows,
  };
}

export function getNgoAdminSnapshot() {
  const missions = getNgoMissions();
  const kpis = getNgoKpis();
  const incoming = getIncomingCitizenRequests();
  return {
    missions,
    kpis,
    incomingTotal: incoming.length,
    incomingPending: incoming.filter((x) => x.status === "pending").length,
    incomingAccepted: incoming.filter((x) => x.status === "accepted").length,
    incomingDeclined: incoming.filter((x) => x.status === "declined").length,
  };
}

export function getWorkersAdminSnapshot() {
  return {
    workers: getFieldWorkers(),
    stats: getWorkerStats(),
  };
}

/** Single object for overview charts */
export function getAdminPlatformOverview() {
  const citizen = getCitizenAggregate();
  const ngo = getNgoAdminSnapshot();
  const workers = getWorkersAdminSnapshot();
  return { citizen, ngo, workers };
}

export type { FieldWorker, WorkerRole, WorkerStatus };
