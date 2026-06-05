import {
    AvailabilityStatus,
    ListingType,
    Prisma,
    PropertySpecificationType,
    PropertyType,
} from '@prisma/client';

export type ListedPropertySort = 'newest' | 'price-asc' | 'price-desc' | 'popular';

export interface ListedPropertySearchFilters {
    landlordId?: string;
    sort?: ListedPropertySort;
    minRentalFee?: number;
    maxRentalFee?: number;
    zipcode?: string;
    mustHaves?: string[];
    property?: {
        state?: string;
        city?: string;
        country?: string;
        specificationType?: string;
        /** PropertyType values (HOUSE, APARTMENT, …) */
        propertySubType?: PropertyType | PropertyType[];
        minBedRoom?: number;
        maxBedRoom?: number;
        minBathRoom?: number;
        maxBathRoom?: number;
        isActive?: boolean;
    };
    /** ListingType values (ENTIRE_PROPERTY, SINGLE_UNIT, ROOM, …) */
    listingType?: ListingType | ListingType[];
    isFurnished?: boolean;
    hasGarden?: boolean;
    hasGarage?: boolean;
    hasParking?: boolean;
    isPetFriendly?: boolean;
    hasSwimmingPool?: boolean;
    hasGym?: boolean;
    hasSecurity?: boolean;
    hasAirConditioning?: boolean;
    hasBalcony?: boolean;
}

const FEATURE_TOKENS: Record<string, string[]> = {
    garden: ['Garden', 'garden', 'Private Garden', 'Private garden'],
    garage: ['Garage', 'garage'],
    parking: ['Parking', 'parking', 'Off-street parking', 'Off street parking'],
    pet: ['Pet friendly', 'Pets allowed', 'Pet Friendly', 'pets allowed'],
    pool: ['Swimming pool', 'Swimming Pool', 'Pool'],
    gym: ['Gym', 'gym', 'Fitness center', 'Fitness Centre'],
    security: ['Security', 'security', 'CCTV', 'Alarm'],
    aircon: ['Air conditioning', 'Air Conditioning', 'A/C', 'AC'],
    balcony: ['Balcony', 'balcony', 'Terrace', 'terrace'],
};

function keyFeatureOr(tokens: string[]): Prisma.propertiesWhereInput {
    return {
        OR: tokens.flatMap((token) => [
            { keyFeatures: { has: token } },
            { customKeyFeatures: { has: token } },
        ]),
    };
}

function residentialSpecWhere(
    residential: Prisma.ResidentialPropertyWhereInput
): Prisma.propertiesWhereInput {
    return {
        specification: {
            some: {
                residential,
            },
        },
    };
}

function buildBedroomBathWhere(
    minBedRoom?: number,
    maxBedRoom?: number,
    minBathRoom?: number,
    maxBathRoom?: number
): Prisma.propertiesWhereInput | undefined {
    if (!minBedRoom && !maxBedRoom && !minBathRoom && !maxBathRoom) {
        return undefined;
    }

    const bedroomFilter: Prisma.IntNullableFilter | undefined =
        minBedRoom || maxBedRoom
            ? {
                  ...(minBedRoom != null ? { gte: minBedRoom } : {}),
                  ...(maxBedRoom != null ? { lte: maxBedRoom } : {}),
              }
            : undefined;

    const bathroomFilter: Prisma.IntNullableFilter | undefined =
        minBathRoom || maxBathRoom
            ? {
                  ...(minBathRoom != null ? { gte: minBathRoom } : {}),
                  ...(maxBathRoom != null ? { lte: maxBathRoom } : {}),
              }
            : undefined;

    return residentialSpecWhere({
        ...(bedroomFilter ? { bedrooms: bedroomFilter } : {}),
        ...(bathroomFilter ? { bathrooms: bathroomFilter } : {}),
    });
}

function buildFeatureWhere(
    flag: boolean | undefined,
    tokens: string[],
    sharedFacility?: keyof Prisma.SharedFacilitiesWhereInput
): Prisma.propertiesWhereInput | undefined {
    if (!flag) return undefined;

    const conditions: Prisma.propertiesWhereInput[] = [keyFeatureOr(tokens)];

    if (sharedFacility) {
        conditions.push(
            residentialSpecWhere({
                sharedFacilities: {
                    is: {
                        [sharedFacility]: true,
                    },
                },
            })
        );
    }

    return { OR: conditions };
}

function buildFurnishedWhere(isFurnished?: boolean): Prisma.propertyListingHistoryWhereInput | undefined {
    if (!isFurnished) return undefined;

    return {
        OR: [
            {
                property: residentialSpecWhere({
                    furnished: true,
                }),
            },
            { unit: { furnished: true } },
            { room: { furnished: true } },
        ],
    };
}

function buildMustHavesWhere(mustHaves?: string[]): Prisma.propertiesWhereInput | undefined {
    if (!mustHaves?.length) return undefined;

    return {
        OR: mustHaves.flatMap((token) => [
            { keyFeatures: { has: token } },
            { customKeyFeatures: { has: token } },
            {
                specification: {
                    some: {
                        residential: {
                            buildingAmenityFeatures: { has: token },
                        },
                    },
                },
            },
        ]),
    };
}

/**
 * Shared Prisma where clause for public tenant property search.
 */
