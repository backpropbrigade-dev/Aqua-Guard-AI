import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { getLiveLocationVersion, startLiveTracking, stopLiveTracking, subscribeLiveLocation } from "@/lib/live-location";

export function useLiveLocationVersion(): number {
  return useSyncExternalStore(subscribeLiveLocation, getLiveLocationVersion, () => 0);
}

export function useLiveLocationTracking(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      stopLiveTracking();
      return;
    }
    startLiveTracking();
    return () => stopLiveTracking();
  }, [enabled]);
}
