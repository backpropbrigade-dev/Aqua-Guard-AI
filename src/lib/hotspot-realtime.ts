/**
 * Simulates Socket.io-style pushes for the nearby pollution map.
 * Bumped after local store writes that affect hotspots; map layers refetch on tick.
 */

let version = 0;
const listeners = new Set<() => void>();

export function subscribeHotspotRealtime(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getHotspotRealtimeVersion(): number {
  return version;
}

export function emitHotspotRealtimeTick(): void {
  version += 1;
  listeners.forEach((l) => l());
}
