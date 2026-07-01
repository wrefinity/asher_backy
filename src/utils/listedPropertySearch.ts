import {
    AvailabilityStatus,
    FurnishingStatus,
    ListingType,
    Prisma,
    PropertySpecificationType,
    PropertyType,
} from '@prisma/client';
import { LISTING_MARKET_COUNTRY_ALIASES, canonicalizeListingMarketCountry } from './listingMarketCountries';

export type ListedPropertySort = 'newest' | 'price-asc' | 'price-desc' | 'popular';

export type IncludeExcludeMode = 'include' | 'exclude' | 'only';

export interface ListedPropertySearchFilters {
    landlordId?: string;
    sort?: ListedPropertySort;
    minRentalFee?: number;
    maxRentalFee?: number;
    zipcode?: string;
    mustHaves?: string[];
    keywords?: string;
    addedSinceDays?: number;
    latitude?: number;
    longitude?: number;
    radiusMiles?: number;
    /** Resolved by enrichListedPropertySearchFilters when radius search is active. */
    geoPropertyIds?: string[];
    furnishingStatus?: FurnishingStatus | FurnishingStatus[];
    availableFrom?: Date;
    availableNow?: boolean;
    hasBillsIncluded?: boolean;
    /** Viewer market gate — only listings in this country are visible on tenant web. */
    marketCountry?: string;
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
    isShareHouse?: IncludeExcludeMode;
    isHMO?: IncludeExcludeMode;
    isStudentLet?: IncludeExcludeMode;
    isRetirement?: IncludeExcludeMode;
}

/** Slugs stored by landlord form + human-readable labels for fuzzy key-feature matching. */
const FEATURE_TOKENS: Record<string, string[]> = {
    garden: ['garden', 'Garden', 'Private Garden', 'Private garden'],
    garage: ['garage', 'Garage'],
    parking: ['parking', 'Parking', 'Off-street parking', 'Off street parking'],
    pet: [
        'pets-allowed',
        'pet friendly',
        'Pet friendly',
        'Pets allowed',
        'Pet Friendly',
        'pets allowed',
    ],
    pool: ['swimming-pool', 'Swimming pool', 'Swimming Pool', 'Pool', 'pool'],
    gym: ['gym', 'Gym', 'Fitness center', 'Fitness Centre'],
    security: ['security-system', 'Security', 'security', 'CCTV', 'Alarm'],
    aircon: ['air-conditioning', 'Air conditioning', 'Air Conditioning', 'A/C', 'AC'],
    balcony: ['balcony', 'Balcony', 'terrace', 'Terrace'],
    bills: ['bills-included', 'Bills included', 'bills included'],
    conservatory: ['conservatory', 'Conservatory'],
    bathtub: ['bathtub', 'Bathtub', 'Bath'],
    kitchenIsland: ['kitchen-island', 'Kitchen island', 'Kitchen Island'],
    periodProperty: ['period-property', 'Period property', 'Period Property'],
    evCharging: ['ev-charging', 'EV charging', 'Electric vehicle charging'],
    disabledAccess: ['wheelchair-access', 'Wheelchair access', 'Disabled access'],
    fireplace: ['fireplace', 'Fireplace'],
    ensuite: ['ensuite', 'Ensuite', 'En-suite'],
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

function buildResidentialFlagWhere(
    field: 'isShareHouse' | 'isHMO' | 'isStudentLet' | 'isRetirement',
    mode?: IncludeExcludeMode
): Prisma.propertiesWhereInput | undefined {
    if (!mode || mode === 'include') return undefined;

    if (mode === 'only') {
        return residentialSpecWhere({ [field]: true });
    }

    return residentialSpecWhere({
        OR: [{ [field]: false }, { [field]: null }],
    });
}

function buildFurnishingWhere(
    isFurnished?: boolean,
    furnishingStatus?: FurnishingStatus | FurnishingStatus[]
): Prisma.propertyListingHistoryWhereInput | undefined {
    const statuses = furnishingStatus
        ? Array.isArray(furnishingStatus)
            ? furnishingStatus
            : [furnishingStatus]
        : undefined;

    if (!isFurnished && !statuses?.length) return undefined;

    const conditions: Prisma.propertyListingHistoryWhereInput[] = [];

    if (isFurnished) {
        conditions.push({
            OR: [
                { property: residentialSpecWhere({ furnished: true }) },
                { unit: { furnished: true } },
                { room: { furnished: true } },
            ],
        });
    }

    if (statuses?.length) {
        conditions.push({
            property: residentialSpecWhere({
                furnishingStatus: { in: statuses },
            }),
        });
    }

    if (!conditions.length) return undefined;
    if (conditions.length === 1) return conditions[0];
    return { OR: conditions };
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
            {
                specification: {
                    some: {
                        residential: {
                            outdoorsSpacesFeatures: { has: token },
                        },
                    },
                },
            },
        ]),
    };
}

