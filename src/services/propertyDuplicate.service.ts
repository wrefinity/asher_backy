import { MediaType, PropertySpecificationType } from '@prisma/client';
import { prismaClient } from '..';
import type { IPropertySpecificationDTO } from '../validations/interfaces/properties.interface';
import PropertyServices from './propertyServices';

const META_KEYS = new Set([
  'id',
  'propertyId',
  'createdAt',
  'updatedAt',
  'residentialPropertyId',
  'commercialPropertyId',
  'shortletPropertyId',
]);

function omitMeta<T extends Record<string, unknown>>(row: T | null | undefined) {
  if (!row || typeof row !== 'object') return row;
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !META_KEYS.has(key))
  );
}

function mapMediaFiles(source: {
  images?: any[];
  videos?: any[];
  virtualTours?: any[];
  propertyDocument?: any[];
}) {
  const files: any[] = [];

  for (const img of source.images ?? []) {
    files.push({
      identifier: 'MediaTable',
      type: MediaType.IMAGE,
      url: img.url,
      fileType: img.fileType,
      isPrimary: img.isPrimary,
      caption: img.caption,
      size: img.size,
    });
  }

  for (const vid of source.videos ?? []) {
    files.push({
      identifier: 'MediaTable',
      type: MediaType.VIDEO,
      url: vid.url,
      fileType: vid.fileType,
      isPrimary: vid.isPrimary,
      caption: vid.caption,
      size: vid.size,
    });
  }

  for (const vt of source.virtualTours ?? []) {
    files.push({
      identifier: 'MediaTable',
      type: MediaType.VIRTUAL_TOUR,
      url: vt.url,
      fileType: vt.fileType,
      isPrimary: vt.isPrimary,
      caption: vt.caption,
      size: vt.size,
    });
  }

  for (const doc of source.propertyDocument ?? []) {
    const docUrls = Array.isArray(doc.documentUrl)
      ? doc.documentUrl
      : doc.documentUrl
        ? [doc.documentUrl]
        : [];
    files.push({
      identifier: 'DocTable',
      documentName: doc.documentName,
      url: docUrls,
      documentUrl: docUrls,
      size: doc.size,
      type: doc.type,
      docType: doc.docType,
      idType: doc.idType,
    });
  }

  return files;
}

function decimalToNumber(value: unknown) {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(String(value));
}

function sanitizeResidential(residential: any) {
  if (!residential) return {};

  const {
    unitConfigurations,
    roomDetails,
    sharedFacilities,
    billsSubCategory,
    outdoorsSpacesFeatures,
    buildingAmenityFeatures,
    safetyFeatures,
    PropertySpecification: _propertySpecification,
    ...rest
  } = residential;

  return {
    ...omitMeta(rest),
    outdoorsSpacesFeature: outdoorsSpacesFeatures,
    buildingAmenityFeatures,
    safetyFeatures,
    bills: billsSubCategory?.map((bill: { id: string }) => bill.id) ?? [],
    sharedFacilities: omitMeta(sharedFacilities),
    unitConfigurations:
      unitConfigurations?.map((unit: Record<string, unknown>) => omitMeta(unit)) ??
      [],
    roomDetails:
      roomDetails?.map((room: Record<string, unknown>) => omitMeta(room)) ?? [],
  };
}

function sanitizeCommercial(commercial: any) {
  if (!commercial) return {};

  const {
    floorAvailability,
    roomDetails,
    sharedFacilities,
    suitableFor,
    unitConfigurations,
    securityFeatures,
    safetyFeatures,
    customSafetyFeatures,
    coolingTypes,
    heatingTypes,
    otherSharedFacilities,
    ...rest
  } = commercial;

  return {
    ...omitMeta(rest),
    securityFeatures,
    safetyFeatures,
    customSafetyFeatures,
    coolingTypes,
    heatingTypes,
    otherSharedFacilities,
    sharedFacilities: omitMeta(sharedFacilities),
    suitableFor: suitableFor?.map((item: { name?: string } | string) =>
      typeof item === 'string' ? item : item.name
    ),
    floorAvailability:
      floorAvailability?.map((floor: Record<string, unknown>) => omitMeta(floor)) ??
      [],
    unitConfigurations:
      unitConfigurations?.map((unit: Record<string, unknown>) => omitMeta(unit)) ??
      [],
    roomDetails:
      roomDetails?.map((room: Record<string, unknown>) => omitMeta(room)) ?? [],
  };
}

