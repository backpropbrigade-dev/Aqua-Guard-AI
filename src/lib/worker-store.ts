/**
 * Field & platform workers (cleanup crews, drone ops, inspectors) — demo registry for admin analytics.
 */

export type WorkerRole = "cleanup_crew" | "drone_operator" | "coastal_inspector";
export type WorkerStatus = "available" | "on_assignment" | "off_duty" | "training";

export type FieldWorker = {
  id: string;
  name: string;
  /** Optional login email — matches session identifier for the worker dashboard */
  email?: string;
  workerRole: WorkerRole;
  status: WorkerStatus;
  region: string;
  certifications: string[];
  missionsCompleted: number;
  hoursThisMonth: number;
  lastActiveAt: string;
  /** Reward points from completed cleanups (authority / NGO flow). */
  rewardPoints?: number;
};

const STORAGE_KEY = "aquaguard_workers_registry_v1";
const GROUPS_STORAGE_KEY = "aquaguard_worker_groups_v1";

/** Named crews authority assigns to a case; each group maps to one or more field workers. */
export type WorkerGroup = {
  id: string;
  name: string;
  description?: string;
  workerIds: string[];
};

const GROUPS_SEED: WorkerGroup[] = [
  {
    id: "wg-north-ap-coast",
    name: "North Andhra coast unit",
    description: "Visakhapatnam–Bheemunipatnam shore + UAV support",
    workerIds: ["w-1", "w-2"],
  },
  {
    id: "wg-ap-tg-uav",
    name: "AP–TG aerial recon cell",
    description: "Drone verification — Bay of Bengal coast & TG reservoirs",
    workerIds: ["w-2", "w-5"],
  },
  {
    id: "wg-godavari-krishna",
    name: "Godavari–Krishna shore pool",
    description: "Kakinada, Bapatla & delta waterways",
    workerIds: ["w-3", "w-4"],
  },
  {
    id: "wg-ap-tg-joint",
    name: "AP–TG joint ops",
    description: "Cross-district dispatch for major incidents",
    workerIds: ["w-2", "w-3", "w-4", "w-6"],
  },
  {
    id: "wg-tg-inland",
    name: "Telangana inland waters",
    description: "Hyderabad lakes & reservoir patrols",
    workerIds: ["w-5", "w-7"],
  },
];

function loadGroups(): WorkerGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const arr = JSON.parse(raw) as WorkerGroup[];
    return Array.isArray(arr) ? arr : GROUPS_SEED.map((g) => ({ ...g, workerIds: [...g.workerIds] }));
  } catch {
    return GROUPS_SEED.map((g) => ({ ...g, workerIds: [...g.workerIds] }));
  }
}

function saveGroups(list: WorkerGroup[]): void {
  localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(list));
}

