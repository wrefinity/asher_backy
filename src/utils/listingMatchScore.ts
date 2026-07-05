import { PropertySearchDto } from '../validations/interfaces/properties.interface';
import { NormalizedListing } from './ListingNormalizer';

/**
 * Weighted overlap between tenant search criteria and a matched listing (0–100).
 */
export function computeListingMatchScore(
  criteria: PropertySearchDto,
  listing: NormalizedListing
): number {
  let points = 0;
  let total = 0;

  if (criteria.propertyCategory) {
    total += 15;
    if (listing.property?.specificationType === criteria.propertyCategory) {
      points += 15;
    }
  }

  if (criteria.propertyType) {
    total += 10;
    if (listing.property?.propertySubType === criteria.propertyType) {
      points += 10;
    }
  }

  if (criteria.location?.trim()) {
    total += 20;
    const loc = criteria.location.trim().toLowerCase();
    const city = listing.property?.city?.toLowerCase() || '';
    const address = listing.property?.address?.toLowerCase() || '';
    const state = listing.property?.state?.name?.toLowerCase() || '';
    if (
      city.includes(loc) ||
      address.includes(loc) ||
      state.includes(loc) ||
      loc.includes(city)
    ) {
      points += 20;
    }
  }

  if (criteria.bedrooms != null) {
    total += 15;
    const beds = listing.property?.bedrooms ?? 0;
    if (beds >= criteria.bedrooms) {
      points += 15;
    } else if (beds > 0 && beds >= criteria.bedrooms - 1) {
      points += 8;
    }
  }

  if (criteria.bathrooms != null) {
    total += 10;
    const baths = listing.property?.bathrooms ?? 0;
    if (baths >= criteria.bathrooms) {
      points += 10;
    } else if (baths > 0 && baths >= criteria.bathrooms - 1) {
      points += 5;
    }
  }

  if (criteria.minRent != null || criteria.maxRent != null) {
    total += 20;
    const price = Number(listing.price) || 0;
    const min = criteria.minRent ?? 0;
    const max = criteria.maxRent ?? Number.MAX_SAFE_INTEGER;
    if (price >= min && price <= max) {
      points += 20;
    } else if (price > 0) {
      const mid = (min + Math.min(max, min * 2)) / 2;
      const diff = Math.abs(price - mid) / Math.max(mid, 1);
      if (diff <= 0.15) points += 10;
    }
  }

  if (criteria.country?.trim()) {
    total += 10;
    const country = criteria.country.trim().toLowerCase();
    const listingCountry = listing.property?.country?.toLowerCase() || '';
    if (listingCountry.includes(country) || country.includes(listingCountry)) {
      points += 10;
    }
  }

  if (total === 0) return 0;
  return Math.min(100, Math.round((points / total) * 100));
}
