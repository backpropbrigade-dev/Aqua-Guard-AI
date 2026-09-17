import { useSyncExternalStore } from "react";
import { getUavPlasticAutomationVersion, subscribeUavPlasticAutomation } from "@/lib/uav-plastic-automation";

export function useUavAutomationVersion(): number {
  return useSyncExternalStore(subscribeUavPlasticAutomation, getUavPlasticAutomationVersion, () => 0);
}
