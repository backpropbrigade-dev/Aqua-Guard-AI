/**
 * Continuous device geolocation (watchPosition). Not persisted — privacy-first.
 * Start/stop is controlled by citizen settings (share location + live tracking).
 */

export type LiveLocationStatus = "idle" | "pending" | "tracking" | "denied" | "unavailable";

export type LivePosition = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  headingDeg: number | null;
  speedMps: number | null;
  updatedAt: string;
};

type LiveState = {
  status: LiveLocationStatus;
  position: LivePosition | null;
};

let state: LiveState = { status: "idle", position: null };
let watchId: number | null = null;
let version = 0;
const listeners = new Set<() => void>();

function bump(): void {
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribeLiveLocation(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getLiveLocationVersion(): number {
  return version;
}

export function getLiveLocationState(): LiveState {
  return state;
}

export function startLiveTracking(options?: PositionOptions): void {
  stopLiveTracking();
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    state = { status: "unavailable", position: null };
    bump();
    return;
  }
  state = { status: "pending", position: state.position };
  bump();
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      state = {
        status: "tracking",
        position: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          headingDeg: pos.coords.heading != null && Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
          speedMps: pos.coords.speed != null && Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
          updatedAt: new Date().toISOString(),
        },
      };
      bump();
    },
    (err: GeolocationPositionError) => {
      state = {
        status: err.code === 1 ? "denied" : "unavailable",
        position: null,
      };
      bump();
    },
    {
      enableHighAccuracy: true,
      maximumAge: 4000,
      timeout: 20000,
      ...options,
    },
  );
}

export function stopLiveTracking(): void {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  state = { status: "idle", position: null };
  bump();
}
