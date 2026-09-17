import { useEffect } from "react";
import { startUavSatelliteAutoScheduler } from "@/lib/uav-satellite-scheduler";

/** Mount once: 2h satellite-ingest UAV rescans + overdue catch-up when the app is open. */
export function UavSatelliteScheduler() {
  useEffect(() => startUavSatelliteAutoScheduler(), []);
  return null;
}
