import { prismaClient } from "../db/prismaClient";
import { AREA_PLACE_SEARCHES, NEARBY_SEARCH_RADIUS_KM } from "../constants/areaPlaceSearches";
import logger from "../utils/loggers";

export type CachedNearbyPlace = {
  id: string;
  name: string;
  distance: string;
  type: string;
  place_id: string;
  vicinity: string;
  rating?: number;
};

type GooglePlaceResult = {
  name?: string;
  vicinity?: string;
  place_id?: string;
  rating?: number;
  geometry?: { location?: { lat?: number; lng?: number } };
};

const CATEGORY_TYPE_MAP: Record<string, string> = {
  petrol: "gas_station",
  shopping: "shopping_mall",
  transport: "transit_station",
  "post-office": "post_office",
  "ev-charging": "electric_vehicle_charging_station",
  broadband: "broadband",
  supermarket: "supermarket",
};

/** Refresh cached places every 90 days (Google ToS allows limited retention). */
export const NEARBY_PLACES_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function getGoogleMapsApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function resolveDistanceUnit(country: string): "mi" | "km" {
  if (
    /united kingdom|\buk\b|england|scotland|wales|northern ireland|great britain|\bgb\b/i.test(
      country
    )
  ) {
    return "mi";
  }
  return "km";
}

function formatDistance(km: number, unit: "mi" | "km"): string {
  if (unit === "mi") {
    const miles = km * 0.621371;
    if (miles < 0.1) {
      return `${Math.max(1, Math.round(miles * 1760))} yd`;
    }
    return `${miles.toFixed(1)} mi`;
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

function resolveFeatureType(configId: string): string {
  return CATEGORY_TYPE_MAP[configId] || configId;
}

async function googleNearbySearch(
  latitude: number,
  longitude: number,
  type: string,
  radiusM: number,
  apiKey: string
): Promise<GooglePlaceResult[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${latitude},${longitude}`);
  url.searchParams.set("radius", String(radiusM));
  url.searchParams.set("type", type);
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = (await res.json()) as { status?: string; results?: GooglePlaceResult[] };
    if (json.status !== "OK" || !json.results?.length) return [];
    return json.results;
  } catch {
    return [];
  }
}

async function googleTextSearch(
  latitude: number,
  longitude: number,
  query: string,
  radiusM: number,
  apiKey: string
): Promise<GooglePlaceResult[]> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("location", `${latitude},${longitude}`);
  url.searchParams.set("radius", String(radiusM));
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = (await res.json()) as { status?: string; results?: GooglePlaceResult[] };
    if (json.status !== "OK" || !json.results?.length) return [];
    return json.results;
  } catch {
    return [];
  }
}

function placeDistanceKm(
  centerLat: number,
  centerLng: number,
  place: GooglePlaceResult
): number {
  const lat = place.geometry?.location?.lat ?? centerLat;
  const lng = place.geometry?.location?.lng ?? centerLng;
  return haversineDistanceKm(centerLat, centerLng, lat, lng);
}

export async function fetchNearbyPlacesFromGoogle(
  latitude: number,
  longitude: number,
  country: string
): Promise<CachedNearbyPlace[]> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    logger.warn("GOOGLE_MAPS_API_KEY not set; skipping nearby places fetch");
    return [];
  }

  const radiusM = Math.round(NEARBY_SEARCH_RADIUS_KM * 1000);
  const distanceUnit = resolveDistanceUnit(country);
  const features: CachedNearbyPlace[] = [];
  const seen = new Set<string>();

  for (const config of AREA_PLACE_SEARCHES) {
    let places: GooglePlaceResult[] = [];

    if (config.types?.length) {
      const results = await Promise.all(
        config.types.map((type) =>
          googleNearbySearch(latitude, longitude, type, radiusM, apiKey)
        )
      );
      places = results
        .flat()
        .filter((place) => {
          const key = place.place_id || place.name || "";
          if (!key || seen.has(key)) return false;
          const km = placeDistanceKm(latitude, longitude, place);
          if (km > NEARBY_SEARCH_RADIUS_KM) return false;
          seen.add(key);
          return true;
        })
        .sort(
          (a, b) =>
            placeDistanceKm(latitude, longitude, a) -
            placeDistanceKm(latitude, longitude, b)
        );
    } else if (config.keyword) {
      places = await googleTextSearch(
        latitude,
        longitude,
        config.keyword,
        radiusM,
        apiKey
      );
      places = places
        .filter((place) => {
          const key = place.place_id || place.name || "";
          if (!key || seen.has(key)) return false;
          const km = placeDistanceKm(latitude, longitude, place);
          if (km > NEARBY_SEARCH_RADIUS_KM) return false;
          seen.add(key);
          return true;
        })
        .sort(
          (a, b) =>
            placeDistanceKm(latitude, longitude, a) -
            placeDistanceKm(latitude, longitude, b)
        );
    }

    const featureType = resolveFeatureType(config.id);

    for (const place of places.slice(0, config.limit)) {
      const km = placeDistanceKm(latitude, longitude, place);
      features.push({
        id: place.place_id || `${place.name}-${config.id}`,
        name: place.name || "Unknown",
        distance: formatDistance(km, distanceUnit),
        type: featureType,
        place_id: place.place_id || "",
        vicinity: place.vicinity || "",
        rating: place.rating,
      });
    }
  }

  return features;
}

export function isNearbyPlacesCacheStale(
  fetchedAt: Date | string | null | undefined
): boolean {
  if (!fetchedAt) return true;
  const ts = fetchedAt instanceof Date ? fetchedAt.getTime() : new Date(fetchedAt).getTime();
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > NEARBY_PLACES_CACHE_TTL_MS;
}

export function parseCachedNearbyPlaces(raw: unknown): CachedNearbyPlace[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is CachedNearbyPlace =>
      !!item &&
      typeof item === "object" &&
      typeof (item as CachedNearbyPlace).name === "string"
  );
}

export async function refreshNearbyPlacesCache(
  propertyId: string,
  latitude: number,
  longitude: number,
  country: string
): Promise<CachedNearbyPlace[]> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return [];
  }

  const places = await fetchNearbyPlacesFromGoogle(latitude, longitude, country);

  await prismaClient.properties.update({
    where: { id: propertyId },
    data: {
      cachedNearbyPlaces: places,
      cachedNearbyPlacesFetchedAt: new Date(),
    },
  });

  return places;
}

const refreshInFlight = new Set<string>();

/**
 * Refresh cache in the background when missing or stale. Safe to call on every listing read.
 */
export function ensureNearbyPlacesCacheFresh(
  propertyId: string,
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  country: string,
  fetchedAt?: Date | string | null
): void {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {
    return;
  }

  if (!isNearbyPlacesCacheStale(fetchedAt)) {
    return;
  }

  if (refreshInFlight.has(propertyId)) {
    return;
  }

  refreshInFlight.add(propertyId);
  void refreshNearbyPlacesCache(
    propertyId,
    Number(latitude),
    Number(longitude),
    country || ""
  )
    .catch((error) => {
      logger.error("Failed to refresh nearby places cache", {
        propertyId,
        error,
      });
    })
    .finally(() => {
      refreshInFlight.delete(propertyId);
    });
}
