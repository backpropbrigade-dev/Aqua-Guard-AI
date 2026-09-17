import { useSyncExternalStore } from "react";
import { getNgoVersion, subscribeNgo } from "@/lib/ngo-store";

export function useNgoVersion(): number {
  return useSyncExternalStore(subscribeNgo, getNgoVersion, () => 0);
}
