import { useSyncExternalStore } from "react";
import { getWorkerVersion, subscribeWorkers } from "@/lib/worker-store";

export function useWorkerVersion(): number {
  return useSyncExternalStore(subscribeWorkers, getWorkerVersion, () => 0);
}
