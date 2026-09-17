import { useMemo } from "react";
import { useCitizenVersion } from "@/hooks/useCitizenVersion";
import { useNgoVersion } from "@/hooks/useNgoVersion";
import { useWorkerVersion } from "@/hooks/useWorkerVersion";
import { useUavAutomationVersion } from "@/hooks/useUavAutomationVersion";
import { useAuthorityReviewVersion } from "@/hooks/useAuthorityReviewVersion";

/** Re-render admin views when any tracked domain changes */
export function useAdminDashboardVersion(): number {
  const c = useCitizenVersion();
  const n = useNgoVersion();
  const w = useWorkerVersion();
  const u = useUavAutomationVersion();
  const a = useAuthorityReviewVersion();
  return useMemo(() => c + n + w + u + a, [c, n, w, u, a]);
}
