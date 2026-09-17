/**
 * One-time synthetic rows for admin / NGO / authority demos (AP & Telangana).
 * Skips keys that already exist — safe alongside real logins.
 */
import { enqueueAuthorityReview } from "@/lib/authority-review-queue";
import type {
  CitizenNotification,
  CitizenProfileState,
  CitizenSettingsState,
  PollutionReport,
  SupportTicket,
  UserBundle,
} from "@/lib/citizen-store";
import { writeCitizenBundleByStorageKey } from "@/lib/citizen-store";
import { ensureDemoIncomingCitizenRequests } from "@/lib/ngo-citizen-requests";

const DEMO_IMG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80"><rect fill="#0d9488" width="120" height="80" rx="6"/><text x="60" y="44" text-anchor="middle" fill="white" font-family="system-ui" font-size="8">AquaGuard</text></svg>`,
  );

const DEMO_SETTINGS: CitizenSettingsState = {
  pushNotifications: true,
  alertTypes: { pollutionNearby: true, drone: true, cleanup: true, ngo: true },
  emailDigest: true,
  shareApproxLocation: true,
  liveLocationTracking: true,
};

function bundleKey(identifier: string): string {
  const safe = identifier.replace(/[^a-zA-Z0-9@._-]/g, "_");
  return `aquaguard_citizen_${safe}`;
}

function note(uid: string, title: string, body: string, hoursAgo: number, read: boolean): CitizenNotification {
  return {
    id: `demo-n-${uid}-${hoursAgo}`,
    type: "ngo",
    title,
    body,
    createdAt: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
    read,
  };
}

function ticket(subject: string, hoursAgo: number): SupportTicket {
  return {
    id: `demo-tix-${hoursAgo}`,
    subject,
    message: "This is a sample support thread for dashboard review.",
    createdAt: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
  };
}

function writeIfAbsent(identifier: string, bundle: UserBundle): void {
  const key = bundleKey(identifier);
  if (localStorage.getItem(key)) return;
  writeCitizenBundleByStorageKey(key, bundle);
}

