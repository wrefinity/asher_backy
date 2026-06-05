import { ListingType, PropertySpecificationType, PropertyType } from '@prisma/client';
import {
    ListedPropertySearchFilters,
    parseListedPropertySort,
    parseTruthyQueryFlag,
} from './listedPropertySearch';

function parseNumber(value: unknown): number | undefined {
    if (value == null || value === '') return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
}

function parseString(value: unknown): string | undefined {
    if (value == null) return undefined;
    const text = String(value).trim();
    return text.length ? text : undefined;
}

function parseListingTypes(value: unknown): ListingType[] | undefined {
    if (!value) return undefined;
    const values = Array.isArray(value) ? value : [value];
    const valid = values.filter((entry): entry is ListingType =>
        Object.values(ListingType).includes(String(entry) as ListingType)
    );
    return valid.length ? valid : undefined;
}

function parsePropertySubTypes(value: unknown): PropertyType[] | undefined {
    if (!value) return undefined;
    const values = Array.isArray(value) ? value : [value];
    const valid = values.filter((entry): entry is PropertyType =>
        Object.values(PropertyType).includes(String(entry) as PropertyType)
    );
    return valid.length ? valid : undefined;
}

/**
 * Maps public GET /property query params to the shared listing search filter shape.
 */
export function buildListedPropertySearchFiltersFromQuery(
    query: Record<string, unknown>
): ListedPropertySearchFilters {
    const {
        state,
        city,
        country,
        specificationType,
        type,
        listingType,
        propertySubType,
        isActive,
        minBedRoom,
        maxBedRoom,
        minBathRoom,
        maxBathRoom,
        minRentalFee,
        maxRentalFee,
        zipcode,
        mustHaves,
        sort,
    } = query;

    const filters: ListedPropertySearchFilters = {
        sort: parseListedPropertySort(sort),
        minRentalFee: parseNumber(minRentalFee),
        maxRentalFee: parseNumber(maxRentalFee),
        zipcode: parseString(zipcode),
    };

    const property: ListedPropertySearchFilters['property'] = {};

    const stateValue = parseString(state);
    if (stateValue) property.state = stateValue;

    const cityValue = parseString(city);
    if (cityValue) property.city = cityValue;

    const countryValue = parseString(country);
    if (countryValue) property.country = countryValue;

    if (specificationType) {
        const spec = String(specificationType);
        if (Object.values(PropertySpecificationType).includes(spec as PropertySpecificationType)) {
            property.specificationType = spec;
        }
    }

    const minBed = parseNumber(minBedRoom);
    const maxBed = parseNumber(maxBedRoom);
    const minBath = parseNumber(minBathRoom);
    const maxBath = parseNumber(maxBathRoom);
    if (minBed != null) property.minBedRoom = minBed;
    if (maxBed != null) property.maxBedRoom = maxBed;
    if (minBath != null) property.minBathRoom = minBath;
    if (maxBath != null) property.maxBathRoom = maxBath;

    if (isActive !== undefined) {
        const activeNumber = parseInt(String(isActive), 10);
        if (!Number.isNaN(activeNumber)) {
            property.isActive = activeNumber === 1;
        } else if (parseTruthyQueryFlag(isActive)) {
            property.isActive = true;
        } else if (String(isActive) === 'false' || String(isActive) === '0') {
            property.isActive = false;
        }
    }

    if (Object.keys(property).length) {
        filters.property = property;
    }

    const listingTypes = parseListingTypes(listingType);
    if (listingTypes?.length) {
        filters.listingType = listingTypes;
    } else {
        // Back-compat: `type` previously sent PropertyType; try ListingType first, then propertySubType
        const legacyTypes = Array.isArray(type) ? type : type ? [type] : [];
        const asListingTypes = legacyTypes.filter((entry) =>
            Object.values(ListingType).includes(String(entry) as ListingType)
        ) as ListingType[];
        const asPropertySubTypes = legacyTypes.filter((entry) =>
            Object.values(PropertyType).includes(String(entry) as PropertyType)
        ) as PropertyType[];

        if (asListingTypes.length) {
            filters.listingType = asListingTypes;
        } else if (asPropertySubTypes.length) {
            filters.property = {
                ...filters.property,
                propertySubType: asPropertySubTypes,
            };
        }
    }

    const subTypes = parsePropertySubTypes(propertySubType);
    if (subTypes?.length) {
        filters.property = {
            ...filters.property,
            propertySubType: subTypes,
        };
    }

    if (mustHaves) {
        filters.mustHaves = Array.isArray(mustHaves)
            ? mustHaves.map(String)
            : [String(mustHaves)];
    }

    const booleanFlags: Array<[keyof ListedPropertySearchFilters, unknown]> = [
        ['isFurnished', query.isFurnished],
        ['hasGarden', query.hasGarden],
        ['hasGarage', query.hasGarage],
        ['hasParking', query.hasParking],
        ['isPetFriendly', query.isPetFriendly],
        ['hasSwimmingPool', query.hasSwimmingPool],
        ['hasGym', query.hasGym],
        ['hasSecurity', query.hasSecurity],
        ['hasAirConditioning', query.hasAirConditioning],
        ['hasBalcony', query.hasBalcony],
    ];

    for (const [key, value] of booleanFlags) {
        if (parseTruthyQueryFlag(value)) {
            (filters as Record<string, unknown>)[key] = true;
        }
    }

    return filters;
}
