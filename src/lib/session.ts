const SESSION_KEY = "aquaguard_session";

export type UserRole = "admin" | "ngo" | "worker" | "citizen";

export type AquaGuardSession = {
  identifier: string;
  role: UserRole;
};

export function setSession(session: AquaGuardSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): AquaGuardSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AquaGuardSession & { role?: string };
    if (!parsed?.identifier || !parsed?.role) return null;
    if (parsed.role === "researcher") {
      const next: AquaGuardSession = { identifier: parsed.identifier, role: "worker" };
      setSession(next);
      return next;
    }
    return parsed as AquaGuardSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/** Default dashboard URL for a signed-in role (marketing page + deep links). */
export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "ngo":
      return "/dashboard/ngo";
    case "worker":
      return "/dashboard/worker";
    case "citizen":
      return "/dashboard/citizen";
  }
}
