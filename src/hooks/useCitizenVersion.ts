import { useSyncExternalStore } from "react";
import { getCitizenVersion, subscribeCitizen } from "@/lib/citizen-store";

export function useCitizenVersion(): number {
  return useSyncExternalStore(subscribeCitizen, getCitizenVersion, () => 0);
}
