/**
 * Bulk-refresh cached nearby places for properties with coordinates.
 *
 * Run migration first:
 *   npm run db:cached-nearby-places
 *
 * Dry run (no API calls, no DB writes):
 *   npm run db:backfill-nearby-places:dry
 *
 * Backfill missing/stale caches only:
 *   npm run db:backfill-nearby-places
 *
 * Force refresh all properties with coordinates:
 *   npm run db:backfill-nearby-places:force
 *
 * Options:
 *   --dry-run          List targets only
 *   --force            Refresh even when cache is still fresh
 *   --limit=N          Process at most N properties
 *   --delay-ms=N       Pause between Google calls (default 500)
 */
import "dotenv/config";
import { prismaClient } from "../src/db/prismaClient";
import {
  isNearbyPlacesCacheStale,
  refreshNearbyPlacesCache,
} from "../src/services/nearbyPlacesCache.service";

const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

function readNumberFlag(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  if (!arg) return fallback;
  const parsed = Number(arg.slice(prefix.length));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const limit = readNumberFlag("limit", 0);
const delayMs = readNumberFlag("delay-ms", 500);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!dryRun && !apiKey) {
    console.error(
      "GOOGLE_MAPS_API_KEY is required. Set it in AsherBE/.env before running."
    );
    process.exit(1);
  }

  const properties = await prismaClient.properties.findMany({
    where: {
      isDeleted: false,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      cachedNearbyPlacesFetchedAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const targets = properties.filter((property) => {
    const lat = property.latitude != null ? Number(property.latitude) : NaN;
    const lng = property.longitude != null ? Number(property.longitude) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (force) return true;
    return isNearbyPlacesCacheStale(property.cachedNearbyPlacesFetchedAt);
  });

  const toProcess = limit > 0 ? targets.slice(0, limit) : targets;

  console.log(`Found ${properties.length} properties with coordinates.`);
  console.log(
    `${force ? "Force mode" : "Stale/missing only"}: ${targets.length} need refresh.`
  );
  console.log(
    `${dryRun ? "[dry-run] Would process" : "Processing"} ${toProcess.length} properties` +
      (limit > 0 ? ` (limit ${limit})` : "") +
      ` with ${delayMs}ms delay between API calls.\n`
  );

  let refreshed = 0;
  let failed = 0;
  let skipped = properties.length - targets.length;

  for (const [index, property] of toProcess.entries()) {
    const lat = Number(property.latitude);
    const lng = Number(property.longitude);
    const label = `${property.name} (${property.city}, ${property.country})`;

    if (dryRun) {
      console.log(
        `[dry-run] ${index + 1}/${toProcess.length} ${property.id} — ${label}`
      );
      refreshed += 1;
      continue;
    }

    try {
      const places = await refreshNearbyPlacesCache(
        property.id,
        lat,
        lng,
        property.country || ""
      );
      refreshed += 1;
      console.log(
        `✓ ${index + 1}/${toProcess.length} ${property.id} — ${label} (${places.length} places)`
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `✗ ${index + 1}/${toProcess.length} ${property.id} — ${label}: ${message}`
      );
    }

    if (index < toProcess.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Total with coordinates: ${properties.length}`);
  console.log(`Skipped (fresh cache):  ${skipped}`);
  console.log(`${dryRun ? "Would refresh" : "Refreshed"}:        ${refreshed}`);
  if (!dryRun) {
    console.log(`Failed:                 ${failed}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