function buildKeywordsWhere(keywords?: string): Prisma.propertiesWhereInput | undefined {
    const text = keywords?.trim();
    if (!text) return undefined;

    return {
        OR: [
            { name: { contains: text, mode: 'insensitive' } },
            { description: { contains: text, mode: 'insensitive' } },
            { address: { contains: text, mode: 'insensitive' } },
            { city: { contains: text, mode: 'insensitive' } },
            { zipcode: { contains: text, mode: 'insensitive' } },
        ],
    };
}

function buildMarketCountryWhere(marketCountry: string): Prisma.propertiesWhereInput {
    const canonical = canonicalizeListingMarketCountry(marketCountry);
    const aliases = LISTING_MARKET_COUNTRY_ALIASES[canonical] || [canonical];

    return {
        OR: aliases.map((name) => ({
            country: {
                equals: name,
                mode: 'insensitive',
            },
        })),
    };
}

function buildRentalFeeWhere(
    minRentalFee?: number,
    maxRentalFee?: number
): Prisma.propertyListingHistoryWhereInput | undefined {
    if (minRentalFee == null && maxRentalFee == null) return undefined;

    const bounds: Prisma.DecimalFilter = {
        ...(minRentalFee != null ? { gte: minRentalFee } : {}),
        ...(maxRentalFee != null ? { lte: maxRentalFee } : {}),
    };

    return {
        OR: [
            { price: bounds },
            {
                AND: [
                    {
                        OR: [{ price: { equals: 0 } }, { price: null }],
                    },
                    { property: { price: bounds } },
                ],
            },
        ],
    };
}

function buildGeoPropertyIdsWhere(
    geoPropertyIds?: string[]
): Prisma.propertiesWhereInput | undefined {
    if (!geoPropertyIds) return undefined;

    return {
        id: {
            in: geoPropertyIds.length ? geoPropertyIds : ['__no_geo_match__'],
        },
    };
}

function buildBillsIncludedWhere(hasBillsIncluded?: boolean): Prisma.propertiesWhereInput | undefined {
    if (!hasBillsIncluded) return undefined;

    return {
        OR: [
            keyFeatureOr(FEATURE_TOKENS.bills),
            residentialSpecWhere({ billsIncluded: true }),
        ],
    };
}

function buildAvailabilityWhere(
    availableFrom?: Date,
    availableNow?: boolean
): Prisma.propertyListingHistoryWhereInput | undefined {
    const now = new Date();

    if (availableNow) {
        return {
            OR: [
                { availableFrom: null },
                { availableFrom: { lte: now } },
                {
                    property: residentialSpecWhere({
                        OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
                    }),
                },
            ],
        };
    }

    if (availableFrom) {
        return {
            OR: [
                { availableFrom: { lte: availableFrom } },
                {
                    property: residentialSpecWhere({
                        availableFrom: { lte: availableFrom },
                    }),
                },
            ],
        };
    }

    return undefined;
}

