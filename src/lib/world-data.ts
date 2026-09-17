/**
 * Real-world data (no API key): BigDataCloud client reverse geocode, Open-Meteo forecast + marine.
 * Cached per rounded lat/lng to respect rate limits.
 */

export type ReverseGeocodeResult = {
  label: string;
  country?: string;
};

export type WeatherCurrent = {
  temperatureC: number | null;
  humidityPct: number | null;
  windKmh: number | null;
  weatherCode: number | null;
  fetchedAt: string;
};

export type MarineCurrent = {
  waveHeightM: number | null;
  seaTempC: number | null;
  currentVelocityKmh: number | null;
  fetchedAt: string;
};

export type WorldDataBundle = {
  reverse: ReverseGeocodeResult | null;
  weather: WeatherCurrent | null;
  marine: MarineCurrent | null;
  error?: string;
};

type CacheEntry = { at: number; data: WorldDataBundle };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 8 * 60 * 1000;

function key(lat: number, lng: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export async function fetchWorldData(lat: number, lng: number): Promise<WorldDataBundle> {
  const k = key(lat, lng);
  const now = Date.now();
  const hit = cache.get(k);
  if (hit && now - hit.at < TTL_MS) return hit.data;

  const bundle: WorldDataBundle = { reverse: null, weather: null, marine: null };

  try {
    const [geo, wx, marine] = await Promise.allSettled([
      fetchJson<{
        locality?: string;
        city?: string;
        principalSubdivision?: string;
        countryName?: string;
        countryCode?: string;
      }>(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      ),
      fetchJson<{
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          wind_speed_10m?: number;
          weather_code?: number;
        };
      }>(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh`,
      ),
      fetchJson<{
        current?: {
          wave_height?: number;
          sea_surface_temperature?: number;
          ocean_current_velocity?: number;
        };
      }>(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&current=wave_height,sea_surface_temperature,ocean_current_velocity`,
      ),
    ]);

    if (geo.status === "fulfilled" && geo.value) {
      const g = geo.value;
      const parts = [g.locality, g.city, g.principalSubdivision, g.countryName].filter(Boolean);
      const label = [...new Set(parts)].join(", ");
      if (label) {
        bundle.reverse = {
          label,
          country: g.countryCode ?? g.countryName,
        };
      }
    }

    if (wx.status === "fulfilled" && wx.value.current) {
      const c = wx.value.current;
      bundle.weather = {
        temperatureC: c.temperature_2m ?? null,
        humidityPct: c.relative_humidity_2m ?? null,
        windKmh: c.wind_speed_10m ?? null,
        weatherCode: c.weather_code ?? null,
        fetchedAt: new Date().toISOString(),
      };
    }

    if (marine.status === "fulfilled" && marine.value.current) {
      const m = marine.value.current;
      bundle.marine = {
        waveHeightM: m.wave_height ?? null,
        seaTempC: m.sea_surface_temperature ?? null,
        currentVelocityKmh: m.ocean_current_velocity != null ? m.ocean_current_velocity * 3.6 : null,
        fetchedAt: new Date().toISOString(),
      };
    }

    const failed = [geo, wx, marine].every((x) => x.status === "rejected");
    if (failed) {
      bundle.error = "Could not load environmental data.";
    }
  } catch {
    bundle.error = "Network error loading live data.";
  }

  cache.set(k, { at: now, data: bundle });
  return bundle;
}

/** WMO weather code → short label (subset) */
export function weatherCodeLabel(code: number | null): string {
  if (code == null) return "—";
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Storm";
  return "Mixed";
}
