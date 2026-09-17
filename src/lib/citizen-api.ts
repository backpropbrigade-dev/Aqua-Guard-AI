/**
 * HTTP shim: set VITE_CITIZEN_API_URL to proxy to a real backend; otherwise local store is used.
 */
import type {
  CitizenProfileState,
  CitizenSettingsState,
  DashboardData,
  FaqItem,
  Hotspot,
  PollutionReport,
  RewardsData,
  SupportTicket,
  UploadReportResult,
} from "@/lib/citizen-store";
import * as local from "@/lib/citizen-store";
import { loadHotspotsForMap, type MapHotspotFilters } from "@/lib/hotspots-service";
import { getSession } from "@/lib/session";

const BASE = (import.meta.env.VITE_CITIZEN_API_URL as string | undefined)?.replace(/\/$/, "");

function userHeaders(jsonBody: boolean): HeadersInit {
  const id = getSession()?.identifier;
  const h: Record<string, string> = {};
  if (id) h["X-Aquaguard-User"] = id;
  if (jsonBody) h["Content-Type"] = "application/json";
  return h;
}

async function remote<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!BASE) return null;
  try {
    const r = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...userHeaders(true), ...init?.headers },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function apiGetDashboardData(): Promise<DashboardData> {
  return (await remote<DashboardData>("/dashboard-data")) ?? local.getDashboardData();
}

export async function apiGetHotspots(): Promise<Hotspot[]> {
  return (await remote<Hotspot[]>("/hotspots")) ?? local.getHotspots();
}

/** GET /hotspots with query params (latitude, longitude, severity, status, source) — merges remote + local fallback via loadHotspotsForMap */
export async function apiGetHotspotsQuery(filters: MapHotspotFilters): Promise<Hotspot[]> {
  return loadHotspotsForMap(filters);
}

export async function apiGetMyReports(): Promise<PollutionReport[]> {
  return (await remote<PollutionReport[]>("/reports/my")) ?? local.getMyReports();
}

export async function apiGetProfile(): Promise<CitizenProfileState> {
  return (await remote<CitizenProfileState>("/profile")) ?? local.getProfile();
}

export async function apiPutProfile(body: Partial<CitizenProfileState>): Promise<void> {
  const ok = await remote<{ ok?: boolean }>("/profile/update", { method: "PUT", body: JSON.stringify(body) });
  if (!ok) local.updateProfile(body);
}

export async function apiGetSettings(): Promise<CitizenSettingsState> {
  return (await remote<CitizenSettingsState>("/settings")) ?? local.getSettings();
}

export async function apiPutSettings(body: Partial<CitizenSettingsState>): Promise<void> {
  const res = await remote<{ ok?: boolean }>("/settings", { method: "PUT", body: JSON.stringify(body) });
  if (!res) local.updateSettings(body);
}

export async function apiGetRewards(): Promise<RewardsData> {
  return (await remote<RewardsData>("/rewards")) ?? local.getRewards();
}

export async function apiGetFaq(): Promise<FaqItem[]> {
  return (await remote<FaqItem[]>("/faq")) ?? local.getFaq();
}

export async function apiPostSupportTicket(subject: string, message: string): Promise<SupportTicket> {
  const t = await remote<SupportTicket>("/support/ticket", {
    method: "POST",
    body: JSON.stringify({ subject, message }),
  });
  return t ?? local.submitSupportTicket(subject, message);
}

export async function apiUploadReport(
  form: FormData,
): Promise<UploadReportResult> {
  if (!BASE) {
    throw new Error("Use local uploadReport() when VITE_CITIZEN_API_URL is unset");
  }
  const r = await fetch(`${BASE}/reports/upload`, {
    method: "POST",
    body: form,
    credentials: "include",
    headers: userHeaders(false),
  });
  if (!r.ok) throw new Error("Upload failed");
  return r.json();
}