function sanitizeShortlet(shortlet: any) {
  if (!shortlet) return {};

  const {
    seasonalPricing,
    unavailableDates,
    additionalRules,
    hostLanguages,
    sharedFacilities,
    roomDetails,
    outdoorsSpacesFeatures,
    buildingAmenityFeatures,
    safetyFeatures,
    bookings: _bookings,
    ...rest
  } = shortlet;

  return {
    ...omitMeta(rest),
    outdoorsSpacesFeatures,
    buildingAmenityFeatures,
    safetyFeatures,
    sharedFacilities: omitMeta(sharedFacilities),
    roomDetails:
      roomDetails?.map((room: Record<string, unknown>) => omitMeta(room)) ?? [],
    seasonalPricing:
      seasonalPricing?.map((season: Record<string, unknown>) => omitMeta(season)) ??
      [],
    unavailableDates:
      unavailableDates?.map((entry: any) =>
        typeof entry === 'string' ? entry : entry?.date
      ) ?? [],
    additionalRules:
      additionalRules?.map((entry: any) =>
        typeof entry === 'string' ? entry : entry?.rule
      ) ?? [],
    hostLanguages:
      hostLanguages?.map((entry: any) =>
        typeof entry === 'string' ? entry : entry?.language
      ) ?? [],
  };
}

async function resolveDuplicatePropertyName(
  landlordId: string,
  name: string,
  stateId: string,
  city: string
) {
  const root = String(name).replace(/-\d+$/, '');
  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    const exists = await PropertyServices.getUniquePropertiesBaseLandlordNameState(
      landlordId,
      candidate,
      stateId,
      city
    );
    if (!exists) return candidate;
  }
  throw new Error('Unable to generate a unique name for duplicated property');
}

export async function duplicatePropertyForLandlord(
  landlordId: string,
  propertyId: string,
  userId?: string
) {
  const source = (await prismaClient.properties.findFirst({
    where: { id: propertyId, landlordId, isDeleted: false },
    include: PropertyServices.propsInclusion,
  })) as any;

  if (!source) {
    throw new Error('Property not found');
  }

  if (!source.stateId) {
    throw new Error('Property state is missing');
  }

  const specifications = (source.specification ?? []) as any[];
  const activeSpec =
    specifications.find((spec: any) => spec.isActive) ?? specifications[0];

  if (!activeSpec || !source.specificationType) {
    throw new Error('Property specification not found');
  }

  const duplicateName = await resolveDuplicatePropertyName(
    landlordId,
    source.name,
    source.stateId,
    source.city ?? ''
  );

  const uploadedFiles = mapMediaFiles(source);

  // Only fields that exist on the `properties` table — spec fields live in `specification`
  const baseData = {
    name: duplicateName,
    landlordId,
    stateId: source.stateId,
    agencyId: source.agencyId ?? undefined,
    specificationType: source.specificationType,
    address: source.address,
    address2: source.address2 ?? undefined,
    city: source.city,
    country: source.country,
    zipcode: source.zipcode,
    latitude: source.latitude,
    longitude: source.longitude,
    currency: source.currency,
    priceFrequency: source.priceFrequency,
    rentalPeriod: source.rentalPeriod,
    availability: source.availability,
    description: source.description,
    landRegistryNumber: source.landRegistryNumber,
    postalCodeVerified:
      source.postalCodeVerified ?? source.postcodeVerified ?? false,
    businessRateVerified: source.businessRateVerified ?? false,
    purchaseType: source.purchaseType,
    vatStatus: source.vatStatus,
    areaUnit: source.areaUnit,
    propertySize: source.propertySize,
    yearBuilt: source.yearBuilt,
    keyFeatures: source.keyFeatures ?? [],
    customKeyFeatures: source.customKeyFeatures ?? [],
    nearbyAmenities: source.nearbyAmenities ?? [],
    customNearbyAmenities: source.customNearbyAmenities ?? [],
    amenityDistances: (source.amenityDistances as Record<string, string | number> | null) ?? null,
    price: decimalToNumber(source.price),
    marketValue: decimalToNumber(source.marketValue),
    propertyValue: decimalToNumber(source.propertyValue),
    securityDeposit: decimalToNumber(source.securityDeposit),
    initialDeposit: decimalToNumber(source.initialDeposit),
    virtualTourUrl: source.virtualTourUrl,
    isListed: false,
  };

  const specification = {
    specificationType: source.specificationType,
    propertySubType: activeSpec.propertySubType,
    otherTypeSpecific: activeSpec.otherTypeSpecific ?? undefined,
  } as IPropertySpecificationDTO;

  switch (source.specificationType) {
    case PropertySpecificationType.RESIDENTIAL:
      specification.residential = sanitizeResidential(
        activeSpec.residential
      ) as IPropertySpecificationDTO['residential'];
      break;
    case PropertySpecificationType.COMMERCIAL:
      specification.commercial = sanitizeCommercial(
        activeSpec.commercial
      ) as IPropertySpecificationDTO['commercial'];
      break;
    case PropertySpecificationType.SHORTLET:
      specification.shortlet = sanitizeShortlet(
        activeSpec.shortlet
      ) as IPropertySpecificationDTO['shortlet'];
      break;
    default:
      throw new Error(`Unsupported specification type: ${source.specificationType}`);
  }

  const created = await PropertyServices.createProperties(
    baseData as any,
    specification,
    uploadedFiles,
    userId
  );

  return PropertyServices.flatten(created as any);
}
