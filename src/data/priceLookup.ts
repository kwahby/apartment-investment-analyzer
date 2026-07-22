import pricesData from './pricesByPlz.json';

export interface PriceEntry {
  plz: string;
  city: string;
  district?: string;
  state: string;
  avgPricePerSqm: number;
  avgRentPerSqm: number;
}

export interface CityFallbackEntry {
  city: string;
  state: string;
  avgPricePerSqm: number;
  avgRentPerSqm: number;
}

export interface PriceLookupResult {
  avgPricePerSqm: number;
  avgRentPerSqm: number;
  /** Human-readable label, e.g. "60313 Frankfurt am Main — Innenstadt". */
  label: string;
  /** True when matched by exact postal code, false when a city-level fallback was used. */
  exact: boolean;
}

const entries = pricesData.entries as PriceEntry[];
const cityFallback = (pricesData.cityFallback ?? []) as CityFallbackEntry[];

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Resolve area averages from a postal code or a city name.
 * Tries an exact PLZ match first, then a city name match (entry or fallback).
 * Returns null when nothing matches.
 */
export function lookupArea(query: string): PriceLookupResult | null {
  const q = query.trim();
  if (!q) return null;

  // 5-digit postal code → exact entry match first.
  if (/^\d{5}$/.test(q)) {
    const hit = entries.find((e) => e.plz === q);
    if (hit) {
      return {
        avgPricePerSqm: hit.avgPricePerSqm,
        avgRentPerSqm: hit.avgRentPerSqm,
        label: `${hit.plz} ${hit.city}${hit.district ? ` — ${hit.district}` : ''}`,
        exact: true,
      };
    }
    // No exact PLZ: fall back to nearby known areas that share the leading
    // digits (PLZ prefix ≈ region). Try 3 digits, then 2.
    for (const len of [3, 2]) {
      const prefix = q.slice(0, len);
      const near = entries.filter((e) => e.plz.startsWith(prefix));
      if (near.length > 0) {
        const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
        // Most common city among the nearby entries, for the label.
        const cityCounts = new Map<string, number>();
        for (const e of near) cityCounts.set(e.city, (cityCounts.get(e.city) ?? 0) + 1);
        const city = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return {
          avgPricePerSqm: Math.round(avg(near.map((e) => e.avgPricePerSqm))),
          avgRentPerSqm: Math.round(avg(near.map((e) => e.avgRentPerSqm)) * 10) / 10,
          label: `${city} area (≈ PLZ ${prefix}${'x'.repeat(5 - len)})`,
          exact: false,
        };
      }
    }
    return null;
  }

  // Otherwise treat it as a city name.
  const nq = norm(q);
  const cityHit = cityFallback.find((c) => norm(c.city) === nq);
  if (cityHit) {
    return {
      avgPricePerSqm: cityHit.avgPricePerSqm,
      avgRentPerSqm: cityHit.avgRentPerSqm,
      label: `${cityHit.city} (city average)`,
      exact: false,
    };
  }

  // Fall back to any entry whose city matches (average of that city's entries).
  const cityEntries = entries.filter((e) => norm(e.city) === nq);
  if (cityEntries.length > 0) {
    const avg = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
    return {
      avgPricePerSqm: Math.round(avg(cityEntries.map((e) => e.avgPricePerSqm))),
      avgRentPerSqm: Math.round(avg(cityEntries.map((e) => e.avgRentPerSqm)) * 10) / 10,
      label: `${cityEntries[0].city} (city average)`,
      exact: false,
    };
  }

  return null;
}

export const priceDataMeta = pricesData.meta;