function buildEntityVacancyWhere(): Prisma.propertyListingHistoryWhereInput {
    const vacantOrUnset = (
        field: 'property' | 'unit' | 'room'
    ): Prisma.propertyListingHistoryWhereInput => {
        if (field === 'property') {
            return {
                property: {
                    OR: [
                        { availability: AvailabilityStatus.VACANT },
                        { availability: null },
                    ],
                },
            };
        }
        if (field === 'unit') {
            return {
                unit: {
                    OR: [
                        { availability: AvailabilityStatus.VACANT },
                        { availability: null },
                    ],
                },
            };
        }
        return {
            room: {
                OR: [
                    { availability: AvailabilityStatus.VACANT },
                    { availability: null },
                ],
            },
        };
    };

    return {
        OR: [
            {
                type: ListingType.ENTIRE_PROPERTY,
                ...vacantOrUnset('property'),
            },
            {
                type: ListingType.SINGLE_UNIT,
                ...vacantOrUnset('unit'),
            },
            {
                type: ListingType.ROOM,
                ...vacantOrUnset('room'),
            },
        ],
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
        keywords,
        addedSinceDays,
        geoPropertyIds,
        marketCountry,
        furnishingStatus,
        availableFrom,
        availableNow,
        hasBillsIncluded,
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
        isShareHouse,
        isHMO,
        isStudentLet,
        isRetirement,
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

    const listingVacancyWhere = availability ? buildEntityVacancyWhere() : undefined;

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
        const location = state.trim();
        // FE location bar sends `state`; match city, address, zip, or region name
        propertyAndConditions.push({
            OR: [
                { city: { contains: location, mode: 'insensitive' } },
                { address: { contains: location, mode: 'insensitive' } },
                { zipcode: { contains: location, mode: 'insensitive' } },
                { name: { contains: location, mode: 'insensitive' } },
                {
                    state: {
                        is: {
                            name: {
                                contains: location,
                                mode: 'insensitive',
                            },
                        },
                    },
                },
            ],
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

    if (marketCountry?.trim()) {
        propertyAndConditions.push(buildMarketCountryWhere(marketCountry));
    } else if (country?.trim()) {
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
        buildBillsIncludedWhere(hasBillsIncluded),
        buildMustHavesWhere(mustHaves),
        buildKeywordsWhere(keywords),
        buildGeoPropertyIdsWhere(geoPropertyIds),
        buildResidentialFlagWhere('isShareHouse', isShareHouse),
        buildResidentialFlagWhere('isHMO', isHMO),
        buildResidentialFlagWhere('isStudentLet', isStudentLet),
        buildResidentialFlagWhere('isRetirement', isRetirement),
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

    const furnishedWhere = buildFurnishingWhere(isFurnished, furnishingStatus);
    const availabilityWhere = buildAvailabilityWhere(availableFrom, availableNow);

    const addedSinceDate =
        addedSinceDays != null && addedSinceDays > 0
            ? new Date(Date.now() - addedSinceDays * 24 * 60 * 60 * 1000)
            : undefined;

    const baseWhere: Prisma.propertyListingHistoryWhereInput = {
        isActive: activeOnly,
        onListing: activeOnly,
        ...(addedSinceDate ? { createdAt: { gte: addedSinceDate } } : {}),
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
        ...(buildRentalFeeWhere(minRentalFee, maxRentalFee) ?? {}),
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
                  },
              }),
    };

    const extraConditions = [
        furnishedWhere,
        availabilityWhere,
        listingVacancyWhere,
    ].filter(Boolean) as Prisma.propertyListingHistoryWhereInput[];

    if (extraConditions.length) {
        return {
            AND: [baseWhere, ...extraConditions],
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

export function parseIncludeExcludeMode(value: unknown): IncludeExcludeMode | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'include' || normalized === 'exclude' || normalized === 'only') {
        return normalized;
    }
    return undefined;
}

export function parseFurnishingStatus(
    value: unknown
): FurnishingStatus | FurnishingStatus[] | undefined {
    if (!value) return undefined;
    const values = Array.isArray(value) ? value : String(value).split(',');
    const valid = values
        .map((entry) => String(entry).trim().toUpperCase())
        .filter((entry): entry is FurnishingStatus =>
            Object.values(FurnishingStatus).includes(entry as FurnishingStatus)
        );
    return valid.length === 1 ? valid[0] : valid.length ? valid : undefined;
}