export function ensurePlatformDemoData(): void {
  if (typeof localStorage === "undefined") return;

  const t = Date.now();

  const raghavReports: PollutionReport[] = [
    {
      id: "raghav-auth-pending-1",
      userId: "demo.raghav@vizag.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Gangavaram beach approach, Visakhapatnam, AP",
      lat: 17.625,
      lng: 83.248,
      createdAt: new Date(t - 6 * 3600_000).toISOString(),
      plasticDetected: true,
      severityPercent: 64,
      severity: "high",
      boxes: [{ x: 0.2, y: 0.25, w: 0.35, h: 0.28 }],
      status: "detected",
      action: "drone",
      notes: "Synthetic row — awaiting authority verification.",
      authorityStatus: "pending_review",
    },
    {
      id: "raghav-r2",
      userId: "demo.raghav@vizag.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "RK Beach, Visakhapatnam, AP",
      lat: 17.721,
      lng: 83.316,
      createdAt: new Date(t - 3 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 42,
      severity: "medium",
      boxes: [{ x: 0.3, y: 0.3, w: 0.25, h: 0.2 }],
      status: "cleaning",
      action: "ngo",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
    },
    {
      id: "raghav-r3",
      userId: "demo.raghav@vizag.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Bheemunipatnam fishing jetty, AP",
      lat: 17.888,
      lng: 83.441,
      createdAt: new Date(t - 8 * 86400_000).toISOString(),
      plasticDetected: false,
      severityPercent: 16,
      severity: "low",
      boxes: [],
      status: "cleaned",
      action: "ngo",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
    },
    {
      id: "raghav-r4",
      userId: "demo.raghav@vizag.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Yarada Beach road bend, AP",
      lat: 17.658,
      lng: 83.32,
      createdAt: new Date(t - 11 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 58,
      severity: "high",
      boxes: [{ x: 0.15, y: 0.2, w: 0.4, h: 0.35 }],
      status: "detected",
      action: "drone",
      notes: "Drone correlation requested.",
      authorityStatus: "approved",
      ngoPartnerStatus: "pending",
    },
  ];

  const raghavProfile: CitizenProfileState = {
    displayName: "Raghav Naidu",
    email: "demo.raghav@vizag.ap",
    photoDataUrl: null,
    points: 328,
    cleanupsTriggered: 2,
    reportsSubmitted: raghavReports.length,
  };

  writeIfAbsent("demo.raghav@vizag.ap", {
    reports: raghavReports,
    notifications: [
      note("raghav", "Report queued", "Your Gangavaram upload is in the authority review queue.", 5, false),
      note("raghav", "Points earned", "+24 plastic detection bonus — RK Beach report.", 70, true),
    ],
    profile: raghavProfile,
    settings: { ...DEMO_SETTINGS },
    tickets: [ticket("Map pin offset on older Android", 120)],
    pointsLog: [
      { delta: 24, reason: "Plastic detected — RK Beach", at: new Date(t - 86400_000 * 3).toISOString() },
      { delta: 50, reason: "High severity routing — Yarada segment", at: new Date(t - 86400_000 * 11).toISOString() },
      { delta: 10, reason: "Welcome bonus", at: new Date(t - 86400_000 * 14).toISOString() },
    ],
  });

  const sitaReports: PollutionReport[] = [
    {
      id: "sita-r1",
      userId: "demo.sita@hyd.tg",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Hussain Sagar, Necklace Road, Hyderabad, TG",
      lat: 17.423,
      lng: 78.474,
      createdAt: new Date(t - 2 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 31,
      severity: "medium",
      boxes: [{ x: 0.22, y: 0.32, w: 0.3, h: 0.22 }],
      status: "detected",
      action: "ngo",
      authorityStatus: "approved",
      ngoPartnerStatus: "pending",
    },
    {
      id: "sita-r2",
      userId: "demo.sita@hyd.tg",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Durgam Cheruvu bridge view, Hyderabad, TG",
      lat: 17.419,
      lng: 78.385,
      createdAt: new Date(t - 9 * 86400_000).toISOString(),
      plasticDetected: false,
      severityPercent: 12,
      severity: "low",
      boxes: [],
      status: "uploaded",
      action: null,
      authorityStatus: "approved",
      ngoPartnerStatus: "declined",
    },
  ];

  writeIfAbsent("demo.sita@hyd.tg", {
    reports: sitaReports,
    notifications: [note("sita", "NGO update", "Partner declined lake-edge case — see report detail.", 30, false)],
    profile: {
      displayName: "Sita Reddy",
      email: "demo.sita@hyd.tg",
      photoDataUrl: null,
      points: 214,
      cleanupsTriggered: 0,
      reportsSubmitted: sitaReports.length,
    },
    settings: { ...DEMO_SETTINGS },
    tickets: [],
    pointsLog: [
      { delta: 18, reason: "Valid detection — Hussain Sagar", at: new Date(t - 2 * 86400_000).toISOString() },
      { delta: 10, reason: "Report submitted — Durgam Cheruvu", at: new Date(t - 9 * 86400_000).toISOString() },
    ],
  });

  const kiranReports: PollutionReport[] = [
    {
      id: "kiran-r1",
      userId: "demo.kiran@kakinada.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Kakinada port road beach, East Godavari, AP",
      lat: 16.985,
      lng: 82.238,
      createdAt: new Date(t - 3600_000).toISOString(),
      plasticDetected: true,
      severityPercent: 77,
      severity: "high",
      boxes: [{ x: 0.18, y: 0.22, w: 0.42, h: 0.32 }],
      status: "cleaning",
      action: "drone",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
    },
    {
      id: "kiran-r2",
      userId: "demo.kiran@kakinada.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Uppada coast, Kakinada, AP",
      lat: 17.048,
      lng: 82.318,
      createdAt: new Date(t - 4 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 44,
      severity: "medium",
      boxes: [{ x: 0.28, y: 0.28, w: 0.28, h: 0.24 }],
      status: "detected",
      action: "ngo",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
    },
    {
      id: "kiran-r3",
      userId: "demo.kiran@kakinada.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Coringa mangrove approach, AP",
      lat: 16.824,
      lng: 82.345,
      createdAt: new Date(t - 7 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 29,
      severity: "medium",
      boxes: [],
      status: "cleaned",
      action: "ngo",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
    },
    {
      id: "kiran-r4",
      userId: "demo.kiran@kakinada.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Samalkota canal outfall, AP",
      lat: 17.053,
      lng: 82.172,
      createdAt: new Date(t - 12 * 86400_000).toISOString(),
      plasticDetected: false,
      severityPercent: 11,
      severity: "low",
      boxes: [],
      status: "cleaned",
      action: "ngo",
      authorityStatus: "rejected",
    },
    {
      id: "kiran-r5",
      userId: "demo.kiran@kakinada.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Pithapuram ghat road, AP",
      lat: 17.117,
      lng: 82.252,
      createdAt: new Date(t - 16 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 52,
      severity: "high",
      boxes: [{ x: 0.2, y: 0.2, w: 0.38, h: 0.3 }],
      status: "detected",
      action: "drone",
      authorityStatus: "approved",
      ngoPartnerStatus: "pending",
    },
  ];

  writeIfAbsent("demo.kiran@kakinada.ap", {
    reports: kiranReports,
    notifications: [
      note("kiran", "UAV active", "Drone sweep scheduled for port road beach.", 1, false),
      note("kiran", "Authority note", "One report was not verified — see in-app detail.", 200, true),
    ],
    profile: {
      displayName: "Kiran Babu",
      email: "demo.kiran@kakinada.ap",
      photoDataUrl: null,
      points: 445,
      cleanupsTriggered: 2,
      reportsSubmitted: kiranReports.length,
    },
    settings: { ...DEMO_SETTINGS },
    tickets: [ticket("Export CSV of my reports", 400)],
    pointsLog: [
      { delta: 50, reason: "High severity — port road beach", at: new Date(t - 3600_000).toISOString() },
      { delta: 24, reason: "Plastic detected — Uppada", at: new Date(t - 4 * 86400_000).toISOString() },
    ],
  });

  const lakshmiReports: PollutionReport[] = [
    {
      id: "lakshmi-r1",
      userId: "demo.lakshmi@vijayawada.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Krishna river bund, Vijayawada, AP",
      lat: 16.51,
      lng: 80.641,
      createdAt: new Date(t - 5 * 86400_000).toISOString(),
      plasticDetected: true,
      severityPercent: 35,
      severity: "medium",
      boxes: [{ x: 0.25, y: 0.27, w: 0.32, h: 0.26 }],
      status: "detected",
      action: "ngo",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
    },
    {
      id: "lakshmi-r2",
      userId: "demo.lakshmi@vijayawada.ap",
      imageUrl: DEMO_IMG,
      mediaType: "image",
      locationLabel: "Prakasam barrage walkway, Vijayawada, AP",
      lat: 16.506,
      lng: 80.608,
      createdAt: new Date(t - 14 * 86400_000).toISOString(),
      plasticDetected: false,
      severityPercent: 9,
      severity: "low",
      boxes: [],
      status: "cleaned",
      action: "ngo",
      authorityStatus: "approved",
      ngoPartnerStatus: "accepted",
    },
  ];

  writeIfAbsent("demo.lakshmi@vijayawada.ap", {
    reports: lakshmiReports,
    notifications: [note("lakshmi", "Cleanup verified", "Prakasam barrage segment — +25 points.", 300, true)],
    profile: {
      displayName: "Lakshmi Devi",
      email: "demo.lakshmi@vijayawada.ap",
      photoDataUrl: null,
      points: 189,
      cleanupsTriggered: 1,
      reportsSubmitted: lakshmiReports.length,
    },
    settings: { ...DEMO_SETTINGS },
    tickets: [],
    pointsLog: [{ delta: 25, reason: "Cleanup verified — Prakasam barrage", at: new Date(t - 14 * 86400_000).toISOString() }],
  });

  ensureDemoIncomingCitizenRequests(DEMO_IMG);

  const rk = bundleKey("demo.raghav@vizag.ap");
  try {
    const raw = localStorage.getItem(rk);
    if (raw) {
      const parsed = JSON.parse(raw) as { reports?: PollutionReport[] };
      const pending = parsed.reports?.find((r) => r.id === "raghav-auth-pending-1");
      if (pending) {
        enqueueAuthorityReview({
          report: pending,
          citizenBundleKey: rk,
          citizenLabel: "Raghav Naidu (demo.raghav@vizag.ap)",
        });
      }
    }
  } catch {
    /* ignore */
  }
}
