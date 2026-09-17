/**
 * Client-side geocoding for place names (no API keys).
 * Reverse: BigDataCloud free tier. Search: Open-Meteo geocoding API.
 */

export async function reverseGeocodeAddress(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lng))}&localityLanguage=en`;
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      locality?: string;
      city?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const parts = [j.locality, j.city, j.principalSubdivision, j.countryName].filter(Boolean) as string[];
    const uniq = [...new Set(parts)];
    return uniq.length ? uniq.join(", ") : null;
  } catch {
    return null;
  }
}

export type GeocodeHit = { lat: number; lng: number; label: string };

export async function searchGeocodePlaces(query: string, signal?: AbortSignal): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en`;
    const r = await fetch(url, { signal });
    if (!r.ok) return [];
    const j = (await r.json()) as {
      results?: { latitude: number; longitude: number; name: string; admin1?: string; country?: string }[];
    };
    return (j.results ?? []).map((x) => ({
      lat: x.latitude,
      lng: x.longitude,
      label: [x.name, x.admin1, x.country].filter(Boolean).join(", "),
    }));
  } catch {
    return [];
  }
}
