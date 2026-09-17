import { useEffect, useState } from "react";
import { fetchWorldData, type WorldDataBundle } from "@/lib/world-data";

export function useWorldData(lat: number | null, lng: number | null) {
  const [data, setData] = useState<WorldDataBundle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchWorldData(lat, lng)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return { data, loading };
}