/** Registry of worker groups (authority assigns groups; workers are derived). */
export function getWorkerGroups(): WorkerGroup[] {
  return [...loadGroups()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getWorkerGroupById(id: string): WorkerGroup | undefined {
  return loadGroups().find((g) => g.id === id);
}

/** Unique worker IDs from one or more groups (order preserved by group, then first-seen). */
export function expandWorkerIdsFromGroupIds(groupIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const gid of groupIds) {
    const g = loadGroups().find((x) => x.id === gid);
    if (!g) continue;
    for (const wid of g.workerIds) {
      if (!seen.has(wid)) {
        seen.add(wid);
        out.push(wid);
      }
    }
  }
  return out;
}

export function workerGroupLabelsForIds(groupIds: string[]): string[] {
  return groupIds.map((id) => loadGroups().find((g) => g.id === id)?.name).filter(Boolean) as string[];
}

const SEED: FieldWorker[] = [
  {
    id: "w-1",
    name: "Ananya Sharma",
    email: "ananya.sharma@aquaguard.in",
    workerRole: "cleanup_crew",
    status: "on_assignment",
    region: "RK Beach, Visakhapatnam, AP",
    certifications: ["AP coastal cleanup safety L2", "Plastic waste handling"],
    missionsCompleted: 52,
    hoursThisMonth: 68,
    lastActiveAt: new Date(Date.now() - 3600_000).toISOString(),
    rewardPoints: 1280,
  },
  {
    id: "w-2",
    name: "Vikram Desai",
    email: "vikram.desai@aquaguard.in",
    workerRole: "drone_operator",
    status: "available",
    region: "Bheemunipatnam, Visakhapatnam dist., AP",
    certifications: ["DGCA small-class RPA", "Maritime BVLOS"],
    missionsCompleted: 118,
    hoursThisMonth: 42,
    lastActiveAt: new Date(Date.now() - 120_000).toISOString(),
    rewardPoints: 2105,
  },
  {
    id: "w-3",
    name: "Priya Nair",
    email: "priya.nair@aquaguard.in",
    workerRole: "coastal_inspector",
    status: "on_assignment",
    region: "Kakinada Beach, East Godavari, AP",
    certifications: ["APPCB water sampling", "NGO coastal liaison"],
    missionsCompleted: 79,
    hoursThisMonth: 51,
    lastActiveAt: new Date(Date.now() - 7200_000).toISOString(),
    rewardPoints: 1640,
  },
  {
    id: "w-4",
    name: "Rahul Iyer",
    email: "rahul.iyer@aquaguard.in",
    workerRole: "cleanup_crew",
    status: "off_duty",
    region: "Suryalanka Beach, Bapatla, AP",
    certifications: ["AP shore safety L1", "First aid"],
    missionsCompleted: 31,
    hoursThisMonth: 22,
    lastActiveAt: new Date(Date.now() - 86400_000 * 2).toISOString(),
    rewardPoints: 620,
  },
  {
    id: "w-5",
    name: "Kavita Rao",
    email: "kavita.rao@aquaguard.in",
    workerRole: "drone_operator",
    status: "training",
    region: "Hussain Sagar, Hyderabad, TG",
    certifications: ["Simulator phase-2", "Urban lake UAV patrol"],
    missionsCompleted: 14,
    hoursThisMonth: 28,
    lastActiveAt: new Date(Date.now() - 86400_000).toISOString(),
    rewardPoints: 340,
  },
  {
    id: "w-6",
    name: "Arjun Reddy",
    email: "arjun.reddy@aquaguard.in",
    workerRole: "coastal_inspector",
    status: "available",
    region: "Machilipatnam coast, Krishna dist., AP",
    certifications: ["AP maritime survey inspector", "GIS shoreline"],
    missionsCompleted: 64,
    hoursThisMonth: 36,
    lastActiveAt: new Date(Date.now() - 1800_000).toISOString(),
    rewardPoints: 1525,
  },
  {
    id: "w-7",
    name: "Meera Krishnan",
    email: "meera.krishnan@aquaguard.in",
    workerRole: "cleanup_crew",
    status: "on_assignment",
    region: "Osman Sagar (Gandipet), Hyderabad, TG",
    certifications: ["Reservoir bank safety", "Community volunteer lead"],
    missionsCompleted: 41,
    hoursThisMonth: 55,
    lastActiveAt: new Date(Date.now() - 4500_000).toISOString(),
    rewardPoints: 890,
  },
];

let version = 0;
const listeners = new Set<() => void>();

export function subscribeWorkers(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getWorkerVersion(): number {
  return version;
}

function bump(): void {
  version += 1;
  listeners.forEach((l) => l());
}

function load(): FieldWorker[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const arr = JSON.parse(raw) as FieldWorker[];
    return Array.isArray(arr) ? arr : SEED.map((w) => ({ ...w }));
  } catch {
    return SEED.map((w) => ({ ...w }));
  }
}

function save(list: FieldWorker[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  bump();
}

export function getFieldWorkers(): FieldWorker[] {
  return [...load()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getWorkerStats() {
  const workers = load();
  const byStatus: Record<WorkerStatus, number> = {
    available: 0,
    on_assignment: 0,
    off_duty: 0,
    training: 0,
  };
  const byRole: Record<WorkerRole, number> = {
    cleanup_crew: 0,
    drone_operator: 0,
    coastal_inspector: 0,
  };
  let missions = 0;
  let hours = 0;
  for (const w of workers) {
    byStatus[w.status] += 1;
    byRole[w.workerRole] += 1;
    missions += w.missionsCompleted;
    hours += w.hoursThisMonth;
  }
  return {
    total: workers.length,
    byStatus,
    byRole,
    totalMissionsCompleted: missions,
    totalHoursThisMonth: hours,
  };
}

export function updateWorkerStatus(id: string, status: WorkerStatus): void {
  const list = load();
  save(list.map((w) => (w.id === id ? { ...w, status, lastActiveAt: new Date().toISOString() } : w)));
}

export function addWorkerRewardPoints(workerId: string, delta: number, _reason: string): void {
  if (delta === 0) return;
  const list = load();
  save(
    list.map((w) =>
      w.id === workerId ? { ...w, rewardPoints: Math.max(0, (w.rewardPoints ?? 0) + delta), lastActiveAt: new Date().toISOString() } : w,
    ),
  );
}

/** Parse mission notes line `Authority-assigned workers: id1, id2` */
export function rewardAssignedWorkersFromMissionNotes(notes: string | undefined, pointsEach: number, reason: string): void {
  if (!notes || pointsEach <= 0) return;
  const line = notes.split("\n").find((l) => l.startsWith("Authority-assigned workers:"));
  if (!line) return;
  const part = line.replace("Authority-assigned workers:", "").trim();
  if (!part) return;
  for (const id of part.split(",").map((s) => s.trim()).filter(Boolean)) {
    addWorkerRewardPoints(id, pointsEach, reason);
  }
}

const WORKER_SELF_SESSION_ID = "local-worker-session";

/** Match login identifier to a row in the field registry (email, full name, or first name). */
export function resolveWorkerFromLogin(identifier: string): FieldWorker | null {
  const q = identifier.trim().toLowerCase();
  if (!q) return null;
  for (const w of load()) {
    if (w.email && w.email.toLowerCase() === q) return { ...w };
    if (w.name.toLowerCase() === q) return { ...w };
    const first = w.name.split(/\s+/)[0]?.toLowerCase() ?? "";
    if (first && q === first) return { ...w };
  }
  return null;
}

/** Profile shown in the worker app — uses registry row when matched, otherwise a local demo shell. */
export function getWorkerSelfView(identifier: string): { profile: FieldWorker; matchedRegistry: boolean } {
  const resolved = resolveWorkerFromLogin(identifier);
  if (resolved) return { profile: resolved, matchedRegistry: true };
  const display = identifier.trim() || "Field worker";
  const shortName = display.includes("@") ? (display.split("@")[0] ?? display) : display;
  return {
    matchedRegistry: false,
    profile: {
      id: WORKER_SELF_SESSION_ID,
      name: shortName,
      workerRole: "cleanup_crew",
      status: "available",
      region: "Assign via regional coordinator (AP & Telangana)",
      certifications: ["Onboarding pending — contact your NGO lead"],
      missionsCompleted: 0,
      hoursThisMonth: 0,
      rewardPoints: 0,
      lastActiveAt: new Date().toISOString(),
    },
  };
}

export function resetWorkersDemo(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(GROUPS_STORAGE_KEY);
  bump();
}