export function buildListedPropertyWhereClause(
    filters: ListedPropertySearchFilters = {},
    availability = true
): Prisma.propertyListingHistoryWhereInput {
    const {
        landlordId,
        minRentalFee,
        maxRentalFee,
        zipcode,
        mustHaves,
        property = {},
        listingType,
        isFurnished,
        hasGarden,
        hasGarage,
        hasParking,
        isPetFriendly,
        hasSwimmingPool,
        hasGym,
        hasSecurity,
        hasAirConditioning,
        hasBalcony,
    } = filters;

    const {
        state,
        city,
        country,
        specificationType,
        propertySubType,
        minBedRoom,
        maxBedRoom,
        minBathRoom,
        maxBathRoom,
        isActive,
    } = property;

    const activeOnly = isActive !== undefined ? isActive : true;

    const propertyAndConditions: Prisma.propertiesWhereInput[] = [];

    if (landlordId) {
        propertyAndConditions.push({ landlordId });
    }

    if (availability) {
        propertyAndConditions.push({ availability: AvailabilityStatus.VACANT });
    }

    if (specificationType) {
        const valid = Object.values(PropertySpecificationType).includes(
            specificationType as PropertySpecificationType
        );
        if (valid) {
            propertyAndConditions.push({
                specificationType: specificationType as PropertySpecificationType,
            });
        }
    }

    if (state?.trim()) {
        propertyAndConditions.push({
            state: {
                is: {
                    name: {
                        contains: state.trim(),
                        mode: 'insensitive',
                    },
                },
            },
        });
    }

    if (city?.trim()) {
        propertyAndConditions.push({
            OR: [
                { city: { contains: city.trim(), mode: 'insensitive' } },
                { address: { contains: city.trim(), mode: 'insensitive' } },
            ],
        });
    }

    if (country?.trim()) {
        propertyAndConditions.push({
            country: {
                equals: country.trim(),
                mode: 'insensitive',
            },
        });
    }

    if (zipcode?.trim()) {
        propertyAndConditions.push({
            zipcode: {
                contains: zipcode.trim(),
                mode: 'insensitive',
            },
        });
    }

    const bedBathWhere = buildBedroomBathWhere(
        minBedRoom,
        maxBedRoom,
        minBathRoom,
        maxBathRoom
    );
    if (bedBathWhere) propertyAndConditions.push(bedBathWhere);

    const featureConditions = [
        buildFeatureWhere(hasGarden, FEATURE_TOKENS.garden, 'garden'),
        buildFeatureWhere(hasGarage, FEATURE_TOKENS.garage, 'garage'),
        buildFeatureWhere(hasParking, FEATURE_TOKENS.parking, 'parking'),
        buildFeatureWhere(isPetFriendly, FEATURE_TOKENS.pet),
        buildFeatureWhere(hasSwimmingPool, FEATURE_TOKENS.pool),
        buildFeatureWhere(hasGym, FEATURE_TOKENS.gym),
        buildFeatureWhere(hasSecurity, FEATURE_TOKENS.security),
        buildFeatureWhere(hasAirConditioning, FEATURE_TOKENS.aircon),
        buildFeatureWhere(hasBalcony, FEATURE_TOKENS.balcony),
        buildMustHavesWhere(mustHaves),
    ].filter(Boolean) as Prisma.propertiesWhereInput[];

    propertyAndConditions.push(...featureConditions);

    const propertySubTypes = propertySubType
        ? Array.isArray(propertySubType)
            ? propertySubType
            : [propertySubType]
        : undefined;

    const listingTypes = listingType
        ? Array.isArray(listingType)
            ? listingType
            : [listingType]
        : undefined;

    const furnishedWhere = buildFurnishedWhere(isFurnished);

    const baseWhere: Prisma.propertyListingHistoryWhereInput = {
        isActive: activeOnly,
        onListing: activeOnly,
        ...(listingTypes?.length
            ? {
                  type: {
                      in: listingTypes,
                  },
              }
            : {}),
        ...(propertySubTypes?.length
            ? {
                  propertySubType: {
                      in: propertySubTypes,
                  },
              }
            : {}),
        ...(minRentalFee != null || maxRentalFee != null
            ? {
                  price: {
                      ...(minRentalFee != null ? { gte: minRentalFee } : {}),
                      ...(maxRentalFee != null ? { lte: maxRentalFee } : {}),
                  },
              }
            : {}),
        ...(propertyAndConditions.length
            ? {
                  property: {
                      isDeleted: false,
                      AND: propertyAndConditions,
                  },
              }
            : {
                  property: {
                      isDeleted: false,
                      ...(availability ? { availability: AvailabilityStatus.VACANT } : {}),
                  },
              }),
    };

    if (furnishedWhere) {
        return {
            AND: [baseWhere, furnishedWhere],
        };
    }

    return baseWhere;
}

export function buildListedPropertyOrderBy(
    sort?: ListedPropertySort
): Prisma.propertyListingHistoryOrderByWithRelationInput {
    switch (sort) {
        case 'price-asc':
            return { price: 'asc' };
        case 'price-desc':
            return { price: 'desc' };
        case 'popular':
        case 'newest':
        default:
            return { createdAt: 'desc' };
    }
}

export function parseListedPropertySort(value: unknown): ListedPropertySort | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (
        normalized === 'newest' ||
        normalized === 'price-asc' ||
        normalized === 'price-desc' ||
        normalized === 'popular'
    ) {
        return normalized;
    }
    return undefined;
}

export function parseTruthyQueryFlag(value: unknown): boolean {
    if (value === true || value === 1) return true;
    if (typeof value === 'string') {
        return value === 'true' || value === '1';
    }
    return false;
}
