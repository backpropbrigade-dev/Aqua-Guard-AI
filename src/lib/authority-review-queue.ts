/**
 * Authority verification queue: citizen reports appear here first; after approval they enter the NGO incoming queue.
 */
import type { PollutionReport, Severity } from "@/lib/citizen-store";
import {
  addPointsToCitizenBundle,
  patchCitizenReportByStorageKey,
  pushNotificationToCitizenBundle,
  readCitizenBundleByStorageKey,
} from "@/lib/citizen-store";
import { enqueueCitizenReport } from "@/lib/ngo-citizen-requests";
import { expandWorkerIdsFromGroupIds, workerGroupLabelsForIds } from "@/lib/worker-store";

const STORAGE_KEY = "aquaguard_authority_review_v1";

export type AuthorityReviewStatus = "pending" | "approved" | "rejected";

export type AuthorityReviewItem = {
  id: string;
  reportId: string;
  citizenBundleKey: string;
  citizenLabel: string;
  locationLabel: string;
  lat: number;
  lng: number;
  severity: Severity;
  severityPercent: number;
  plasticDetected: boolean;
  imageUrl: string;
  notes?: string;
  createdAt: string;
  status: AuthorityReviewStatus;
  decidedAt?: string;
  /** Worker groups selected by authority (resolved into assignedWorkerIds). */
  assignedWorkerGroupIds: string[];
  /** Denormalized union of all workers in selected groups — used for NGO notes & rewards. */
  assignedWorkerIds: string[];
};

let version = 0;
const listeners = new Set<() => void>();

export function subscribeAuthorityReview(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getAuthorityReviewVersion(): number {
  return version;
}

function bump(): void {
  version += 1;
  listeners.forEach((l) => l());
}

function normalizeReviewRow(raw: unknown): AuthorityReviewItem | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  if (typeof x.id !== "string" || typeof x.reportId !== "string") return null;
  const workerIds = Array.isArray(x.assignedWorkerIds)
    ? (x.assignedWorkerIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];
  const groupIds = Array.isArray(x.assignedWorkerGroupIds)
    ? (x.assignedWorkerGroupIds as unknown[]).filter((id): id is string => typeof id === "string")
    : [];
  return { ...(x as unknown as AuthorityReviewItem), assignedWorkerIds: workerIds, assignedWorkerGroupIds: groupIds };
}

function load(): AuthorityReviewItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown[];
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeReviewRow).filter((r): r is AuthorityReviewItem => r !== null);
  } catch {
    return [];
  }
}

function save(list: AuthorityReviewItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  bump();
}

export function enqueueAuthorityReview(input: {
  report: PollutionReport;
  citizenBundleKey: string;
  citizenLabel: string;
}): void {
  const list = load();
  if (list.some((x) => x.reportId === input.report.id)) return;
  const row: AuthorityReviewItem = {
    id: `ar-${input.report.id}`,
    reportId: input.report.id,
    citizenBundleKey: input.citizenBundleKey,
    citizenLabel: input.citizenLabel,
    locationLabel: input.report.locationLabel,
    lat: input.report.lat,
    lng: input.report.lng,
    severity: input.report.severity,
    severityPercent: input.report.severityPercent,
    plasticDetected: input.report.plasticDetected,
    imageUrl: input.report.imageUrl,
    notes: input.report.notes,
    createdAt: input.report.createdAt,
    status: "pending",
    assignedWorkerGroupIds: [],
    assignedWorkerIds: [],
  };
  save([row, ...list]);
}

export function getAuthorityReviewItems(): AuthorityReviewItem[] {
  return [...load()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getPendingAuthorityReviewCount(): number {
  return load().filter((x) => x.status === "pending").length;
}

/**
 * Persist selected worker groups before approve. Resolves to assignedWorkerIds for the NGO pipeline.
 */
export function setAuthorityReviewGroupAssignment(reviewId: string, groupIds: string[]): boolean {
  const list = load();
  const idx = list.findIndex((x) => x.id === reviewId && x.status === "pending");
  if (idx < 0) return false;
  const uniqueGroups = [...new Set(groupIds)];
  const workerIds = expandWorkerIdsFromGroupIds(uniqueGroups);
  const next = [...list];
  next[idx] = {
    ...next[idx],
    assignedWorkerGroupIds: uniqueGroups,
    assignedWorkerIds: workerIds,
  };
  save(next);
  return true;
}

export function approveAuthorityReview(reviewId: string): boolean {
  const list = load();
  const idx = list.findIndex((x) => x.id === reviewId && x.status === "pending");
  if (idx < 0) return false;
  const item = list[idx];
  patchCitizenReportByStorageKey(item.citizenBundleKey, item.reportId, { authorityStatus: "approved" });
  addPointsToCitizenBundle(item.citizenBundleKey, 8, "Authority verified your report (+8)");
  pushNotificationToCitizenBundle(item.citizenBundleKey, {
    type: "ngo",
    title: "Report approved",
    body: `Authority verified your report for ${item.locationLabel}. Partner NGOs can now respond.`,
  });

  const bundle = readCitizenBundleByStorageKey(item.citizenBundleKey);
  const report = bundle?.reports.find((r) => r.id === item.reportId);
  if (report) {
    enqueueCitizenReport(report, {
      citizenBundleKey: item.citizenBundleKey,
      assignedWorkerIds: item.assignedWorkerIds.length ? item.assignedWorkerIds : undefined,
      assignedWorkerGroupLabels:
        item.assignedWorkerGroupIds.length > 0
          ? workerGroupLabelsForIds(item.assignedWorkerGroupIds)
          : undefined,
    });
  }

  const next = [...list];
  next[idx] = { ...item, status: "approved", decidedAt: new Date().toISOString() };
  save(next);
  return true;
}

export function rejectAuthorityReview(reviewId: string): boolean {
  const list = load();
  const idx = list.findIndex((x) => x.id === reviewId && x.status === "pending");
  if (idx < 0) return false;
  const item = list[idx];
  patchCitizenReportByStorageKey(item.citizenBundleKey, item.reportId, { authorityStatus: "rejected" });
  pushNotificationToCitizenBundle(item.citizenBundleKey, {
    type: "ngo",
    title: "Report not verified",
    body: `Your report for ${item.locationLabel} was not approved for partner routing. Contact support if you believe this is an error.`,
  });
  const next = [...list];
  next[idx] = { ...item, status: "rejected", decidedAt: new Date().toISOString() };
  save(next);
  return true;
}
