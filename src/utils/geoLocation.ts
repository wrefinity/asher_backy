import { Prisma, PrismaClient } from '@prisma/client';
import type { ListedPropertySearchFilters } from './listedPropertySearch';

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

const MILES_TO_METERS = 1609.344;

export function milesToMeters(miles: number): number {
    return miles * MILES_TO_METERS;
}

function buildBoundingBoxWhere(
    latitude: number,
    longitude: number,
    radiusMiles: number
): Prisma.propertiesWhereInput {
    const latDelta = radiusMiles / 69;
    const lngDelta = radiusMiles / (69 * Math.cos((latitude * Math.PI) / 180));

    return {
        isDeleted: false,
        latitude: {
            gte: new Prisma.Decimal(latitude - latDelta),
            lte: new Prisma.Decimal(latitude + latDelta),
        },
        longitude: {
            gte: new Prisma.Decimal(longitude - lngDelta),
            lte: new Prisma.Decimal(longitude + lngDelta),
        },
    };
}

/**
 * True circle radius search via PostGIS ST_DWithin. Falls back to lat/lng bbox
 * when PostGIS is not enabled yet.
 */
export async function findPropertyIdsWithinRadiusMiles(
    prisma: PrismaExecutor,
    latitude: number,
    longitude: number,
    radiusMiles: number
): Promise<string[]> {
    if (radiusMiles <= 0) return [];

    const radiusMeters = milesToMeters(radiusMiles);

    try {
        const rows = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id
            FROM properties
            WHERE location IS NOT NULL
              AND "isDeleted" = false
              AND ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint(${longitude}::double precision, ${latitude}::double precision), 4326)::geography,
                ${radiusMeters}
              )
        `;
        return rows.map((row) => row.id);
    } catch (error) {
        console.warn(
            'PostGIS radius search unavailable; falling back to bounding box.',
            error instanceof Error ? error.message : error
        );

        const properties = await prisma.properties.findMany({
            where: buildBoundingBoxWhere(latitude, longitude, radiusMiles),
            select: { id: true },
        });
        return properties.map((property) => property.id);
    }
}

/** Keep geography in sync when DB trigger is not yet applied. */
export async function syncPropertyLocationFromCoordinates(
    prisma: PrismaExecutor,
    propertyId: string,
    latitude?: number | Prisma.Decimal | string | null,
    longitude?: number | Prisma.Decimal | string | null
): Promise<void> {
    const lat = latitude != null ? Number(latitude) : NaN;
    const lng = longitude != null ? Number(longitude) : NaN;

    if (!propertyId || Number.isNaN(lat) || Number.isNaN(lng)) {
        try {
            await prisma.$executeRaw`
                UPDATE properties
                SET location = NULL
                WHERE id = ${propertyId}
            `;
        } catch {
            // PostGIS column may not exist yet
        }
        return;
    }

    try {
        await prisma.$executeRaw`
            UPDATE properties
            SET location = ST_SetSRID(
              ST_MakePoint(${lng}::double precision, ${lat}::double precision),
              4326
            )::geography
            WHERE id = ${propertyId}
        `;
    } catch {
        // PostGIS column may not exist yet
    }
}

/**
 * Resolves lat/lng/radius into a concrete property id list for Prisma filters.
 */
export async function enrichListedPropertySearchFilters(
    filters: ListedPropertySearchFilters,
    prisma: PrismaExecutor
): Promise<ListedPropertySearchFilters> {
    const { latitude, longitude, radiusMiles } = filters;

    if (
        latitude == null ||
        longitude == null ||
        radiusMiles == null ||
        radiusMiles <= 0
    ) {
        return filters;
    }

    const geoPropertyIds = await findPropertyIdsWithinRadiusMiles(
        prisma,
        latitude,
        longitude,
        radiusMiles
    );

    const { latitude: _lat, longitude: _lng, radiusMiles: _radius, ...rest } =
        filters;

    return {
        ...rest,
        geoPropertyIds,
    };
}
