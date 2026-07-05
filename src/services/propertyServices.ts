import { IdType, ListingType, PriceFrequency, Prisma, PrismaClient, PropertySpecificationType } from "@prisma/client";
import { prismaClient } from "..";
import { PropertyType, MediaType, PropsSettingType } from "@prisma/client"
import { AvailabilityStatus } from "@prisma/client";
import LogsServices, { formatAvailabilityLabel } from "./logs.services";
import { AdditionalRule, Booking, ICommercialDTO, IResidentialDTO, SeasonalPricing, IShortletDTO, UnavailableDate, ICreateProperty, IPropertySpecificationDTO, IBasePropertyDTO, PropertySearchDto } from "../validations/interfaces/properties.interface";
import { PropertyListingDTO } from "../landlord/validations/interfaces/propsSettings"
import LandlordSettingsService from "../landlord/services/propertySetting.service";
import { resolveFinancialRules } from "../utils/globalSettings.util";
import { ListingNormalizer, NormalizedListing } from "../utils/ListingNormalizer";
import { getCurrencyConversionRate, resolveCurrencyFromRegion } from "../utils/helpers";
import { ConflictError, NotFoundError } from "./error.service";
import { resolveCommercialLeaseTerm } from "../utils/commercialLeaseTerm";

const decimalToNumber = (value?: Prisma.Decimal | null): number | undefined =>
    value ? value.toNumber() : undefined;

type PropertyWithSpecification = Prisma.propertiesGetPayload<{
    include: any;
}>;

type FlattenedProperty = Record<string, any>;

import { buildLocationGroupKey } from '../utils/locationGroupKey';
import {
    buildListedPropertyOrderBy,
    buildListedPropertyWhereClause,
    ListedPropertySearchFilters,
} from '../utils/listedPropertySearch';
import {
    enrichListedPropertySearchFilters,
    syncPropertyLocationFromCoordinates,
} from '../utils/geoLocation';
import {
    ensureNearbyPlacesCacheFresh,
    refreshNearbyPlacesCache,
} from './nearbyPlacesCache.service';

type PropertyFilters = ListedPropertySearchFilters;

interface CurrencyDisplayOptions {
    currency?: string | null;
    countryCode?: string | null;
    country?: string | null;
    ipAddress?: string | null;
}

interface CurrencyDisplayContext {
    country_code: string | null;
    locationCurrency: string | null;
}

class PropertyService {

    landlordInclusion: any
    propsInclusion: any
    likedPropertyInclude: any
    specificationInclusion: any

    constructor() {

        this.specificationInclusion = {
            include: {
                residential: {
                    include: {
                        unitConfigurations: true,
                        sharedFacilities: true,
                        roomDetails: true,
                        billsSubCategory: true,
                    }
                },
                commercial: {
                    include: {
                        floorAvailability: true,
                        unitConfigurations: true,
                        suitableFor: true,
                        roomDetails: true,
                        sharedFacilities: true,
                    }
                },
                shortlet: {
                    include: {
                        bookings: true,
                        seasonalPricing: true,
                        unavailableDates: true,
                        additionalRules: true,
                        hostLanguages: true,
                        roomDetails: true,
                        sharedFacilities: true,
                    }
                },
            }
        }
        this.landlordInclusion = {
            include: {
                user: {
                    select: {
                        email: true,
                        id: true,
                        profile: {
                            select: {
                                id: true,
                                fullname: true,
                                firstName: true,
                                lastName: true,
                                middleName: true,
                                profileUrl: true,
                            },
                        },
                    },
                },
            },
        }
        this.propsInclusion = {
            propertyListingHistory: true,
            state: true,
            images: true,
            videos: true,
            virtualTours: true,
            propertyDocument: true,
            complianceRecords: { where: { isDeleted: false }, orderBy: { certType: 'asc' } },
            insurancePolicies: { where: { isDeleted: false }, orderBy: { renewalDate: 'asc' } },
            utilityAccounts: { where: { isDeleted: false }, orderBy: { utilityType: 'asc' } },
            ownershipProfile: true,
            application: true,
            reviews: true,
            UserLikedProperty: true,
            landlord: this.landlordInclusion,
            specification: this.specificationInclusion
        }
        /** Lighter include for saved/liked properties — avoids stale Prisma relation issues. */
        this.likedPropertyInclude = {
            state: true,
            images: true,
            landlord: {
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            profile: {
                                select: {
                                    fullname: true,
                                    firstName: true,
                                    lastName: true,
                                    profileUrl: true,
                                },
                            },
                        },
                    },
                },
            },
            specification: {
                where: { isActive: true },
                take: 1,
                include: { residential: true },
            },
        }
    }

    getProperties = async () => {
        return await prismaClient.properties.findMany({
            where: { isDeleted: false },
            include: {
                ...this.propsInclusion
            }
        })
    }

    getLandlordProperties = async (landlordId: string) => {
        const rawProperties = await prismaClient.properties.findMany({
            where: { isDeleted: false, landlordId },
            include: {
                ...this.propsInclusion
            }
        })///
        return rawProperties.map(p =>
            this.flatten(p)
        );
    }

    getPropertyOnUserPreference = async (userPreferenceTypes: PropertyType[], landlordId: string) => {
        return await prismaClient.properties.findMany({
            where: {
                availability: AvailabilityStatus.VACANT,
                propertyListingHistory: {
                    some: {
                        isActive: true,
                        onListing: true,
                        propertySubType: {
                            in: userPreferenceTypes,
                        },
                        property: {
                            landlordId
                        }
                    },
                },
            },
            include: {
                propertyListingHistory: true,
                state: true,
                landlord: true,
                images: true,
            },
        });
    }

    getPropertiesById = async (id: string) => {
        return await prismaClient.properties.findUnique({
            where: { id },
            include: {
                state: true,
                specification: this.specificationInclusion,
                agency: true,
                application: true,
                reviews: true,
                UserLikedProperty: true,
                landlord: this.landlordInclusion,
            }
        });
    }

    updatePropertyOld = async (id: string, data: any) => {
        return await prismaClient.properties.update({
            where: { id },
            data
        });
    }

 /**
   * Update property
   */
  async updateProperty(
    propertyId: string,
    data: any,
    uploadedFiles: any[] = [],
    userId?: string
  ) {
    const existingProperty = await prismaClient.properties.findUnique({
      where: { id: propertyId },
      select: {
        latitude: true,
        longitude: true,
        country: true,
        cachedNearbyPlacesFetchedAt: true,
      },
    });

    if (!existingProperty) {
      throw new Error('Property not found');
    }

    const result = await prismaClient.$transaction(async (tx) => {
      // Get existing property
      const propertyInTx = await tx.properties.findUnique({
        where: { id: propertyId },
        include: {
          specification: true
        }
      });

      if (!propertyInTx) {
        throw new Error('Property not found');
      }

      // Separate media by type
      const images = uploadedFiles?.filter(file => 
        file?.identifier === 'MediaTable' && file?.type === MediaType.IMAGE
      );
      const videos = uploadedFiles?.filter(file => 
        file?.identifier === 'MediaTable' && file?.type === MediaType.VIDEO
      );
      const virtualTours = uploadedFiles?.filter(file => 
        file?.identifier === 'MediaTable' && file?.type === MediaType.VIRTUAL_TOUR
      );
      const documents = uploadedFiles?.filter(file => 
        file?.identifier === 'DocTable'
      );

      // Prepare base property update data (virtualTourUrl is not a DB column; we handle it via virtualTours relation)
      const { 
        specificationType,
        propertySubType,
        otherTypeSpecific,
        commercial,
        shortlet,
        residential,
        updateUnitConfigurations,
        updateRoomDetails,
        deleteImages = [],
        deleteVideos = [],
        deleteVirtualTours = [],
        deleteDocuments = [],
        uploadedFiles: _,
        virtualTourUrl: virtualTourUrlRaw,
        ...propertyData 
      } = data;

      // Handle decimal fields
      if (propertyData.price) propertyData.price = new Prisma.Decimal(propertyData.price);
      if (propertyData.marketValue) propertyData.marketValue = new Prisma.Decimal(propertyData.marketValue);
      if (propertyData.propertyValue) propertyData.propertyValue = new Prisma.Decimal(propertyData.propertyValue);

      // Handle arrays
      if (propertyData.keyFeatures) propertyData.keyFeatures = { set: propertyData.keyFeatures };
      if (propertyData.customKeyFeatures) propertyData.customKeyFeatures = { set: propertyData.customKeyFeatures };
      if (propertyData.nearbyAmenities) propertyData.nearbyAmenities = { set: propertyData.nearbyAmenities };
      if (propertyData.customNearbyAmenities) propertyData.customNearbyAmenities = { set: propertyData.customNearbyAmenities };

      // Update main property
      const updatedProperty = await tx.properties.update({
        where: { id: propertyId },
        data: {
          ...propertyData,
          // Media handling
          images: {
            deleteMany: deleteImages.length > 0 ? { id: { in: deleteImages } } : undefined,
            create: images?.map(img => ({
              type: img.type,
              size: img.size,
              fileType: img.fileType,
              url: img.url,
              isPrimary: img.isPrimary,
              caption: img.caption,
            }))
          },
          videos: {
            deleteMany: deleteVideos.length > 0 ? { id: { in: deleteVideos } } : undefined,
            create: videos?.map(vid => ({
              type: vid.type,
              size: vid.size,
              fileType: vid.fileType,
              url: vid.url,
              isPrimary: vid.isPrimary,
              caption: vid.caption,
            }))
          },
          virtualTours: (() => {
            // Virtual tour URL: replace all virtual tours with one record from this link (or remove if empty)
            const vtUrl = typeof virtualTourUrlRaw === 'string' ? virtualTourUrlRaw.trim() : '';
            if (vtUrl && (vtUrl.startsWith('http://') || vtUrl.startsWith('https://'))) {
              return {
                deleteMany: {},
                create: [{
                  type: MediaType.VIRTUAL_TOUR,
                  url: vtUrl,
                  fileType: 'virtual-tour/link',
                  isPrimary: false,
                  caption: null,
                }],
              };
            }
            return {
              deleteMany: deleteVirtualTours.length > 0 ? { id: { in: deleteVirtualTours } } : undefined,
              create: virtualTours?.map((vt: any) => ({
                type: vt.type,
                fileType: vt.fileType,
                url: vt.url,
                isPrimary: vt.isPrimary,
                caption: vt.caption,
              }))
            };
          })(),
          propertyDocument: {
            deleteMany: deleteDocuments.length > 0 ? { id: { in: deleteDocuments } } : undefined,
            create: documents?.map(doc => ({
              documentName: doc?.documentName,
              documentUrl: doc?.url || doc?.documentUrl,
              size: doc?.size,
              type: doc?.type,
              ...(doc?.docType && { docType: doc?.docType }),
              ...(doc?.idType && { idType: doc?.idType }),
              uploadedBy: userId
            }))
          }
        }
      });

      await syncPropertyLocationFromCoordinates(
        tx,
        propertyId,
        updatedProperty.latitude,
        updatedProperty.longitude
      );

      // Handle specification update if provided
      if (specificationType || propertySubType || otherTypeSpecific || commercial || shortlet || residential) {
        await this.updatePropertySpecs(
          propertyInTx,
          {
            specificationType,
            propertySubType,
            otherTypeSpecific,
            commercial,
            shortlet,
            residential
          },
          tx
        );
      }

      // Handle unit configurations updates
      if (updateUnitConfigurations) {
        await this.handleUnitConfigurationUpdates(propertyId, updateUnitConfigurations, tx);
      }

      // Handle room details updates
      if (updateRoomDetails) {
        await this.handleRoomDetailUpdates(propertyId, updateRoomDetails, tx);
      }

      // Return full updated property
      return tx.properties.findUnique({
        where: { id: propertyId },
        include: {
          specification: this.specificationInclusion,
          images: true,
          videos: true,
          virtualTours: true,
          propertyDocument: true,
          state: true,
          landlord: true
        }
      });
    }, {
      maxWait: 30000,
      timeout: 30000
    });

    if (result) {
      const lat =
        result.latitude != null ? Number(result.latitude) : null;
      const lng =
        result.longitude != null ? Number(result.longitude) : null;

      if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
        const prevLat =
          existingProperty.latitude != null
            ? Number(existingProperty.latitude)
            : null;
        const prevLng =
          existingProperty.longitude != null
            ? Number(existingProperty.longitude)
            : null;
        const coordsChanged =
          data.latitude != null &&
          data.longitude != null &&
          (prevLat !== lat || prevLng !== lng);

        if (coordsChanged) {
          void refreshNearbyPlacesCache(
            propertyId,
            lat,
            lng,
            result.country || existingProperty.country || ""
          ).catch(() => undefined);
        } else {
          ensureNearbyPlacesCacheFresh(
            propertyId,
            lat,
            lng,
            result.country || existingProperty.country || "",
            result.cachedNearbyPlacesFetchedAt ?? existingProperty.cachedNearbyPlacesFetchedAt
          );
        }
      }
    }

    return result;
  }

  /**
   * Update property specification
   */
  private async updatePropertySpecs(
    existingProperty: any,
    specificationData: any,
    tx: Prisma.TransactionClient
  ) {
    const { 
      specificationType = existingProperty.specificationType,
      propertySubType,
      otherTypeSpecific,
      commercial,
      shortlet,
      residential 
    } = specificationData;

    // Get existing specification
    const existingSpec = await tx.propertySpecification.findFirst({
      where: { 
        propertyId: existingProperty.id,
        isActive: true 
      }
    });

    // Deactivate old specification if exists
    if (existingSpec) {
      await tx.propertySpecification.update({
        where: { id: existingSpec.id },
        data: { 
          isActive: false,
          toDate: new Date()
        }
      });
    }

    // Create new specification
    let specificationId: string | undefined;
    
    switch (specificationType) {
      case PropertySpecificationType.RESIDENTIAL:
        const residentialSpec = await this.updateResidentialProps(
          existingProperty.id,
          residential,
          tx
        );
        specificationId = residentialSpec.id;
        break;
        
      case PropertySpecificationType.COMMERCIAL:
        const commercialSpec = await this.updateCommercialProps(
          existingProperty.id,
          commercial,
          tx
        );
        specificationId = commercialSpec.id;
        break;
        
      case PropertySpecificationType.SHORTLET:
        const shortletSpec = await this.updateShortletProps(
          existingProperty.id,
          shortlet,
          tx
        );
        specificationId = shortletSpec.id;
        break;
    }

    // Create new property specification record
    return tx.propertySpecification.create({
      data: {
        propertyId: existingProperty.id,
        specificationType,
        propertySubType,
        otherTypeSpecific,
        ...(specificationType === PropertySpecificationType.RESIDENTIAL && { residentialId: specificationId }),
        ...(specificationType === PropertySpecificationType.COMMERCIAL && { commercialId: specificationId }),
        ...(specificationType === PropertySpecificationType.SHORTLET && { shortletId: specificationId }),
        isActive: true,
        fromDate: new Date()
      }
    });
  }

  /**
   * Update residential property
   */
  private buildResidentialPrismaData(data: any) {
    const {
      safetyFeatures,
      coolingTypes,
      heatingTypes,
      customSafetyFeatures,
      buildingAmenityFeatures,
      outdoorsSpacesFeatures,
      otherSharedFacilities,
      roomDetails,
      unitConfigurations,
      sharedFacilities,
      PropertySpecification,
      bills,
      ...rest
    } = data;

    const out: any = {
      ...rest,
      safetyFeatures: Array.isArray(safetyFeatures)
        ? { set: safetyFeatures }
        : undefined,
      customSafetyFeatures: Array.isArray(customSafetyFeatures)
        ? { set: customSafetyFeatures }
        : undefined,
      coolingTypes: Array.isArray(coolingTypes) ? { set: coolingTypes } : undefined,
      heatingTypes: Array.isArray(heatingTypes) ? { set: heatingTypes } : undefined,
      buildingAmenityFeatures: Array.isArray(buildingAmenityFeatures)
        ? { set: buildingAmenityFeatures }
        : undefined,
      outdoorsSpacesFeatures: Array.isArray(outdoorsSpacesFeatures)
        ? { set: outdoorsSpacesFeatures }
        : undefined,
      otherSharedFacilities: Array.isArray(otherSharedFacilities)
        ? { set: otherSharedFacilities }
        : undefined,
    };

    if (Array.isArray(roomDetails)) {
      out.roomDetails = {
        deleteMany: {},
        create: roomDetails.flatMap((room: any) =>
          Array.from({ length: room.count || 1 }, () => ({
            roomName: room.roomName,
            roomSize: room.roomSize,
            count: room.count,
            ensuite: room.ensuite,
            furnished: room.furnished,
            price: room.price,
            description: room?.description,
            priceFrequency: room.priceFrequency,
          }))
        ),
      };
    }

    if (sharedFacilities != null && typeof sharedFacilities === 'object') {
      out.sharedFacilities = {
        deleteMany: {},
        create: [
          {
            kitchen: sharedFacilities.kitchen ?? false,
            bathroom: sharedFacilities.bathroom ?? false,
            livingRoom: sharedFacilities.livingRoom ?? false,
            garden: sharedFacilities.garden ?? false,
            garage: sharedFacilities.garage ?? false,
            laundry: sharedFacilities.laundry ?? false,
            parking: sharedFacilities.parking ?? false,
            other: sharedFacilities.other || '',
          },
        ],
      };
    }

    if (Array.isArray(unitConfigurations)) {
      out.unitConfigurations = {
        deleteMany: {},
        create: unitConfigurations.flatMap((unit: any) =>
          Array.from({ length: unit.count || 1 }, (_, i) => ({
            unitType: unit.unitType,
            unitNumber: unit.unitNumber
              ? `${unit.unitNumber}${i + 1}`
              : String(i + 1),
            floorNumber: unit.floorNumber,
            bedrooms: unit.bedrooms,
            bathrooms: unit.bathrooms,
            kitchens: unit.kitchens,
            furnished: unit.furnished,
            ensuite: unit.ensuite,
            count: unit.count,
            price: unit.price,
            priceFrequency: unit.priceFrequency,
            area: unit.area,
            description: unit.description,
            availability: unit.availability,
          }))
        ),
      };
    }

    return out;
  }

  private async updateResidentialProps(
    propertyId: string,
    residentialData: any,
    tx: Prisma.TransactionClient
  ) {
    // Get existing residential property
    const existingSpec = await tx.propertySpecification.findFirst({
      where: { 
        propertyId,
        isActive: true,
        specificationType: PropertySpecificationType.RESIDENTIAL
      },
      include: { residential: true }
    });

    if (!existingSpec?.residential) {
      const prismaData = this.buildResidentialPrismaData(residentialData);
      return tx.residentialProperty.create({
        data: {
          ...prismaData,
          PropertySpecification: {
            create: {
              propertyId,
              specificationType: PropertySpecificationType.RESIDENTIAL,
              isActive: true,
              fromDate: new Date()
            }
          }
        }
      });
    }

    const prismaData = this.buildResidentialPrismaData(residentialData);

    // Update existing residential property
    return tx.residentialProperty.update({
      where: { id: existingSpec.residential.id },
      data: prismaData
    });
  }

  /**
   * Build Prisma-friendly commercial update/create data (scalars + nested relations).
   * Nested relations are only included when provided, so partial updates don't wipe existing data.
   */
  private buildCommercialPrismaData(data: any) {
    const {
      safetyFeatures,
      coolingTypes,
      heatingTypes,
      customSafetyFeatures,
      securityFeatures,
      otherSharedFacilities,
      floorAvailability,
      roomDetails,
      unitConfigurations,
      suitableFor,
      PropertySpecification,
      sharedFacilities,
      ...rest
    } = data;

    const out: any = {
      ...rest,
      securityFeatures: Array.isArray(securityFeatures) ? { set: securityFeatures } : undefined,
      safetyFeatures: Array.isArray(safetyFeatures) ? { set: safetyFeatures } : undefined,
      customSafetyFeatures: Array.isArray(customSafetyFeatures) ? { set: customSafetyFeatures } : undefined,
      coolingTypes: Array.isArray(coolingTypes) ? { set: coolingTypes } : undefined,
      heatingTypes: Array.isArray(heatingTypes) ? { set: heatingTypes } : undefined,
      otherSharedFacilities: Array.isArray(otherSharedFacilities) ? { set: otherSharedFacilities } : undefined,
      leaseTermUnit: rest.leaseTermUnit || "YEARS",
      minimumLeaseTerm: rest.minimumLeaseTerm ?? 12,
      leaseTerm: resolveCommercialLeaseTerm({
        leaseTerm: rest.leaseTerm,
        minimumLeaseTerm: rest.minimumLeaseTerm ?? 12,
        maximumLeaseTerm: rest.maximumLeaseTerm,
        leaseTermUnit: rest.leaseTermUnit || "YEARS",
      }),
    };

    for (const key of [
      "buildingClass",
      "officeLayout",
      "occupantsDetails",
      "rentFreePeriod",
      "zoning",
      "powerSupply",
      "epcRating",
      "greenCertificationType",
      "greenCertificationLevel",
    ] as const) {
      if (out[key] === "" || out[key] == null) delete out[key];
    }

    if (Array.isArray(floorAvailability)) {
      out.floorAvailability = {
        deleteMany: {},
        create: floorAvailability.map((floor: any) => ({
          floorNumber: floor.floorNumber,
          area: floor.area,
          price: floor.price,
          available: floor.available,
          partialFloor: floor.partialFloor,
          description: floor.description,
          amenities: floor?.amenities?.length ? { set: floor.amenities } : undefined,
        })),
      };
    }
    if (Array.isArray(roomDetails)) {
      out.roomDetails = {
        deleteMany: {},
        create: roomDetails.map((room: any) => ({
          roomName: room.roomName,
          roomSize: room.roomSize,
          ensuite: room.ensuite,
          price: room.price,
          description: room?.description,
          furnished: room.furnished,
        })),
      };
    }
    if (sharedFacilities != null && typeof sharedFacilities === "object") {
      out.sharedFacilities = {
        deleteMany: {},
        create: [{
          kitchen: sharedFacilities.kitchen ?? false,
          bathroom: sharedFacilities.bathroom ?? false,
          livingRoom: sharedFacilities.livingRoom ?? false,
          garden: sharedFacilities.garden ?? false,
          garage: sharedFacilities.garage ?? false,
          laundry: sharedFacilities.laundry ?? false,
          parking: sharedFacilities.parking ?? false,
          other: sharedFacilities.other || "",
        }],
      };
    }
    if (Array.isArray(suitableFor)) {
      out.suitableFor = { deleteMany: {}, create: suitableFor.map((name: string) => ({ name })) };
    }
    if (Array.isArray(unitConfigurations)) {
      out.unitConfigurations = {
        deleteMany: {},
        create: unitConfigurations.map((unit: any) => ({
          unitType: unit.unitType,
          unitNumber: unit.unitNumber,
          floorNumber: unit.floorNumber,
          count: unit.count,
          bedrooms: unit.bedrooms,
          bathrooms: unit.bathrooms,
          kitchens: unit.kitchens,
          furnished: unit.furnished,
          ensuite: unit.ensuite,
          price: unit.price,
          area: unit.area,
          description: unit.description,
          availability: unit.availability,
        })),
      };
    }

    return out;
  }

  /**
   * Update commercial property
   */
  private async updateCommercialProps(
    propertyId: string,
    commercialData: any,
    tx: Prisma.TransactionClient
  ) {
    if (!commercialData || typeof commercialData !== "object") {
      throw new Error("Commercial update data is required");
    }

    const existingSpec = await tx.propertySpecification.findFirst({
      where: {
        propertyId,
        isActive: true,
        specificationType: PropertySpecificationType.COMMERCIAL,
      },
      include: { commercial: true },
    });

    const prismaData = this.buildCommercialPrismaData(commercialData);

    if (!existingSpec?.commercial) {
      return tx.commercialProperty.create({
        data: {
          ...prismaData,
          PropertySpecification: {
            create: {
              propertyId,
              specificationType: PropertySpecificationType.COMMERCIAL,
              isActive: true,
              fromDate: new Date(),
            },
          },
        },
      });
    }

    return tx.commercialProperty.update({
      where: { id: existingSpec.commercial.id },
      data: prismaData,
    });
  }

  /**
   * Update shortlet property
   */
  private async updateShortletProps(
    propertyId: string,
    shortletData: any,
    tx: Prisma.TransactionClient
  ) {
    // Get existing shortlet property
    const existingSpec = await tx.propertySpecification.findFirst({
      where: { 
        propertyId,
        isActive: true,
        specificationType: PropertySpecificationType.SHORTLET
      },
      include: { shortlet: true }
    });

    if (!existingSpec?.shortlet) {
      // Create new shortlet property
      return tx.shortletProperty.create({
        data: {
          ...shortletData,
          PropertySpecification: {
            create: {
              propertyId,
              specificationType: PropertySpecificationType.SHORTLET,
              isActive: true,
              fromDate: new Date()
            }
          }
        }
      });
    }

    // Update existing shortlet property
    return tx.shortletProperty.update({
      where: { id: existingSpec.shortlet.id },
      data: shortletData
    });
  }

  /**
   * Handle unit configuration updates
   */
  private async handleUnitConfigurationUpdates(
    propertyId: string,
    updates: Array<{ id?: string; action: string; data: any }>,
    tx: Prisma.TransactionClient
  ) {
    for (const update of updates) {
      switch (update.action) {
        case 'create':
          await tx.unitConfiguration.create({
            data: {
              ...update.data,
              residentialPropertyId: update.data.residentialPropertyId || propertyId,
              commercialPropertyId: update.data.commercialPropertyId
            }
          });
          break;
          
        case 'update':
          if (!update.id) {
            throw new Error('Unit configuration ID is required for update');
          }
          await tx.unitConfiguration.update({
            where: { id: update.id },
            data: update.data
          });
          break;
          
        case 'delete':
          if (!update.id) {
            throw new Error('Unit configuration ID is required for delete');
          }
          await tx.unitConfiguration.update({
            where: { id: update.id },
            data: { isDeleted: true }
          });
          break;
      }
    }
  }

  /**
   * Handle room detail updates
   */
  private async handleRoomDetailUpdates(
    propertyId: string,
    updates: Array<{ id?: string; action: string; data: any }>,
    tx: Prisma.TransactionClient
  ) {
    for (const update of updates) {
      switch (update.action) {
        case 'create':
          await tx.roomDetail.create({
            data: {
              ...update.data,
              residentialPropertyId: update.data.residentialPropertyId || propertyId,
              commercialPropertyId: update.data.commercialPropertyId,
              shortletPropertyId: update.data.shortletPropertyId
            }
          });
          break;
          
        case 'update':
          if (!update.id) {
            throw new Error('Room detail ID is required for update');
          }
          await tx.roomDetail.update({
            where: { id: update.id },
            data: update.data
          });
          break;
          
        case 'delete':
          if (!update.id) {
            throw new Error('Room detail ID is required for delete');
          }
          await tx.roomDetail.update({
            where: { id: update.id },
            data: { isDeleted: true }
          });
          break;
      }
    }
  }

  /**
   * Partial update property
   */
  async partialUpdateProperty(
    propertyId: string,
    data: any,
    uploadedFiles: any[] = [],
    userId?: string
  ) {
    return prismaClient.$transaction(async (tx) => {
      // Get existing property
      const existingProperty = await tx.properties.findUnique({
        where: { id: propertyId }
      });

      if (!existingProperty) {
        throw new Error('Property not found');
      }

      // Prepare update data
      const updateData: any = {};

      // Handle basic fields
      const basicFields = [
        'name', 'description', 'propertySize', 'city', 'stateId', 'country',
        'zipcode', 'address', 'address2', 'latitude', 'longitude', 'currency',
        'price', 'marketValue', 'propertyValue', 'purchaseType', 'securityDeposit',
        'priceFrequency', 'rentalPeriod', 'availability', 'businessRateVerified',
        'postalCodeVerified', 'landRegistryNumber', 'vatStatus', 'isListed'
      ];

      for (const field of basicFields) {
        if (data[field] !== undefined) {
          if (field === 'price' || field === 'marketValue' || field === 'propertyValue') {
            updateData[field] = new Prisma.Decimal(data[field]);
          } else {
            updateData[field] = data[field];
          }
        }
      }

      // Handle array fields
      if (data.keyFeatures) updateData.keyFeatures = { set: data.keyFeatures };
      if (data.customKeyFeatures) updateData.customKeyFeatures = { set: data.customKeyFeatures };
      if (data.nearbyAmenities) updateData.nearbyAmenities = { set: data.nearbyAmenities };
      if (data.customNearbyAmenities) updateData.customNearbyAmenities = { set: data.customNearbyAmenities };
      if (data.amenityDistances !== undefined) updateData.amenityDistances = data.amenityDistances;

      // Handle media deletions
      if (data.deleteImages) {
        updateData.images = { deleteMany: { id: { in: data.deleteImages } } };
      }
      if (data.deleteVideos) {
        updateData.videos = { deleteMany: { id: { in: data.deleteVideos } } };
      }
      if (data.deleteVirtualTours) {
        updateData.virtualTours = { deleteMany: { id: { in: data.deleteVirtualTours } } };
      }
      // Virtual tour URL: replace all virtual tours with one record from this link (or remove if empty)
      if (data.virtualTourUrl !== undefined) {
        const vtUrl = typeof data.virtualTourUrl === 'string' ? data.virtualTourUrl.trim() : '';
        if (vtUrl && (vtUrl.startsWith('http://') || vtUrl.startsWith('https://'))) {
          updateData.virtualTours = {
            deleteMany: {},
            create: [{
              type: MediaType.VIRTUAL_TOUR,
              url: vtUrl,
              fileType: 'virtual-tour/link',
              isPrimary: false,
              caption: null,
            }],
          };
        } else {
          updateData.virtualTours = { deleteMany: {} };
        }
      }
      if (data.deleteDocuments) {
        updateData.propertyDocument = { deleteMany: { id: { in: data.deleteDocuments } } };
      }

      const availabilityChanging =
        data.availability !== undefined &&
        data.availability !== existingProperty.availability;
      const listingChanging =
        data.isListed !== undefined &&
        data.isListed !== existingProperty.isListed;

      // Update property
      await tx.properties.update({
        where: { id: propertyId },
        data: updateData
      });

      if (availabilityChanging) {
        const label = formatAvailabilityLabel(String(data.availability));
        try {
          await LogsServices.logPropertyStatusChange({
            propertyId,
            events: `Property marked as ${label}`,
            subjects: label,
            createdById: userId,
          });
        } catch {
          /* non-blocking */
        }
      }

      if (listingChanging) {
        try {
          await LogsServices.logPropertyStatusChange({
            propertyId,
            events: data.isListed
              ? 'Property listed for rent'
              : 'Property unlisted',
            subjects: data.isListed ? 'Listed' : 'Unlisted',
            createdById: userId,
          });
        } catch {
          /* non-blocking */
        }
      }

      // Handle new media uploads
      if (uploadedFiles.length > 0) {
        await this.addMediaToProperty(propertyId, uploadedFiles, userId, tx);
      }

      // Return updated property
      return tx.properties.findUnique({
        where: { id: propertyId },
        include: {
          specification: this.specificationInclusion,
          images: true,
          videos: true,
          virtualTours: true,
          propertyDocument: true
        }
      });
    });
  }

  /**
   * Add media to property
   */
  async addMediaToProperty(
    propertyId: string,
    uploadedFiles: any[],
    userId?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prismaClient;

    // Separate media by type
    const images = uploadedFiles.filter(file => 
      file?.identifier === 'MediaTable' && file?.type === MediaType.IMAGE
    );
    const videos = uploadedFiles.filter(file => 
      file?.identifier === 'MediaTable' && file?.type === MediaType.VIDEO
    );
    const virtualTours = uploadedFiles.filter(file => 
      file?.identifier === 'MediaTable' && file?.type === MediaType.VIRTUAL_TOUR
    );
    const documents = uploadedFiles.filter(file => 
      file?.identifier === 'DocTable'
    );

    // Add media
    if (images.length > 0) {
      await client.propertyMediaFiles.createMany({
        data: images.map(img => ({
          type: img.type,
          size: img.size,
          fileType: img.fileType,
          url: img.url,
          isPrimary: img.isPrimary,
          caption: img.caption,
          imagePropertyId: propertyId
        }))
      });
    }

    if (videos.length > 0) {
      await client.propertyMediaFiles.createMany({
        data: videos.map(vid => ({
          type: vid.type,
          size: vid.size,
          fileType: vid.fileType,
          url: vid.url,
          isPrimary: vid.isPrimary,
          caption: vid.caption,
          videoPropertyId: propertyId
        }))
      });
    }

    if (virtualTours.length > 0) {
      await client.propertyMediaFiles.createMany({
        data: virtualTours.map(vt => ({
          type: vt.type,
          size: vt.size,
          fileType: vt.fileType,
          url: vt.url,
          isPrimary: vt.isPrimary,
          caption: vt.caption,
          virtualTourPropertyId: propertyId
        }))
      });
    }

    if (documents.length > 0) {
      await client.propertyDocument.createMany({
        data: documents.map(doc => ({
          documentName: doc?.documentName,
          documentUrl: doc?.url || doc?.documentUrl,
          size: doc?.size,
          type: doc?.type,
          ...(doc?.docType && { docType: doc?.docType }),
          ...(doc?.idType && { idType: doc?.idType }),
          propertyId,
          uploadedBy: userId
        }))
      });
    }

    // Return updated property
    return client.properties.findUnique({
      where: { id: propertyId },
      include: {
        images: true,
        videos: true,
        virtualTours: true,
        propertyDocument: true
      }
    });
  }

  /**
   * Remove media from property
   */
  async removeMediaFromProperty(propertyId: string, mediaId: string) {
    // Try to delete from all media tables
    await prismaClient.propertyMediaFiles.deleteMany({
      where: {
        OR: [
          { id: mediaId, imagePropertyId: propertyId },
          { id: mediaId, videoPropertyId: propertyId },
          { id: mediaId, virtualTourPropertyId: propertyId }
        ]
      }
    });

    // Also try to delete from documents
    await prismaClient.propertyDocument.deleteMany({
      where: {
        id: mediaId,
        propertyId
      }
    });

    return this.getPropertyById(propertyId);
  }


    deleteProperty = async (landlordId: string, id: string) => {
        const property = await prismaClient.properties.findFirst({
            where: { id, landlordId, isDeleted: false },
        });

        if (!property) {
            throw new NotFoundError("Property not found");
        }

        const activeTenantCount = await prismaClient.tenants.count({
            where: {
                propertyId: id,
                landlordId,
                isCurrentLease: true,
            },
        });

        if (activeTenantCount > 0) {
            throw new ConflictError(
                "Cannot delete a property with active tenants. End or remove tenancies first."
            );
        }

        return await prismaClient.properties.update({
            where: { id, landlordId },
            data: { isDeleted: true, isListed: false },
            include: {
                ...this.propsInclusion,
            },
        });
    }
    updateAvailabiltyStatus = async (
        landlordId: string,
        id: string,
        availability: AvailabilityStatus,
        createdById?: string
    ) => {
        const existing = await prismaClient.properties.findFirst({
            where: { id, landlordId },
            select: { availability: true },
        });

        const property = await prismaClient.properties.update({
            where: { id, landlordId },
            data: { availability },
        });

        if (existing?.availability !== availability) {
            const label = formatAvailabilityLabel(availability);
            try {
                await LogsServices.logPropertyStatusChange({
                    propertyId: id,
                    events: `Property marked as ${label}`,
                    subjects: label,
                    createdById,
                });
            } catch {
                /* non-blocking */
            }
        }

        return property;
    }

    flatten = (property: PropertyWithSpecification): FlattenedProperty => {
        const specifications = property.specification as Array<
            Prisma.PropertySpecificationGetPayload<{
                include: typeof this.specificationInclusion.include;
            }>
        >;

        const activeSpec = specifications.find(spec => spec.isActive);

        const specificDetails =
            (activeSpec?.residential ??
                activeSpec?.commercial ??
                activeSpec?.shortlet ??
                {}) as Record<string, any>;

        // Residential/commercial/shortlet rows have their own `id` — never expose those as property.id
        return {
            ...property,
            ...activeSpec,
            ...specificDetails,
            id: property.id,
            propertyId: property.id,
            specificationRecordId: activeSpec?.id,
        };
    }

    // Function to aggregate properties by state for the current landlord
    aggregatePropertiesByState = async (landlordId: string) => {
        const groupedProperties = await prismaClient.properties.groupBy({
            by: ['stateId'],
            where: {
                landlordId,
                isDeleted: false,
            },
        });

        const propertiesByState: { [key: string]: any[] } = {};
        const stateCountryByKey: { [key: string]: string | null } = {};
        const stateNameByKey: { [key: string]: string } = {};
        const stateIdByKey: { [key: string]: string } = {};

        for (const group of groupedProperties) {
            const stateId = group.stateId;
            if (!stateId) continue;

            const state = await prismaClient.state.findUnique({ where: { id: stateId } });
            if (!state || state.isDeleted) continue;

            const rawProperties = await prismaClient.properties.findMany({
                where: { stateId, landlordId, isDeleted: false },
                include: this.propsInclusion,
            });

            const flattened = rawProperties.map(p =>
                this.flatten(p)
            );

            const key = buildLocationGroupKey(state.name ?? '', state.country);
            if (!key) continue;

            if (key in propertiesByState) {
                propertiesByState[key] = [...propertiesByState[key], ...flattened];
                const existingStateId = stateIdByKey[key];
                const existingState = existingStateId
                    ? await prismaClient.state.findUnique({ where: { id: existingStateId } })
                    : null;
                const preferCurrent =
                    state.createdByLandlordId === landlordId &&
                    existingState?.createdByLandlordId !== landlordId;
                if (preferCurrent) {
                    stateIdByKey[key] = stateId;
                    stateCountryByKey[key] = state.country ?? null;
                    stateNameByKey[key] = state.name ?? '';
                }
            } else {
                propertiesByState[key] = flattened;
                stateCountryByKey[key] = state.country ?? null;
                stateNameByKey[key] = state.name ?? '';
                stateIdByKey[key] = stateId;
            }
        }

        // Also include states the landlord explicitly created but that have no
        // properties yet – these should remain visible so they can add/import
        // properties into them later.
        const emptyLandlordStates = await prismaClient.state.findMany({
            where: {
                createdByLandlordId: landlordId,
                isDeleted: false,
            },
        });

        for (const state of emptyLandlordStates) {
            const key = buildLocationGroupKey(state.name ?? '', state.country);
            if (!key) continue;
            if (!(key in propertiesByState)) {
                propertiesByState[key] = [];
                stateCountryByKey[key] = state.country ?? null;
                stateNameByKey[key] = state.name ?? '';
                stateIdByKey[key] = state.id;
            }
        }

        return {
            propertiesGrouped: propertiesByState,
            stateCountryByKey,
            stateNameByKey,
            stateIdByKey,
        };
    };



    // Function to aggregate properties by state for the current landlord
    getPropertiesByLandlord = async (landlordId: string) => {
        const unGroundProps: Prisma.propertiesGetPayload<{
            include: typeof this.propsInclusion;
        }>[] = await prismaClient.properties.findMany({
            where: {
                landlordId,
                isDeleted: false,
            },
            include: this.propsInclusion,
        });

        return unGroundProps.map(p =>
            this.flatten(p)
        );

        // const fullDetailsList = unGroundProps.map(property => {
        //     // Narrow the type of specification
        //     const specifications = property.specification as Array<
        //         Prisma.PropertySpecificationGetPayload<{
        //             include: typeof this.specificationInclusion.include;
        //         }>
        //     >;

        //     const activeSpec = specifications.find(spec => spec.isActive);

        //     const specificDetails =
        //         (activeSpec?.residential ?? activeSpec?.commercial ?? activeSpec?.shortlet ?? {}) as Record<string, any>;

        //     return {
        //         ...property,
        //         ...activeSpec,
        //         ...specificDetails,
        //     };
        // });

        // return fullDetailsList;
    };


    // Function to aggregate properties by state for the current landlord
    getPropertiesByState = async () => {
        try {
            // Group properties by state for the current landlord
            const groupedProperties = await prismaClient.properties.groupBy({
                by: ['stateId'], // Group by stateId instead of state name
                where: {
                    // landlordId: landlordId, 
                    isDeleted: false, // Exclude deleted properties
                },

            });

            // Object to store the grouped properties by state
            const propertiesByState: { [key: string]: any[] } = {};

            // Loop through each state group and fetch properties with apartments for that state
            for (const group of groupedProperties) {
                const stateId = group.stateId;

                if (!stateId) continue; // Skip if stateId is null or undefined

                // Fetch the state details
                const state = await prismaClient.state.findUnique({
                    where: { id: stateId },
                });

                if (!state) continue; // Skip if state is not found

                // Fetch properties belonging to the current state and landlord, including apartments
                const properties = await prismaClient.properties.findMany({
                    where: {
                        stateId: stateId,
                        // landlordId: landlordId,
                        isDeleted: false, // Exclude deleted properties
                    },
                    include: {
                        ...this.propsInclusion
                    },
                });

                // Store the properties in the result object under the respective state name
                propertiesByState[state.name.toLowerCase()] = properties;
            }

            return propertiesByState;
        } catch (error) {
            console.error('Error in getPropertiesByState:', error);
            throw error; // or handle it as per your application's needs
        }
    }


    checkLandlordPropertyExist = async (landlordId: string, propertyId: string) => {

        const props = await prismaClient.properties.findFirst({
            where: {
                landlordId,
                id: propertyId
            },
            include: {
                ...this.propsInclusion
            },
        })
        return this.flatten(props)
    }

    getPropertyExpenses = async (landlordId: string, propertyId: string) => {
        return await prismaClient.maintenance.findMany({
            where: {
                landlordId,
                propertyId,
            }
        })
    }

    getPropertyGlobalFees = async (landlordId: string, _settingType?: PropsSettingType) => {
        const settings = await prismaClient.settings.findFirst({
            where: { landlordId, isDeleted: false },
        });
        if (!settings) return null;

        return {
            applicationFee: settings.applicationFeePercentage,
            depositPercentage: settings.depositPercentage,
            lateFeePercentage: settings.lateFeePercentage,
            lateFeeFrequency: settings.lateFeeFrequency,
            gracePeriodDays: settings.lateFeeGracePeriod,
            refundPolicy: settings.refundPolicy,
            refundTimeframe: settings.refundTimeframe,
        };
    }
    // property listings
    getActiveOrInactivePropsListing = async (landlordId: string, isActive: boolean = true, availability: AvailabilityStatus = AvailabilityStatus.VACANT) => {
        const listings = await prismaClient.propertyListingHistory.findMany({
            where: {
                isActive,
                onListing: isActive,
                property: {
                    landlordId,
                    availability
                }
            },
            include: {
                property: {
                    include: {
                        ...this.propsInclusion,
                        state: true,
                        images: true,
                        videos: true,
                        landlord: this.landlordInclusion,
                        specification: {
                            include: {
                                residential: {
                                    include: {
                                        sharedFacilities: true
                                    }
                                },
                                commercial: true,
                                shortlet: true
                            }
                        }
                    }
                },
                unit: {
                    include: {
                        images: true,
                        RoomDetail: true
                    }
                },
                room: {
                    include: {
                        images: true
                    }
                }
            }
        });

        // Normalize all listings
        return ListingNormalizer.normalizeMany(listings);
    }

    /** Keys for entities already on the active (listed + vacant) tab */
    private entityListingKey = (
        propertyId: string,
        unitId?: string | null,
        roomId?: string | null
    ) => `${propertyId}:${unitId ?? ''}:${roomId ?? ''}`;

    private resolveVacancyStatus = (
        availability: AvailabilityStatus | string | null | undefined,
        fallback?: AvailabilityStatus | string | null | undefined
    ): 'VACANT' | 'OCCUPIED' | 'OTHER' => {
        const raw =
            availability != null && String(availability).trim() !== ''
                ? String(availability).trim().toUpperCase()
                : null;
        if (raw === 'VACANT') return 'VACANT';
        if (raw === 'OCCUPIED') return 'OCCUPIED';
        if (raw) return 'OTHER';
        const fb =
            fallback != null && String(fallback).trim() !== ''
                ? String(fallback).trim().toUpperCase()
                : null;
        if (fb === 'VACANT') return 'VACANT';
        if (fb === 'OCCUPIED') return 'OCCUPIED';
        return 'VACANT';
    };

    private isEntityVacant = (
        availability: AvailabilityStatus | string | null | undefined,
        fallback?: AvailabilityStatus | string | null | undefined
    ) => this.resolveVacancyStatus(availability, fallback) === 'VACANT';

    private async getActiveVacantListingKeys(landlordId: string): Promise<Set<string>> {
        const rows = await prismaClient.propertyListingHistory.findMany({
            where: {
                onListing: true,
                property: {
                    landlordId,
                    availability: AvailabilityStatus.VACANT,
                },
            },
            select: { propertyId: true, unitId: true, roomId: true },
        });
        return new Set(
            rows
                .filter((r) => r.propertyId)
                .map((r) => this.entityListingKey(r.propertyId!, r.unitId, r.roomId))
        );
    }

    private vacantUnlistedPropertyInclude() {
        return {
            specification: {
                include: {
                    residential: {
                        include: {
                            unitConfigurations: {
                                where: { isDeleted: false },
                                include: {
                                    RoomDetail: {
                                        where: { isDeleted: false },
                                        include: { images: true },
                                    },
                                    images: true,
                                },
                            },
                            sharedFacilities: true,
                        },
                    },
                    commercial: {
                        include: {
                            unitConfigurations: {
                                where: { isDeleted: false },
                                include: {
                                    RoomDetail: {
                                        where: { isDeleted: false },
                                        include: { images: true },
                                    },
                                    images: true,
                                },
                            },
                        },
                    },
                    shortlet: true,
                },
            },
            state: true,
            images: true,
            videos: true,
            landlord: this.landlordInclusion,
        };
    }

    private buildUnlistedVacantListingStub(
        property: any,
        type: ListingType,
        unit?: any,
        room?: any,
        activeSpec?: any
    ) {
        const price = room?.price ?? unit?.price ?? property.price ?? 0;
        return {
            id: `unlisted-${room?.id ?? unit?.id ?? property.id}`,
            type,
            onListing: false,
            isActive: false,
            createdAt: property.createdAt,
            price,
            priceFrequency:
                room?.priceFrequency ?? unit?.priceFrequency ?? property.priceFrequency ?? null,
            securityDeposit: property.securityDeposit ?? 0,
            applicationFeeAmount: null,
            payApplicationFee: false,
            availableFrom: null,
            availableTo: null,
            listAs: activeSpec?.specificationType ?? property.specificationType,
            property,
            unit: unit ?? null,
            room: room ?? null,
        };
    }

    /**
     * Vacant properties/units/rooms that are not actively listed (`onListing: false`).
     * Shown on the landlord "Inactive Listing" tab; listed vacant items use getPropertyListingDetails.
     */
    getInactiveListings = async (landlordId: string): Promise<NormalizedListing[]> => {
        const activeKeys = await this.getActiveVacantListingKeys(landlordId);

        const properties = await prismaClient.properties.findMany({
            where: {
                landlordId,
                isDeleted: false,
                OR: [
                    { availability: AvailabilityStatus.VACANT },
                    { availability: null },
                ],
            },
            include: this.vacantUnlistedPropertyInclude(),
        });

        const stubs: any[] = [];

        for (const property of properties) {
            if (!this.isEntityVacant(property.availability, AvailabilityStatus.VACANT)) {
                continue;
            }

            const activeSpec =
                property.specification?.find((s: { isActive?: boolean }) => s.isActive) ??
                property.specification?.[0];

            const resUnits = activeSpec?.residential?.unitConfigurations ?? [];
            const comUnits = activeSpec?.commercial?.unitConfigurations ?? [];
            const allUnits = [...resUnits, ...comUnits];

            if (allUnits.length === 0) {
                const key = this.entityListingKey(property.id);
                if (!activeKeys.has(key)) {
                    stubs.push(
                        this.buildUnlistedVacantListingStub(
                            property,
                            ListingType.ENTIRE_PROPERTY,
                            undefined,
                            undefined,
                            activeSpec
                        )
                    );
                }
                continue;
            }

            let addedUnitOrRoom = false;

            for (const unit of allUnits) {
                if (!this.isEntityVacant(unit.availability, property.availability)) {
                    continue;
                }

                const rooms = unit.RoomDetail ?? [];
                if (rooms.length > 0) {
                    for (const room of rooms) {
                        if (
                            !this.isEntityVacant(
                                room.availability,
                                unit.availability ?? property.availability
                            )
                        ) {
                            continue;
                        }
                        const roomKey = this.entityListingKey(property.id, unit.id, room.id);
                        if (!activeKeys.has(roomKey)) {
                            stubs.push(
                                this.buildUnlistedVacantListingStub(
                                    property,
                                    ListingType.ROOM,
                                    unit,
                                    room,
                                    activeSpec
                                )
                            );
                            addedUnitOrRoom = true;
                        }
                    }
                } else {
                    const unitKey = this.entityListingKey(property.id, unit.id);
                    if (!activeKeys.has(unitKey)) {
                        stubs.push(
                            this.buildUnlistedVacantListingStub(
                                property,
                                ListingType.SINGLE_UNIT,
                                unit,
                                undefined,
                                activeSpec
                            )
                        );
                        addedUnitOrRoom = true;
                    }
                }
            }

            if (!addedUnitOrRoom) {
                const key = this.entityListingKey(property.id);
                if (!activeKeys.has(key)) {
                    stubs.push(
                        this.buildUnlistedVacantListingStub(
                            property,
                            ListingType.ENTIRE_PROPERTY,
                            undefined,
                            undefined,
                            activeSpec
                        )
                    );
                }
            }
        }

        const normalized: NormalizedListing[] = [];
        for (const stub of stubs) {
            try {
                normalized.push(ListingNormalizer.normalize(stub));
            } catch (err) {
                console.warn(`Could not normalize vacant unlisted stub ${stub.id}:`, err);
            }
        }
        return normalized;
    };


    getPropertyListingDetails = async (landlordId: string) => {
        try {
            // Get all active listings for the landlord
            const listings = await prismaClient.propertyListingHistory.findMany({
                where: {
                    property: {
                        landlordId,
                        availability: AvailabilityStatus.VACANT
                    },
                    onListing: true,
                },
                include: {
                    property: {
                        include: {
                            specification: {
                                include: {
                                    residential: {
                                        include: {
                                            unitConfigurations: {
                                                include: {
                                                    RoomDetail: true
                                                }
                                            },
                                            sharedFacilities: true
                                        }
                                    },
                                    commercial: {
                                        include: {
                                            unitConfigurations: {
                                                include: {
                                                    RoomDetail: true
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            state: true,
                            images: true,
                            videos: true,
                            landlord: {
                                include: {
                                    user: {
                                        select: {
                                            email: true,
                                            profile: {
                                                select: {
                                                    fullname: true,
                                                    firstName: true,
                                                    lastName: true,
                                                    profileUrl: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    unit: {
                        include: {
                            RoomDetail: {
                                where: { isDeleted: false }
                            },
                            images: true
                        }
                    },
                    room: {
                        include: {
                            images: true
                        }
                    }
                }
            });

            if (!listings || listings.length === 0) {
                return []; // Return empty array instead of throwing error
            }

            // Normalize all listings
            // Process related listings sequentially to prevent connection pool exhaustion
            // Sequential processing ensures we don't open too many concurrent connections
            const normalizedListings: NormalizedListing[] = [];

            for (const listing of listings) {
                const normalized = ListingNormalizer.normalize(listing);

                // Get related listings sequentially (one at a time) to prevent connection exhaustion
                try {
                    normalized.relatedListings = await ListingNormalizer.getRelatedListings(
                        listing.propertyId!,
                        listing.id,
                        prismaClient
                    );
                } catch (error: any) {
                    // If connection pool is exhausted, skip related listings for this item
                    // The error is already handled in getRelatedListings, but add extra safety
                    console.warn(`Skipping related listings for listing ${listing.id} due to connection issue`);
                    normalized.relatedListings = {
                        units: [],
                        rooms: [],
                        totalCount: 0
                    };
                }

                normalizedListings.push(normalized);
            }

            return normalizedListings;
        } catch (error) {
            console.error('Error fetching property listings:', error);
            throw error;
        }
    }

    countListedProperties = async (filters: PropertyFilters = {}, availability: boolean = true) => {
        const resolvedFilters = await enrichListedPropertySearchFilters(
            filters,
            prismaClient
        );
        return await prismaClient.propertyListingHistory.count({
            where: buildListedPropertyWhereClause(resolvedFilters, availability),
        });
    };


    getAllListedProperties = async (filters: PropertyFilters = {}, skip: number = 0, take: number = 10, availability: boolean = true, currencyOptions?: CurrencyDisplayOptions) => {
        const resolvedFilters = await enrichListedPropertySearchFilters(
            filters,
            prismaClient
        );
        const properties = await prismaClient.propertyListingHistory.findMany({
            where: buildListedPropertyWhereClause(resolvedFilters, availability),
            orderBy: buildListedPropertyOrderBy(resolvedFilters.sort),
            include: {
                property: {
                    include: {
                        state: true,
                        application: true,
                        images: true,
                        videos: true,
                        virtualTours: true,
                        propertyDocument: true,
                        propertyListingHistory: true,
                        reviews: true,
                        UserLikedProperty: true,
                        landlord: this.landlordInclusion,
                        specification: {
                            include: {
                                residential: {
                                    include: {
                                        sharedFacilities: true
                                    }
                                },
                                commercial: true,
                                shortlet: true
                            }
                        },
                    },
                },
                unit: {
                    include: {
                        images: true,
                        RoomDetail: true
                    }
                },
                room: {
                    include: {
                        images: true
                    }
                },
            },
            skip,
            take,
        });
        // Normalize all properties using the ListingNormalizer
        // Process related listings sequentially to prevent connection pool exhaustion
        // Sequential processing ensures we don't open too many concurrent connections
        const normalizedProperties: NormalizedListing[] = [];
        const currencyContext = await this.resolveCurrencyDisplayContext(currencyOptions);

        for (const property of properties) {
            const normalized = ListingNormalizer.normalize(property);

            // Get related listings sequentially (one at a time) to prevent connection exhaustion
            try {
                normalized.relatedListings = await ListingNormalizer.getRelatedListings(
                    property.propertyId!,
                    property.id,
                    prismaClient
                );
            } catch (error: any) {
                // If connection pool is exhausted, skip related listings for this item
                // The error is already handled in getRelatedListings, but add extra safety
                console.warn(`Skipping related listings for property ${property.id} due to connection issue`);
                normalized.relatedListings = {
                    units: [],
                    rooms: [],
                    totalCount: 0
                };
            }

            normalizedProperties.push(await this.applyCurrencyDisplay(normalized, property.property?.currency, currencyContext));
        }

        return normalizedProperties;
    };

    private async resolveCurrencyDisplayContext(currencyOptions?: CurrencyDisplayOptions): Promise<CurrencyDisplayContext> {
        return resolveCurrencyFromRegion({
            currency: currencyOptions?.currency,
            countryCode: currencyOptions?.countryCode,
            country: currencyOptions?.country,
            ipAddress: currencyOptions?.ipAddress,
        });
    }

    private parsePrice(value: any): number | null {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    private formatConvertedAmount(value: number): string {
        return Number(value.toFixed(2)).toString();
    }

    private async applyCurrencyDisplay(
        listing: NormalizedListing,
        sourceCurrency?: string | null,
        currencyContext: CurrencyDisplayContext = { country_code: null, locationCurrency: null }
    ): Promise<NormalizedListing> {
        const originalCurrency = sourceCurrency ? String(sourceCurrency) : listing.property.currency || null;
        const displayCurrency = currencyContext.locationCurrency || originalCurrency;

        const enrichedListing: any = {
            ...listing,
            originalPrice: listing.price,
            originalCurrency,
            displayCurrency,
            currency: displayCurrency,
            currencyContext,
        };

        if (!originalCurrency || !displayCurrency || originalCurrency === displayCurrency) {
            enrichedListing.displayPrice = listing.price;
            enrichedListing.conversionRate = 1;
            return enrichedListing;
        }

        try {
            const rate = await getCurrencyConversionRate(originalCurrency, displayCurrency);
            const convert = (amount: string | null | undefined) => {
                const parsed = this.parsePrice(amount);
                return parsed === null ? amount : this.formatConvertedAmount(parsed * rate);
            };

            enrichedListing.price = convert(listing.price) || listing.price;
            enrichedListing.displayPrice = enrichedListing.price;
            enrichedListing.securityDeposit = convert(listing.securityDeposit) || listing.securityDeposit;
            enrichedListing.applicationFeeAmount = convert(listing.applicationFeeAmount);
            enrichedListing.conversionRate = rate;

            if (enrichedListing.listingEntity?.entityPrice) {
                enrichedListing.listingEntity = {
                    ...enrichedListing.listingEntity,
                    originalEntityPrice: enrichedListing.listingEntity.entityPrice,
                    entityPrice: convert(enrichedListing.listingEntity.entityPrice),
                    currency: displayCurrency,
                };
            }

            enrichedListing.relatedListings = {
                ...enrichedListing.relatedListings,
                units: enrichedListing.relatedListings.units.map((unit: any) => ({
                    ...unit,
                    originalPrice: unit.price,
                    price: convert(unit.price),
                    currency: displayCurrency,
                })),
                rooms: enrichedListing.relatedListings.rooms.map((room: any) => ({
                    ...room,
                    originalPrice: room.price,
                    price: convert(room.price),
                    currency: displayCurrency,
                })),
            };

            return enrichedListing;
        } catch (error) {
            console.error('Error converting listing currency:', error);
            enrichedListing.displayPrice = listing.price;
            enrichedListing.displayCurrency = originalCurrency;
            enrichedListing.currency = originalCurrency;
            enrichedListing.currencyConversionError = 'Currency conversion unavailable';
            return enrichedListing;
        }
    }

    // Build hierarchy information for a listing
    private buildHierarchy(property: any) {
        const breadcrumb = [];
        let context = '';
        let level: 'property' | 'unit' | 'room' = 'property';

        // Always start with property
        breadcrumb.push({
            id: property.property.id,
            name: property.property.name,
            type: 'property',
            url: `/property/${property.property.id}`
        });

        if (property.type === 'SINGLE_UNIT' && property.unit) {
            level = 'unit';
            breadcrumb.push({
                id: property.unit.id,
                name: `${property.unit.unitType} ${property.unit.unitNumber || ''}`.trim(),
                type: 'unit',
                url: `/property/${property.id}` // Current listing URL
            });
            context = `${property.unit.unitType} ${property.unit.unitNumber || ''} in ${property.property.name}`.trim();
        }

        if (property.type === 'ROOM' && property.room) {
            level = 'room';
            if (property.unit) {
                breadcrumb.push({
                    id: property.unit.id,
                    name: `${property.unit.unitType} ${property.unit.unitNumber || ''}`.trim(),
                    type: 'unit',
                    url: `/property/${property.unit.id}` // Would need unit listing URL
                });
            }
            breadcrumb.push({
                id: property.room.id,
                name: property.room.roomName,
                type: 'room',
                url: `/property/${property.id}` // Current listing URL
            });
            context = `${property.room.roomName} in ${property.unit ? `${property.unit.unitType} ${property.unit.unitNumber || ''}` : 'Unit'} in ${property.property.name}`.trim();
        }

        if (property.type === 'ENTIRE_PROPERTY') {
            context = property.property.name;
        }

        return {
            level,
            propertyId: property.property.id,
            unitId: property.unit?.id,
            roomId: property.room?.id,
            breadcrumb,
            context
        };
    }

    // Get related listings in the same property
    getRelatedListings = async (propertyId: string, excludeListingId: string) => {
        const related = await prismaClient.propertyListingHistory.findMany({
            where: {
                propertyId,
                id: { not: excludeListingId },
                onListing: true,
                isActive: true
            },
            include: {
                property: true,
                unit: true,
                room: true
            }
        });

        const units = related.filter(r => r.type === 'SINGLE_UNIT');
        const rooms = related.filter(r => r.type === 'ROOM');

        return {
            units: units.map(u => ({
                id: u.id,
                name: `${u.unit?.unitType} ${u.unit?.unitNumber || ''}`.trim(),
                price: Number(u.price) || 0,
                currency: u.property.currency || 'USD',
                url: `/property/${u.id}`
            })),
            rooms: rooms.map(r => ({
                id: r.id,
                name: r.room?.roomName || 'Room',
                price: Number(r.price) || 0,
                currency: r.property.currency || 'USD',
                url: `/property/${r.id}`
            })),
            totalCount: related.length
        };
    }

    getInactiveLandlordProperties = async (landlordId: string) => {

        // TODO: a single unit and room should have the whole information 
        /*
        {
         unit: {......},
         room: {...},
         property info,

        }
        */
        try {
            // First get properties that exist in listing history but are inactive
            const inactiveListings = await prismaClient.propertyListingHistory.findMany({
                where: {
                    property: { landlordId, isDeleted: false },
                    isActive: false,
                    onListing: false
                },
                include: {
                    property: true
                }
            });

            // Then get all properties that have NEVER been listed
            const neverListedProperties = await prismaClient.properties.findMany({
                where: {
                    landlordId,
                    isDeleted: false,
                    propertyListingHistory: { none: {} }
                }
            });

            // Combine both sets of properties
            const allInactiveProperties = [
                ...inactiveListings.map(listing => ({
                    ...listing,
                    isInListingHistory: true
                })),
                ...neverListedProperties.map(property => ({
                    property,
                    isInListingHistory: false,
                    isActive: false,
                    onListing: false,
                    type: null,
                    price: null,
                    priceFrequency: null
                }))
            ];

            if (!allInactiveProperties.length) {
                return [];
            }

            // Fetch complete data for all properties in a single query
            const enrichedProperties: Prisma.propertiesGetPayload<{
                include: typeof this.propsInclusion;
            }>[] = await prismaClient.properties.findMany({
                where: {
                    id: { in: allInactiveProperties.map(p => p.property.id) }
                },
                include: this.propsInclusion,
                // include: {

                //   images: true,
                //   specification: {
                //     include: {
                //       residential: true,
                //       commercial: true,
                //       shortlet: true
                //     }
                //   },
                //   propertyListingHistory: {
                //     where: {
                //       isActive: false,
                //       onListing: false
                //     },
                //     include: {
                //       unit: {
                //         include: {
                //           images: true
                //         }
                //       },
                //       room: {
                //         include: {
                //           images: true,
                //         }
                //       }
                //     }
                //   }
                // }
            });





            return enrichedProperties.map(p =>
                this.flatten(p)
            );
            // Transform the data for response
            //   return enrichedProperties.map(property => {
            //     // Find the most recent inactive listing (if exists)
            //     const listing = property.propertyListingHistory[0] || null;

            //     return {
            //       id: property.id,
            //       name: property.name,
            //       address: property.address,
            //       primaryImage: property.images[0] || null,
            //       status: listing ? 'PREVIOUSLY_LISTED' : 'NEVER_LISTED',
            //       lastListedDate: listing?.createdAt || null,
            //       specifications: property.specification.map(spec => ({
            //         type: spec.specificationType,
            //         details: {
            //           residential: spec.residential,
            //           commercial: spec.commercial,
            //           shortlet: spec.shortlet
            //         }
            //       })),
            //       listingDetails: listing ? {
            //         type: listing.type,
            //         price: listing.price,
            //         priceFrequency: listing.priceFrequency,
            //         unit: listing.unit ? {
            //           id: listing.unit.id,
            //           unitType: listing.unit.unitType,
            //           primaryImage: listing.unit.images[0] || null
            //         } : null,
            //         room: listing.room ? {
            //           id: listing.room.id,
            //           roomName: listing.room.roomName,
            //           primaryImage: listing.room.images[0] || null
            //         } : null
            //       } : null
            //     };
            //   });

        } catch (error) {
            console.error('Error fetching inactive properties:', error);
            throw new Error('Failed to fetch inactive properties');
        }
    }


    async createPropertyListing(data: PropertyListingDTO | any) {

        const {
            propertyId,
            unitId: unitIds = [],
            roomId: roomIds = [],
            type,
            createdById,
            ...baseData
        } = data;

        if (!baseData.availableFrom) {
            const residentialSpec = await prismaClient.propertySpecification.findFirst({
                where: {
                    propertyId,
                    isActive: true,
                    specificationType: PropertySpecificationType.RESIDENTIAL,
                },
                include: { residential: true },
            });
            if (residentialSpec?.residential?.availableFrom) {
                baseData.availableFrom = residentialSpec.residential.availableFrom;
            }
        }

        const propertyRecord = await prismaClient.properties.findUnique({
            where: { id: propertyId },
            select: { availability: true },
        });

        if (
            type === ListingType.ENTIRE_PROPERTY &&
            unitIds.length === 0 &&
            roomIds.length === 0 &&
            !this.isEntityVacant(propertyRecord?.availability)
        ) {
            throw new ConflictError(
                'This property is occupied and cannot be listed. Mark it as vacant first.'
            );
        }

        if (unitIds.length > 0) {
            const units = await prismaClient.unitConfiguration.findMany({
                where: { id: { in: unitIds.filter(Boolean) } },
                select: { id: true, availability: true },
            });
            const occupiedUnit = units.find(
                (unit) =>
                    !this.isEntityVacant(unit.availability, propertyRecord?.availability)
            );
            if (occupiedUnit) {
                throw new ConflictError(
                    'One or more units are occupied and cannot be listed.'
                );
            }
        }

        if (roomIds.length > 0) {
            const rooms = await prismaClient.roomDetail.findMany({
                where: { id: { in: roomIds.filter(Boolean) } },
                select: {
                    id: true,
                    availability: true,
                    unit: { select: { availability: true } },
                },
            });
            const occupiedRoom = rooms.find(
                (room) =>
                    !this.isEntityVacant(
                        room.availability,
                        room.unit?.availability ?? propertyRecord?.availability
                    )
            );
            if (occupiedRoom) {
                throw new ConflictError(
                    'One or more rooms are occupied and cannot be listed.'
                );
            }
        }

        const response = await prismaClient.$transaction(async (tx) => {
            const response: {
                success: boolean;
                message: string;
                listings: any[];
                alreadyListed: {
                    units: string[];
                    rooms: string[];
                    property?: boolean;
                };
                newlyListed: {
                    units: string[];
                    rooms: string[];
                    property?: boolean;
                };
            } = {
                success: true,
                message: '',
                listings: [],
                alreadyListed: { units: [], rooms: [] },
                newlyListed: { units: [], rooms: [] }
            };

            // Check for existing ENTIRE_PROPERTY listing (must match tenant search: onListing + isActive)
            if (type === ListingType.ENTIRE_PROPERTY && unitIds.length === 0 && roomIds.length === 0) {

                const existingActive = await tx.propertyListingHistory.findFirst({
                    where: {
                        propertyId,
                        type: ListingType.ENTIRE_PROPERTY,
                        onListing: true,
                        isActive: true,
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (existingActive) {
                    response.alreadyListed.property = true;
                    response.listings.push(existingActive);
                    response.message = 'Property is already listed as entire property';
                    return response;
                }

                const staleEntire = await tx.propertyListingHistory.findFirst({
                    where: {
                        propertyId,
                        type: ListingType.ENTIRE_PROPERTY,
                        onListing: true,
                        isActive: false,
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (staleEntire) {
                    const reactivated = await tx.propertyListingHistory.update({
                        where: { id: staleEntire.id },
                        data: {
                            ...baseData,
                            propertyId,
                            unitId: null,
                            roomId: null,
                            type: ListingType.ENTIRE_PROPERTY,
                            onListing: true,
                            isActive: true,
                            availableTo: null,
                        },
                    });
                    response.listings.push(reactivated);
                    response.newlyListed.property = true;
                    response.message = 'Property listing reactivated';
                    await tx.properties.update({
                        where: { id: propertyId },
                        data: { isListed: true },
                    });
                    return response;
                }
            }

            // Check unit listings
            for (const unitId of unitIds) {
                if (!unitId) continue;

                const existingActive = await tx.propertyListingHistory.findFirst({
                    where: {
                        unitId,
                        onListing: true,
                        isActive: true,
                    },
                    orderBy: { createdAt: "desc" }
                });

                if (existingActive) {
                    response.alreadyListed.units.push(unitId);
                    response.listings.push(existingActive);
                    continue;
                }

                const stale = await tx.propertyListingHistory.findFirst({
                    where: {
                        unitId,
                        onListing: true,
                        isActive: false,
                    },
                    orderBy: { createdAt: "desc" },
                });

                if (stale) {
                    const reactivated = await tx.propertyListingHistory.update({
                        where: { id: stale.id },
                        data: {
                            ...baseData,
                            propertyId,
                            unitId,
                            roomId: null,
                            type: ListingType.SINGLE_UNIT,
                            onListing: true,
                            isActive: true,
                            availableTo: null,
                        },
                    });
                    response.listings.push(reactivated);
                    response.newlyListed.units.push(unitId);
                    await tx.unitConfiguration.update({
                        where: { id: unitId },
                        data: { isListed: true },
                    });
                    await tx.properties.update({
                        where: { id: propertyId },
                        data: { isListed: true },
                    });
                    continue;
                }

                response.newlyListed.units.push(unitId);
            }

            // Check room listings
            for (const roomId of roomIds) {
                if (!roomId) continue;

                const existingActive = await tx.propertyListingHistory.findFirst({
                    where: {
                        roomId,
                        onListing: true,
                        isActive: true,
                    },
                    orderBy: { createdAt: "desc" },
                });

                if (existingActive) {
                    response.alreadyListed.rooms.push(roomId);
                    response.listings.push(existingActive);
                    continue;
                }

                const stale = await tx.propertyListingHistory.findFirst({
                    where: {
                        roomId,
                        onListing: true,
                        isActive: false,
                    },
                    orderBy: { createdAt: "desc" },
                });

                if (stale) {
                    const reactivated = await tx.propertyListingHistory.update({
                        where: { id: stale.id },
                        data: {
                            ...baseData,
                            propertyId,
                            roomId,
                            unitId: null,
                            type: ListingType.ROOM,
                            onListing: true,
                            isActive: true,
                            availableTo: null,
                        },
                    });
                    response.listings.push(reactivated);
                    response.newlyListed.rooms.push(roomId);
                    await tx.roomDetail.update({
                        where: { id: roomId },
                        data: { isListed: true },
                    });
                    await tx.properties.update({
                        where: { id: propertyId },
                        data: { isListed: true },
                    });
                    continue;
                }

                response.newlyListed.rooms.push(roomId);
            }

            // Create listings for new units (not reactivated above)
            const unitsToCreate = response.newlyListed.units.filter(
                (uid) => !response.listings.some((l) => l.unitId === uid)
            );
            for (const unitId of unitsToCreate) {
                const created = await tx.propertyListingHistory.create({
                    data: {
                        ...baseData,
                        propertyId: propertyId,
                        unitId: unitId,
                        roomId: null,
                        type: ListingType.SINGLE_UNIT
                    }
                });
                response.listings.push(created);
                await tx.unitConfiguration.update({
                    where: { id: unitId },
                    data: { isListed: true }
                });
                // Mark property as listed when any unit is listed
                await tx.properties.update({
                    where: { id: propertyId },
                    data: { isListed: true }
                });
            }

            // Create listings for new rooms (not reactivated above)
            const roomsToCreate = response.newlyListed.rooms.filter(
                (rid) => !response.listings.some((l) => l.roomId === rid)
            );
            for (const roomId of roomsToCreate) {
                const created = await tx.propertyListingHistory.create({
                    data: {
                        ...baseData,
                        propertyId: propertyId,
                        roomId: roomId,
                        unitId: null,
                        type: ListingType.ROOM
                    }
                });
                response.listings.push(created);
                await tx.roomDetail.update({
                    where: { id: roomId },
                    data: { isListed: true }
                });
                // Mark property as listed when any room is listed
                await tx.properties.update({
                    where: { id: propertyId },
                    data: { isListed: true }
                });
            }

            // Create ENTIRE_PROPERTY listing if applicable
            if (type === ListingType.ENTIRE_PROPERTY && unitIds.length === 0 && roomIds.length === 0) {
                const created = await tx.propertyListingHistory.create({
                    data: {
                        ...baseData,
                        propertyId: propertyId,
                        unitId: null,
                        roomId: null,
                        type: ListingType.ENTIRE_PROPERTY
                    }
                });
                response.listings.push(created);
                response.newlyListed.property = true;
                await tx.properties.update({
                    where: { id: propertyId },
                    data: { isListed: true }
                });
            }

            // Set appropriate message
            if (response.listings.length > 0) {
                const onlyAlready =
                    response.newlyListed.units.length === 0 &&
                    response.newlyListed.rooms.length === 0 &&
                    !response.newlyListed.property &&
                    (response.alreadyListed.units.length > 0 ||
                        response.alreadyListed.rooms.length > 0 ||
                        response.alreadyListed.property);

                if (onlyAlready && !response.message) {
                    response.message =
                        'All specified items are already live on the tenant site';
                } else if (!response.message) {
                    response.message = 'Successfully created listings for new items';
                    if (
                        response.alreadyListed.units.length > 0 ||
                        response.alreadyListed.rooms.length > 0
                    ) {
                        response.message += ', some items were already listed';
                    }
                }
                response.success = true;
            } else {
                response.message = 'No new listings created - all specified items were already listed';
                response.success = false;
            }

            if (createdById && response.listings.length > 0) {
                for (const listing of response.listings) {
                    if (!listing.propertyId) continue;
                    let event = 'Listed for rent';
                    if (listing.type === ListingType.ROOM) {
                        event = 'Room listed for rent';
                    } else if (listing.type === ListingType.SINGLE_UNIT) {
                        event = 'Unit listed for rent';
                    } else if (listing.type === ListingType.ENTIRE_PROPERTY) {
                        event = 'Property listed for rent';
                    }
                    try {
                        await LogsServices.logPropertyStatusChange({
                            propertyId: listing.propertyId,
                            events: event,
                            subjects: 'Listed',
                            createdById,
                            unitId: listing.unitId ?? undefined,
                            roomId: listing.roomId ?? undefined,
                        });
                    } catch {
                        /* non-blocking */
                    }
                }
            }

            return response;
        }, {
            maxWait: 30000,
            timeout: 30000
        });

        if (response.success && response.listings.length > 0 && baseData.payApplicationFee) {
            const property = await prismaClient.properties.findUnique({
                where: { id: propertyId },
                select: { landlordId: true, price: true, priceFrequency: true },
            });
            if (property?.landlordId) {
                await LandlordSettingsService.syncApplicationSettingsFromGlobal(
                    property.landlordId,
                    propertyId,
                    Number(property.price ?? 0),
                    property.priceFrequency
                );
            }
        }

        return response;
    }


    deletePropertyListing = async (resourceId: string, createdById?: string) => {
        try {
            let updatedResource: any = null;
            let resourceType: 'property' | 'unit' | 'room' | null = null;
            let lastListedHistory: any = null;

            await prismaClient.$transaction(async (tx) => {
                // 1. Property-level unlist only removes ENTIRE_PROPERTY listings.
                // Room/unit listings stay live — do not mass-unlist children.
                const propertyRecord = await tx.properties.findUnique({
                    where: { id: resourceId },
                    include: {
                        propertyListingHistory: {
                            where: {
                                onListing: true,
                                isActive: true,
                                type: ListingType.ENTIRE_PROPERTY,
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                        },
                    },
                }).catch(() => null);

                if (propertyRecord) {
                    updatedResource = propertyRecord;
                    resourceType = 'property';
                    if (propertyRecord.propertyListingHistory.length > 0) {
                        lastListedHistory = propertyRecord.propertyListingHistory[0];
                    }
                }

                // 2. If not a property, check and update `UnitConfiguration`
                if (!updatedResource) {
                    const unitUpdate = await tx.unitConfiguration.update({
                        where: { id: resourceId },
                        data: { isListed: false },
                        include: {
                            propertyListingHistory: {
                                where: { onListing: true, isActive: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                            RoomDetail: true
                        },
                    }).catch(() => null);

                    if (unitUpdate) {
                        updatedResource = unitUpdate;
                        resourceType = 'unit';
                        if (unitUpdate.propertyListingHistory.length > 0) {
                            lastListedHistory = unitUpdate.propertyListingHistory[0];
                        }

                        // Unlist all rooms in this unit
                        if (unitUpdate.RoomDetail && unitUpdate.RoomDetail.length > 0) {
                            await tx.roomDetail.updateMany({
                                where: {
                                    id: {
                                        in: unitUpdate.RoomDetail.map(room => room.id)
                                    }
                                },
                                data: { isListed: false }
                            });
                        }
                    }
                }

                // 3. If not a unit, check and update `RoomDetail`
                if (!updatedResource) {
                    const roomUpdate = await tx.roomDetail.update({
                        where: { id: resourceId },
                        data: { isListed: false },
                        include: {
                            propertyListingHistory: {
                                where: { onListing: true, isActive: true },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            },
                        },
                    }).catch(() => null);

                    if (roomUpdate) {
                        updatedResource = roomUpdate;
                        resourceType = 'room';
                        if (roomUpdate.propertyListingHistory.length > 0) {
                            lastListedHistory = roomUpdate.propertyListingHistory[0];
                        }
                    }
                }

                // If no resource was found after all attempts, throw an error to rollback.
                if (!updatedResource) {
                    throw new Error('Resource not found');
                }

                // 4. Deactivate listing history — entire-property rows only for property unlist
                if (resourceType === 'property') {
                    await tx.propertyListingHistory.updateMany({
                        where: {
                            propertyId: resourceId,
                            type: ListingType.ENTIRE_PROPERTY,
                            onListing: true,
                            isActive: true,
                        },
                        data: {
                            onListing: false,
                            isActive: false,
                            availableTo: new Date(),
                        },
                    });
                } else if (lastListedHistory) {
                    await tx.propertyListingHistory.update({
                        where: { id: lastListedHistory.id },
                        data: {
                            onListing: false,
                            isActive: false,
                            availableTo: new Date(),
                        },
                    });
                } else {
                    console.warn(`Resource with ID ${resourceId} was unlisted but no active listing history was found.`);
                }

                // 5. Check if property still has any active listings after unlisting this resource
                if (resourceType === 'property') {
                    const remainingActiveListings = await tx.propertyListingHistory.count({
                        where: {
                            propertyId: resourceId,
                            onListing: true,
                            isActive: true
                        }
                    });

                    // Only set isListed to false if no active listings remain
                    if (remainingActiveListings === 0) {
                        await tx.properties.update({
                            where: { id: resourceId },
                            data: { isListed: false }
                        });
                    }
                } else if (resourceType === 'unit' || resourceType === 'room') {
                    // For units/rooms, check if the property still has any active listings
                    const propertyId = updatedResource?.residentialPropertyId || updatedResource?.commercialPropertyId;
                    if (propertyId) {
                        const remainingActiveListings = await tx.propertyListingHistory.count({
                            where: {
                                propertyId: propertyId,
                                onListing: true,
                                isActive: true
                            }
                        });

                        // Only set isListed to false if no active listings remain
                        if (remainingActiveListings === 0) {
                            await tx.properties.update({
                                where: { id: propertyId },
                                data: { isListed: false }
                            });
                        }
                    }
                }
            });

            const resolvedPropertyId =
                resourceType === 'property'
                    ? resourceId
                    : updatedResource?.residentialPropertyId ||
                      updatedResource?.commercialPropertyId ||
                      null;

            if (createdById && resolvedPropertyId) {
                try {
                    await LogsServices.logPropertyStatusChange({
                        propertyId: resolvedPropertyId,
                        events: 'Unlisted — removed from rent listings',
                        subjects: 'Unlisted',
                        createdById,
                    });
                } catch {
                    /* non-blocking */
                }
            }

            return updatedResource;

        } catch (error: any) {
            console.error('Database error in deletePropertyListing:', error);
            if (error.message === 'Resource not found') {
                return null;
            }
            throw error;
        }
    };

    // Method to sync isListed field based on propertyListingHistory
    syncPropertyListingStatus = async (propertyId: string) => {
        try {
            const activeListingsCount = await prismaClient.propertyListingHistory.count({
                where: {
                    propertyId: propertyId,
                    onListing: true,
                    isActive: true
                }
            });

            const isListed = activeListingsCount > 0;

            await prismaClient.properties.update({
                where: { id: propertyId },
                data: { isListed: isListed }
            });

            return { propertyId, isListed, activeListingsCount };
        } catch (error) {
            console.error('Error syncing property listing status:', error);
            throw error;
        }
    }

    // Method to sync all properties' isListed status
    syncAllPropertiesListingStatus = async () => {
        try {
            const properties = await prismaClient.properties.findMany({
                select: { id: true }
            });

            const results = [];
            for (const property of properties) {
                const result = await this.syncPropertyListingStatus(property.id);
                results.push(result);
            }

            return results;
        } catch (error) {
            console.error('Error syncing all properties listing status:', error);
            throw error;
        }
    }

    delistPropertyListing = async (propertyId: string) => {
        const lastListed = await this.getPropsListedById(propertyId);
        if (!lastListed) {
            throw new Error(`No listing history found for property ID ${propertyId}`);
        }

        return await prismaClient.propertyListingHistory.update({
            where: { id: lastListed.id },
            data: {
                onListing: false,
            },
        });
    };


    getPropsListedById = async (propertyId: string) => {
        const propsListed = await prismaClient.propertyListingHistory.findFirst({
            where: {
                propertyId,
                onListing: true,
                isActive: true,
            },
            include: {
                property: {
                    include: {
                        ...this.propsInclusion
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return propsListed
    }

    // to update property listings
    getPropertyListingByListingId = async (listedId: string) => {
        try {
            return await prismaClient.propertyListingHistory.findUnique({
                where: {
                    id: listedId
                },
                include: {
                    property: {

                    },
                    unit: {
                        include: {
                            RoomDetail: true,
                            images: true
                        }
                    },
                    room: {
                        include: {
                            images: true
                        }
                    }
                }
            });


        } catch (error) {
            console.error('Error fetching property listing:', error);
            throw error;
        }
    }
    getPropertyListingByListingIdNew = async (listedId: string) => {
        try {
            const listing = await prismaClient.propertyListingHistory.findUnique({
                where: {
                    id: listedId
                },
                include: {
                    property: {
                        include: {
                            specification: {
                                where: {
                                    isActive: true
                                },
                                include: {
                                    residential: {
                                        include: {
                                            sharedFacilities: true
                                        }
                                    },
                                    commercial: true,
                                    shortlet: true
                                },
                                take: 1 // Only get one specification
                            },
                            state: true,
                            images: true,
                            videos: true,
                            virtualTours: true,
                            complianceRecords: {
                                where: { isDeleted: false },
                                select: { certType: true, expiryDate: true, status: true },
                            },
                            reviews: {
                                where: { isDeleted: false },
                                orderBy: { createdAt: 'desc' },
                                take: 20,
                                select: {
                                    id: true,
                                    rating: true,
                                    comment: true,
                                    createdAt: true,
                                    user: {
                                        select: {
                                            profile: {
                                                select: {
                                                    fullname: true,
                                                    firstName: true,
                                                    lastName: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                            landlord: {
                                select: {
                                    id: true,
                                    userId: true, // Include userId field
                                    landlordCode: true,
                                    user: {
                                        select: {
                                            id: true,
                                            email: true,
                                            profile: {
                                                select: {
                                                    id: true,
                                                    fullname: true,
                                                    firstName: true,
                                                    lastName: true,
                                                    middleName: true,
                                                    profileUrl: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    unit: {
                        include: {
                            RoomDetail: true,
                            images: true
                        }
                    },
                    room: {
                        include: {
                            images: true
                        }
                    }
                }
            });

            if (!listing) {
                throw new Error('Listing not found');
            }

            if (!listing.onListing || !listing.isActive) {
                throw new Error('Listing not found');
            }

            const propertyAvailability = listing.property?.availability;
            const listingEntityVacant =
                listing.type === ListingType.ENTIRE_PROPERTY
                    ? this.isEntityVacant(propertyAvailability)
                    : listing.type === ListingType.SINGLE_UNIT
                      ? this.isEntityVacant(
                            listing.unit?.availability,
                            propertyAvailability
                        )
                      : listing.type === ListingType.ROOM
                        ? this.isEntityVacant(
                              listing.room?.availability,
                              listing.unit?.availability ?? propertyAvailability
                          )
                        : true;

            if (!listingEntityVacant) {
                throw new Error('Listing not found');
            }

            const listingProperty = listing.property;
            if (listingProperty?.id) {
                ensureNearbyPlacesCacheFresh(
                    listingProperty.id,
                    listingProperty.latitude != null
                        ? Number(listingProperty.latitude)
                        : null,
                    listingProperty.longitude != null
                        ? Number(listingProperty.longitude)
                        : null,
                    listingProperty.country || "",
                    listingProperty.cachedNearbyPlacesFetchedAt
                );
            }

            // Check if property itself has an active listing (for breadcrumb navigation)
            let propertyListingId: string | null = null;
            if (listing.type !== 'ENTIRE_PROPERTY' && listing.propertyId) {
                const propertyListing = await prismaClient.propertyListingHistory.findFirst({
                    where: {
                        propertyId: listing.propertyId,
                        type: 'ENTIRE_PROPERTY',
                        onListing: true,
                        isActive: true
                    },
                    select: { id: true },
                    orderBy: { createdAt: 'desc' }
                });
                propertyListingId = propertyListing?.id || null;
            }

            // Normalize the listing (pass propertyListingId if available)
            const normalized = ListingNormalizer.normalize(listing, propertyListingId);

            // Get related listings
            normalized.relatedListings = await ListingNormalizer.getRelatedListings(
                listing.propertyId!,
                listing.id,
                prismaClient
            );

            return normalized;
        } catch (error) {
            console.error('Error fetching property listing:', error);
            throw error;
        }
    }
    updatePropertyListing = async (data: Partial<PropertyListingDTO | any>, listedId: string, landlordId: string) => {
        const propsListed = await this.getPropertyListingByListingId(listedId);
        if (!propsListed) throw new Error(`The props listing with the listing id: ${listedId} have not been listed`);
        if (propsListed?.property?.landlordId !== landlordId) {
            throw new Error("only landlord that created this props listing can update props listing");
        }

        return await prismaClient.propertyListingHistory.update({
            where: { id: listedId },
            data,
        });
    }
    // to update property to listing and not listing 
    updateListingStatus = async (listedId: string) => {
        const propsListed = await this.getPropertyListingByListingId(listedId);
        if (!propsListed) throw new Error(`The props listing with the listing id: ${listedId} have not been listed`);
        return await prismaClient.propertyListingHistory.update({
            where: { id: listedId },
            data: { onListing: false },
        });
    }
    // to update property to listing and not listing
    getPropertyById = async (propertyId: string) => {
        let props = await prismaClient.properties.findFirst({
            where: { id: propertyId },
            include: {
                ...this.propsInclusion
            }
        });

        // Legacy URLs used residential/commercial spec ids after flatten() overwrote property.id
        if (!props) {
            props = await prismaClient.properties.findFirst({
                where: {
                    isDeleted: false,
                    specification: {
                        some: {
                            isActive: true,
                            OR: [
                                { residential: { is: { id: propertyId } } },
                                { commercial: { is: { id: propertyId } } },
                                { shortlet: { is: { id: propertyId } } },
                            ],
                        },
                    },
                },
                include: {
                    ...this.propsInclusion
                },
            });
        }

        if (!props) throw new NotFoundError("Property not found")
        return this.flatten(props);
    }
    getPropertiesWithoutTenants = async (landlordId: string) => {
        // Fetch all properties where there are no tenants associated
        const properties = await prismaClient.properties.findMany({
            where: {
                landlordId,
                tenants: {
                    none: {}
                },
            },
            include: {
                tenants: true,
            },
        });

        return properties;
    }

    // getPropertiesAttachedToTenants = async (tenantId: string) => {
    //     return await prismaClient.properties.findFirst({
    //         where: {
    //             tenants: {
    //                 some: { id: tenantId },
    //             },
    //         }
    //     });
    // 

    getPropertiesAttachedToTenants = async (tenantId: string) => {
        return await prismaClient.tenants.findUnique({
            where: { id: tenantId },
            select: {
                property: true,
                unit: true,
                room: true,
                propertyId: true,
                unitId: true,
                roomId: true
            }
        });
    }

    getUniquePropertiesBaseLandlordNameState = async (landlordId: string, name: string, stateId: string, city: string) => {
        const properties = await prismaClient.properties.findMany({
            where: {
                landlordId,
                name: { mode: "insensitive", equals: name },
                stateId,
                city: { mode: "insensitive", equals: city }
            }
        });
        // Return true if at least one record exists, otherwise false
        return properties.length > 0;
    };

    // property liking 
    getLikeHistories = async (userId: string) => {
        return await prismaClient.userLikedProperty.findMany({
            where: {
                userId,
            },
            include: {
                property: {
                    include: {
                        images: true,
                        landlord: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        profile: {
                                            select: {
                                                fullname: true,
                                                firstName: true,
                                                lastName: true,
                                                profileUrl: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { likedAt: "desc" },
        });
    }
    getLikeHistory = async (userId: string, propertyId: string) => {
        return await prismaClient.userLikedProperty.findUnique({
            where: {
                userId_propertyId: {
                    userId,
                    propertyId,
                },
            },
        });
    }
    createLikeHistory = async (userId: string, propertyId: string) => {
        return await prismaClient.userLikedProperty.create({
            data: {
                userId,
                propertyId,
            },
        });
    }

    async createProperties(data: IBasePropertyDTO, specification: IPropertySpecificationDTO, uploadedFiles?: any[], userId?: string) {
        const { shortlet, specificationType, residential, commercial } = specification;

        const created = await prismaClient.$transaction(async (tx) => {
            const {
                agencyId,
                landlordId,
                stateId,
                keyFeatures,
                customKeyFeatures,
                nearbyAmenities,
                customNearbyAmenities,
                amenityDistances,
                price,
                marketValue,
                propertyValue,
                securityDeposit,
                initialDeposit,
                virtualTourUrl: virtualTourUrlRaw,
                images: _omitImages,
                videos: _omitVideos,
                virtualTours: _omitVirtualTours,
                propertyDocument: _omitPropertyDocument,
                specification: _omitSpecification,
                state: _omitState,
                landlord: _omitLandlord,
                propertySubType: _omitPropertySubType,
                otherTypeSpecific: _omitOtherTypeSpecific,
                operationalProfileJson: _omitOperationalProfileJson,
                operationalProfile: _omitOperationalProfile,
                ...rest
            } = data as IBasePropertyDTO & Record<string, unknown>;

            // Prefer the first positive deposit; Nigeria forms may send initialDeposit while securityDeposit is 0
            const secNum =
                securityDeposit != null && !Number.isNaN(Number(securityDeposit))
                    ? Number(securityDeposit)
                    : null;
            const initNum =
                initialDeposit != null && !Number.isNaN(Number(initialDeposit))
                    ? Number(initialDeposit)
                    : null;
            let depositAmount =
                secNum != null && secNum > 0
                    ? secNum
                    : initNum != null && initNum > 0
                      ? initNum
                      : undefined;

            if ((!depositAmount || Number(depositAmount) <= 0) && price && landlordId) {
                const globalSettings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
                const rules = resolveFinancialRules(
                    globalSettings,
                    Number(price),
                    (rest as { priceFrequency?: PriceFrequency }).priceFrequency
                );
                if (rules.depositAmount > 0) {
                    depositAmount = rules.depositAmount;
                }
            }

            if (!landlordId || !stateId) {
                throw new Error("Missing required fields: landlordId or stateId.");
            }
            if (!specificationType) {
                throw new Error("Specification type is required.");
            }

            // Separate media by type
            const images = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.IMAGE);
            const videos = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.VIDEO);
            const virtualTours = uploadedFiles?.filter(file => file?.identifier === 'MediaTable' && file?.type === MediaType.VIRTUAL_TOUR);

            // Virtual tour URL (single link; no file upload) – create one virtual tour record
            const virtualTourUrlTrimmed = typeof virtualTourUrlRaw === 'string' ? virtualTourUrlRaw.trim() : '';
            const virtualTourFromUrl = virtualTourUrlTrimmed && (virtualTourUrlTrimmed.startsWith('http://') || virtualTourUrlTrimmed.startsWith('https://'))
                ? [{
                    type: MediaType.VIRTUAL_TOUR,
                    url: virtualTourUrlTrimmed,
                    fileType: 'virtual-tour/link',
                    isPrimary: false,
                    caption: null,
                }]
                : [];
            const virtualToursCreate = [
                ...(virtualTours?.map(vt => ({
                    type: vt.type,
                    fileType: vt.fileType,
                    url: vt.url,
                    isPrimary: vt.isPrimary,
                    caption: vt.caption,
                })) || []),
                ...virtualTourFromUrl,
            ];
            const documents = uploadedFiles?.filter(file => file?.identifier === 'DocTable');

            const imageCreates =
                images?.map(img => ({
                    type: img.type,
                    size: img.size,
                    fileType: img.fileType,
                    url: img.url,
                    isPrimary: img.isPrimary,
                    caption: img.caption,
                })) ?? [];
            const videoCreates =
                videos?.map(vid => ({
                    type: vid.type,
                    size: vid.size,
                    fileType: vid.fileType,
                    url: vid.url,
                    isPrimary: vid.isPrimary,
                    caption: vid.caption,
                })) ?? [];
            const documentCreates =
                documents?.map(doc => ({
                    documentName: doc?.documentName,
                    documentUrl: doc?.url || doc?.documentUrl,
                    size: doc?.size,
                    type: doc?.type,
                    ...(doc?.docType && { docType: doc?.docType }),
                    ...(doc?.idType && { idType: doc?.idType }),
                    ...(userId ? { users: { connect: { id: userId } } } : {}),
                })) ?? [];

            // Create the main property - REMOVE documentName from here
            const property = await tx.properties.create({
                data: {
                    ...(rest as Prisma.propertiesCreateInput),
                    price: price ? new Prisma.Decimal(price) : null, // Convert to Decimal
                    marketValue:
                        marketValue != null && !Number.isNaN(Number(marketValue))
                            ? new Prisma.Decimal(marketValue)
                            : null,
                    propertyValue:
                        propertyValue != null && !Number.isNaN(Number(propertyValue))
                            ? new Prisma.Decimal(propertyValue)
                            : marketValue != null && !Number.isNaN(Number(marketValue))
                              ? new Prisma.Decimal(marketValue)
                              : null,
                    securityDeposit: depositAmount != null && Number(depositAmount) > 0 ? new Prisma.Decimal(Number(depositAmount)) : null,
                    keyFeatures: { set: keyFeatures ?? [] },
                    customKeyFeatures: customKeyFeatures?.length ? { set: customKeyFeatures } : undefined,
                    nearbyAmenities: nearbyAmenities?.length ? { set: nearbyAmenities } : undefined,
                    customNearbyAmenities: customNearbyAmenities?.length ? { set: customNearbyAmenities } : undefined,
                    amenityDistances: amenityDistances ?? undefined,
                    specificationType,
                    landlord: { connect: { id: landlordId } },
                    agency: agencyId ? { connect: { id: agencyId } } : undefined,
                    state: { connect: { id: stateId } },
                    ...(imageCreates.length > 0
                        ? { images: { create: imageCreates } }
                        : {}),
                    ...(videoCreates.length > 0
                        ? { videos: { create: videoCreates } }
                        : {}),
                    ...(virtualToursCreate.length > 0
                        ? { virtualTours: { create: virtualToursCreate } }
                        : {}),
                    ...(documentCreates.length > 0
                        ? { propertyDocument: { create: documentCreates } }
                        : {}),
                }
            });

            if (!property) {
                throw new Error(`Failed to create property`);
            }

            await syncPropertyLocationFromCoordinates(
                tx,
                property.id,
                property.latitude,
                property.longitude
            );

            // Step 2: Create associated specification
            switch (specificationType) {
                case PropertySpecificationType.RESIDENTIAL:
                    await this.createResidentialProperty(property.id, residential, tx, specification);
                    break;
                case PropertySpecificationType.COMMERCIAL:
                    await this.createCommercialProperty(property.id, commercial, tx, specification);
                    break;
                case PropertySpecificationType.SHORTLET:
                    await this.createShortletProperty(property.id, shortlet, tx, specification);
                    break;
                default:
                    throw new Error(`Unknown specification type: ${specificationType}`);
            }

            // Return full property with related entities
            return tx.properties.findUnique({
                where: { id: property.id },
                include: {
                    specification: this.specificationInclusion,
                    images: true,
                    videos: true,
                    virtualTours: true,
                    propertyDocument: true,
                }
            });
        }, {
            maxWait: 30000, // Maximum time to wait for transaction to start (10 seconds)
            timeout: 30000 // Maximum time for transaction to complete (10 seconds)
        });

        if (created?.latitude != null && created?.longitude != null) {
            const lat = Number(created.latitude);
            const lng = Number(created.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                void refreshNearbyPlacesCache(
                    created.id,
                    lat,
                    lng,
                    created.country || ""
                ).catch(() => undefined);
            }
        }

        return created;
    }


    async createResidentialProperty(propertyId: string, data: IResidentialDTO | any, tx: any, specification: IPropertySpecificationDTO) {
        const {
            outdoorsSpacesFeature,
            safetyFeatures,
            bills,
            buildingAmenityFeatures,
            roomDetails,
            PropertySpecification,
            sharedFacilities,
            unitConfigurations,
            ...rest } = data;

        // Verify property exists
        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);

        // Proceed with creation
        const residential = await tx.residentialProperty.create({
            data: {
                ...rest,
                outdoorsSpacesFeatures: outdoorsSpacesFeature ? { set: outdoorsSpacesFeature } : undefined,
                buildingAmenityFeatures: buildingAmenityFeatures ? { set: buildingAmenityFeatures } : undefined,
                safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined,
                billsSubCategory: {
                    connect: bills?.length ? bills?.map((id) => ({ id })) : undefined,
                },
                // roomDetails: {
                //     create: roomDetails?.map((room: any) => ({
                //         roomName: room.roomName,
                //         roomSize: room.roomSize,
                //         ensuite: room.ensuite,
                //         price: room.price,
                //     })) || [],
                // },
                roomDetails: {
                    create: roomDetails?.flatMap((room: any) =>
                        Array.from({ length: room.count || 1 }, () => ({
                            roomName: room.roomName,
                            roomSize: room.roomSize,
                            count: room.count,
                            ensuite: room.ensuite,
                            furnished: room.furnished,
                            price: room.price,
                            description: room?.description,
                            priceFrequency: room.priceFrequency,
                        }))
                    ) || [],
                },
                sharedFacilities: {
                    create: {
                        kitchen: sharedFacilities?.kitchen ?? false,
                        bathroom: sharedFacilities?.bathroom ?? false,
                        livingRoom: sharedFacilities?.livingRoom ?? false,
                        garden: sharedFacilities?.garden ?? false,
                        garage: sharedFacilities?.garage ?? false,
                        laundry: sharedFacilities?.laundry ?? false,
                        parking: sharedFacilities?.parking ?? false,
                        other: sharedFacilities?.other || "",
                    },
                },
                unitConfigurations: {
                    create: unitConfigurations?.flatMap((unit: any) =>
                        Array.from({ length: unit.count || 1 }, (_, i) => ({
                            unitType: unit.unitType,
                            unitNumber: `${unit.unitNumber}${i + 1}`,
                            floorNumber: unit.floorNumber,
                            bedrooms: unit.bedrooms,
                            bathrooms: unit.bathrooms,
                            kitchens: unit.kitchens,
                            furnished: unit.furnished,
                            ensuite: unit.ensuite,
                            count: unit.count,
                            price: unit.price,
                            priceFrequency: unit.priceFrequency,
                            area: unit.area,
                            description: unit?.description,
                            availability: unit.availability,
                        }))
                    ) || [],
                },
            },
        });
        return await tx.propertySpecification.create({
            data: {
                property: {
                    connect: { id: property.id }
                },
                specificationType: PropertySpecificationType.RESIDENTIAL,
                residential: { connect: { id: residential.id } },
                propertySubType: specification.propertySubType,
                otherTypeSpecific: specification?.otherTypeSpecific
            }
        });
    }

    async createCommercialProperty(propertyId: string, data: ICommercialDTO | any, tx: any, specification: IPropertySpecificationDTO) {
        const {
            safetyFeatures = [],
            coolingTypes = [],
            heatingTypes = [],
            customSafetyFeatures = [],
            securityFeatures = [],
            otherSharedFacilities = [],
            floorAvailability,
            roomDetails,
            unitConfigurations,
            suitableFor,
            PropertySpecification,
            sharedFacilities,
            ...rest
        } = data;

        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);
        // Proceed with creation
        const commercial = await tx.commercialProperty.create({
            data: {
                ...rest,
                // All array fields with set operations
                securityFeatures: securityFeatures ? { set: securityFeatures } : undefined,
                safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined,
                customSafetyFeatures: customSafetyFeatures ? { set: customSafetyFeatures } : undefined,
                coolingTypes: coolingTypes ? { set: coolingTypes } : undefined,
                heatingTypes: heatingTypes ? { set: heatingTypes } : undefined,
                otherSharedFacilities: otherSharedFacilities ? { set: otherSharedFacilities } : undefined,

                // Required fields from your model
                leaseTermUnit: rest.leaseTermUnit || "YEARS",
                minimumLeaseTerm: rest.minimumLeaseTerm || 12,
                leaseTerm: resolveCommercialLeaseTerm({
                    leaseTerm: rest.leaseTerm,
                    minimumLeaseTerm: rest.minimumLeaseTerm || 12,
                    maximumLeaseTerm: rest.maximumLeaseTerm,
                    leaseTermUnit: rest.leaseTermUnit || "YEARS",
                }),
                // Nested creates
                floorAvailability: {
                    create: floorAvailability?.map((floor: any) => ({
                        floorNumber: floor.floorNumber,
                        area: floor.area,
                        price: floor.price,
                        available: floor.available,
                        partialFloor: floor.partialFloor,
                        description: floor.description,
                        amenities: floor?.amenities ? { set: floor.amenities } : undefined,
                    })) || []
                },

                roomDetails: {
                    create: roomDetails?.map((room: any) => ({
                        roomName: room.roomName,
                        roomSize: room.roomSize,
                        ensuite: room.ensuite,
                        price: room.price,
                        description: room?.description,
                        furnished: room.furnished
                    })) || []
                },

                sharedFacilities: {
                    create: {
                        kitchen: sharedFacilities?.kitchen ?? false,
                        bathroom: sharedFacilities?.bathroom ?? false,
                        livingRoom: sharedFacilities?.livingRoom ?? false,
                        garden: sharedFacilities?.garden ?? false,
                        garage: sharedFacilities?.garage ?? false,
                        laundry: sharedFacilities?.laundry ?? false,
                        parking: sharedFacilities?.parking ?? false,
                        other: sharedFacilities?.other || "",
                    }
                },

                suitableFor: {
                    create: suitableFor?.map((name: string) => ({ name })) || []
                },

                unitConfigurations: {
                    create: unitConfigurations?.map((unit: any) => ({
                        unitType: unit.unitType,
                        unitNumber: unit.unitNumber,
                        floorNumber: unit.floorNumber,
                        count: unit.count,
                        bedrooms: unit.bedrooms,
                        bathrooms: unit.bathrooms,
                        kitchens: unit.kitchens,
                        furnished: unit.furnished,
                        ensuite: unit.ensuite,
                        price: unit.price,
                        area: unit.area,
                        description: unit.description,
                        availability: unit.availability,
                    })) || []
                }
            }
        });

        return await tx.propertySpecification.create({
            data: {
                property: {
                    connect: { id: property.id }
                },
                specificationType: PropertySpecificationType.COMMERCIAL,
                commercial: { connect: { id: commercial.id } },
                propertySubType: specification.propertySubType,
                otherTypeSpecific: specification?.otherTypeSpecific
            }
        });
    }

    async createShortletProperty(propertyId: string, data: IShortletDTO | any, tx: any, specification: IPropertySpecificationDTO) {
        const {
            safetyFeatures,
            buildingAmenityFeatures,
            outdoorsSpacesFeatures,
            hostLanguages,
            additionalRules, unavailableDates,
            seasonalPricing,
            PropertySpecification,
            sharedFacilities, roomDetails, ...rest } = data;

        // Step 1: Verify property exists
        const property = await tx.properties.findUnique({
            where: { id: propertyId }
        });
        if (!property) throw new Error(`Property ${propertyId} not found`);


        // Proceed with creation
        const shortlet = await tx.shortletProperty.create({
            data: {
                ...rest,
                safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined,
                outdoorsSpacesFeatures: outdoorsSpacesFeatures ? { set: outdoorsSpacesFeatures } : undefined,
                buildingAmenityFeatures: buildingAmenityFeatures ? { set: buildingAmenityFeatures } : undefined,
                roomDetails: {
                    create: roomDetails?.map((room: any) => ({
                        roomName: room.roomName,
                        roomSize: room.roomSize,
                        description: room?.description,
                        ensuite: room.ensuite,
                        price: room.price,
                    })) || [],
                },
                seasonalPricing: {
                    create: seasonalPricing?.map((season: any) => ({
                        seasonName: season.seasonName,
                        startDate: season.startDate,
                        endDate: season.endDate,
                        price: season.price,
                    })) || [],
                },
                unavailableDates: {
                    create: unavailableDates?.map((dt: any) => ({
                        date: dt
                    })) || [],
                },
                additionalRules: {
                    create: additionalRules?.map((r: any) => ({
                        rule: r
                    })) || [],
                },
                hostLanguages: {
                    create: hostLanguages?.map((lang: any) => ({
                        language: lang
                    })) || [],
                },
                sharedFacilities: {
                    create: {
                        kitchen: sharedFacilities?.kitchen ?? false,
                        bathroom: sharedFacilities?.bathroom ?? false,
                        livingRoom: sharedFacilities?.livingRoom ?? false,
                        garden: sharedFacilities?.garden ?? false,
                        garage: sharedFacilities?.garage ?? false,
                        laundry: sharedFacilities?.laundry ?? false,
                        parking: sharedFacilities?.parking ?? false,
                        other: sharedFacilities?.other || "",
                    },
                },
            },
        });
        return await tx.propertySpecification.create({
            data: {
                property: {
                    connect: { id: property.id }
                },
                specificationType: PropertySpecificationType.SHORTLET,
                shortlet: { connect: { id: shortlet.id } },
                propertySubType: specification.propertySubType,
                otherTypeSpecific: specification?.otherTypeSpecific
            }
        });
    }

    async switchPropertyType(data: IBasePropertyDTO, specification: IPropertySpecificationDTO, propertyId?: string) {
        return prismaClient.$transaction(async (tx) => {
            // Verify property exists and get current active specification
            const property = await tx.properties.findUnique({
                where: { id: propertyId },
                include: {
                    specification: {
                        // where: { isActive: true },
                        include: {
                            commercial: true,
                            residential: true,
                            shortlet: true
                        }
                    }
                }
            });

            if (!property) {
                throw new Error("Property not found");
            }

            // Deactivate current active specification if exists
            if (property.specification?.length) {
                await tx.propertySpecification.updateMany({
                    where: { propertyId: property?.id },
                    //   where: { id: property.specification[0].id },
                    data: { isActive: false }
                });
            }

            // Create a helper function to convert Decimal to number
            const decimalToNumber = (decimal: any): number => {
                if (decimal === null || decimal === undefined) return 0;
                return typeof decimal === 'number' ? decimal : Number(decimal.toString());
            };


            // Create or reuse specification based on target type
            switch (data.specificationType) {
                case PropertySpecificationType.COMMERCIAL:
                    return this.handleCommercialSwitch(tx, specification.commercial, propertyId, property.specification?.[0],);
                case PropertySpecificationType.RESIDENTIAL:
                    // return this.handleResidentialSwitch(tx, specification.residential, propertyId, property.specification?.[0]);
                    // Convert Decimal fields to numbers before passing
                    const residentialDTO = {
                        ...specification.residential,
                        groundRent: decimalToNumber(specification.residential?.groundRent),
                        serviceCharge: decimalToNumber(specification.residential?.serviceCharge),
                        propertyTax: decimalToNumber(specification.residential?.propertyTax),
                        hoaFees: decimalToNumber(specification.residential?.hoaFees),
                    };
                    return this.handleResidentialSwitch(
                        tx,
                        residentialDTO,
                        propertyId,
                        property.specification?.[0]
                    );
                case PropertySpecificationType.SHORTLET:
                    return this.handleShortletSwitch(tx, specification.shortlet, propertyId, property.specification?.[0]);
                default:
                    throw new Error("Invalid property type");
            }
        });
    }

    private async handleCommercialSwitch(tx: any, request: ICommercialDTO | any, propertyId: string, currentSpec?: any) {
        const { ...commercialData } = request;

        // Reuse existing commercial spec if available, otherwise create new
        const commercial = currentSpec?.commercial
            ? await tx.commercialProperty.create({
                data: {
                    ...currentSpec.commercial,
                    id: undefined, // Let Prisma generate new ID
                    ...commercialData,
                    securityFeatures: { set: currentSpec.commercial.securityFeatures || commercialData.securityFeatures },
                }
            })
            : await tx.commercialProperty.create({
                data: {
                    ...commercialData,
                    securityFeatures: { set: commercialData.securityFeatures || [] },
                }
            });

        return this.updatePropertySpecification(tx, propertyId, "COMMERCIAL", commercial.id);
    }

    private async handleResidentialSwitch(tx: any, request: IResidentialDTO, propertyId: string, currentSpec?: any) {
        const { ...residentialData } = request;
        const residential = currentSpec?.residential
            ? await tx.residentialProperty.create({
                data: {
                    ...currentSpec.residential,
                    id: undefined,
                    ...residentialData,
                    safetyFeatures: { set: residentialData.safetyFeatures || currentSpec.residential.safetyFeatures },
                }
            })
            : await tx.residentialProperty.create({
                data: {
                    ...residentialData,
                    safetyFeatures: { set: residentialData.safetyFeatures || [] },
                }
            });

        return this.updatePropertySpecification(tx, propertyId, PropertySpecificationType.RESIDENTIAL, residential.id);
    }

    private async handleShortletSwitch(tx: any, request: IShortletDTO | any, propertyId: string, currentSpec?: any) {
        const { ...shortletData } = request;

        const shortlet = currentSpec?.shortlet
            ? await tx.shortletProperty.create({
                data: {
                    ...currentSpec.shortlet,
                    id: undefined,
                    ...shortletData,
                    safetyFeatures: { set: shortletData.safetyFeatures || currentSpec.shortlet.safetyFeatures },
                }
            })
            : await tx.shortletProperty.create({
                data: {
                    ...shortletData,
                    safetyFeatures: { set: shortletData.safetyFeatures || [] },
                }
            });

        return this.updatePropertySpecification(tx, propertyId, PropertySpecificationType.SHORTLET, shortlet.id);
    }

    updatePropertySpecification = async (
        tx: any,
        propertyId: string,
        specType: PropertySpecificationType,
        specId: string
    ) => {
        return tx.properties.update({
            where: { id: propertyId },
            data: {
                specificationType: specType,
                specification: {
                    create: {
                        specificationType: specType,
                        isActive: true,
                        ...(specType === PropertySpecificationType.COMMERCIAL && { commercial: { connect: { id: specId } } }),
                        ...(specType === PropertySpecificationType.RESIDENTIAL && { residential: { connect: { id: specId } } }),
                        ...(specType === PropertySpecificationType.SHORTLET && { shortlet: { connect: { id: specId } } }),
                    }
                }
            },
            include: {
                specification: {
                    where: { isActive: true },
                    include: {
                        commercial: specType === PropertySpecificationType.COMMERCIAL,
                        residential: specType === PropertySpecificationType.RESIDENTIAL,
                        shortlet: specType === PropertySpecificationType.SHORTLET
                    }
                }
            }
        });
    }

    async createBooking(data: Booking) {
        const { shortletId, ...rest } = data;
        return await prismaClient.booking.create({
            data: {
                ...rest,
                property: {
                    connect: { id: shortletId }
                }
            },
        });
    }

    async createSeasonalPricing(data: SeasonalPricing) {
        const { propertyId, ...rest } = data;
        return await prismaClient.seasonalPricing.create({
            data: {
                ...rest,
                property: {
                    connect: { id: propertyId }
                }
            },
        });
    }

    async createUnavailableDate(data: UnavailableDate) {
        const { shortletId, ...rest } = data;
        return await prismaClient.unavailableDate.create({
            data: {
                ...rest,
                shortlet: {
                    connect: { id: shortletId }
                },
            }
        });
    }

    async createAdditionalRule(data: AdditionalRule) {
        const { shortletId, ...rest } = data;
        return await prismaClient.additionalRule.create({
            data: {
                ...rest,
                shortlet: {
                    connect: { id: shortletId }
                },
            },
        });
    }

    async createHostLanguage(data: any) {
        const { shortletId, ...rest } = data;
        return await prismaClient.hostLanguage.create({
            data: {
                ...rest,
                shortlet: {
                    connect: { id: shortletId }
                },
            },
        });
    }

    getPropertySpecificationHistory = async (propertyId: string) => {
        return prismaClient.propertySpecification.findMany({
            where: { propertyId },
            orderBy: { createdAt: 'desc' },
            include: {
                commercial: true,
                residential: true,
                shortlet: true
            }
        });
    }

    getActiveSpecification = async (propertyId: string) => {
        return prismaClient.propertySpecification.findFirst({
            where: {
                propertyId,
                isActive: true
            },
            include: {
                commercial: true,
                residential: true,
                shortlet: true
            }
        });
    }

    searchPropertyUnitRoom = async (id: string) => {
        // Validate id is provided
        if (!id || id === 'undefined' || id === 'null') {
            throw new Error("Property/Unit/Room ID is required");
        }
        
        // First search the property without strict filters
        const property = await prismaClient.properties.findFirst({
            where: { id, isDeleted: false },
            include: {
                propertyListingHistory: true
            }
        });

        const unit = await prismaClient.unitConfiguration.findFirst({
            where: { id, isDeleted: false }
        });

        const room = await prismaClient.roomDetail.findFirst({
            where: { id, isDeleted: false }
        });

        if (property) {
            // Determine if property is actually active on listing
            const isListed = property.propertyListingHistory?.some(h => h.isActive && h.onListing);

            return {
                type: 'property',
                data: property,
                isListed
            };
        }

        if (unit) {
            return { type: 'unit', data: unit };
        }

        if (room) {
            return { type: 'room', data: room };
        }

        console.log("=========== No match found for id:", id);
        console.log(property)

        throw new Error("No matching property, unit, or room found");
    };


    async setShortletMode(propertyId: string, enabled: boolean) {
        return prismaClient.$transaction(async (tx) => {
            const property = await tx.properties.findUnique({
                where: { id: propertyId },
                include: {
                    specification: {
                        include: {
                            residential: true,
                            shortlet: true,
                        },
                        orderBy: { createdAt: 'desc' },
                    },
                },
            });

            if (!property) {
                throw new Error(`Property ${propertyId} not found`);
            }

            const activeSpec = property.specification.find(spec => spec.isActive);

            if (enabled) {
                if (activeSpec?.specificationType === PropertySpecificationType.SHORTLET) {
                    return this.fetchFlattenedProperty(tx, propertyId);
                }

                if (
                    activeSpec?.specificationType !== PropertySpecificationType.RESIDENTIAL
                ) {
                    throw new Error(
                        'Shortlet mode can only be enabled on residential properties'
                    );
                }

                const residential = activeSpec.residential;
                const shortletSeed = {
                    bedrooms: residential?.bedrooms ?? undefined,
                    bathrooms: residential?.bathrooms ?? undefined,
                    basePrice: property.price ? Number(property.price) : undefined,
                    minStayDays: 1,
                    maxStayDays: 30,
                    checkInTime: '15:00',
                    checkOutTime: '11:00',
                };

                const existingShortletSpec = property.specification.find(
                    spec =>
                        spec.specificationType === PropertySpecificationType.SHORTLET &&
                        spec.shortletId
                );

                if (activeSpec) {
                    await tx.propertySpecification.update({
                        where: { id: activeSpec.id },
                        data: { isActive: false, toDate: new Date() },
                    });
                }

                if (existingShortletSpec?.shortletId) {
                    await tx.shortletProperty.update({
                        where: { id: existingShortletSpec.shortletId },
                        data: shortletSeed,
                    });
                    await tx.propertySpecification.update({
                        where: { id: existingShortletSpec.id },
                        data: {
                            isActive: true,
                            fromDate: new Date(),
                            toDate: null,
                        },
                    });
                } else {
                    await this.updateShortletProps(propertyId, shortletSeed, tx);
                }

                await tx.properties.update({
                    where: { id: propertyId },
                    data: { specificationType: PropertySpecificationType.SHORTLET },
                });
            } else {
                if (activeSpec?.specificationType !== PropertySpecificationType.SHORTLET) {
                    return this.fetchFlattenedProperty(tx, propertyId);
                }

                await tx.propertySpecification.update({
                    where: { id: activeSpec.id },
                    data: { isActive: false, toDate: new Date() },
                });

                const residentialSpec = property.specification.find(
                    spec =>
                        spec.specificationType === PropertySpecificationType.RESIDENTIAL &&
                        spec.residentialId
                );

                if (!residentialSpec) {
                    throw new Error(
                        'No residential profile found to restore. Create the property as residential first.'
                    );
                }

                await tx.propertySpecification.update({
                    where: { id: residentialSpec.id },
                    data: {
                        isActive: true,
                        fromDate: new Date(),
                        toDate: null,
                    },
                });

                await tx.properties.update({
                    where: { id: propertyId },
                    data: { specificationType: PropertySpecificationType.RESIDENTIAL },
                });
            }

            return this.fetchFlattenedProperty(tx, propertyId);
        });
    }

    private async fetchFlattenedProperty(
        tx: Prisma.TransactionClient,
        propertyId: string
    ) {
        const updatedProperty = await tx.properties.findUnique({
            where: { id: propertyId },
            include: {
                state: true,
                specification: this.specificationInclusion,
                agency: true,
                application: true,
                reviews: true,
                UserLikedProperty: true,
                landlord: this.landlordInclusion,
            },
        });

        if (!updatedProperty) {
            throw new Error(`Property ${propertyId} not found after update`);
        }

        return this.flatten(updatedProperty as any);
    }

    async updateShortletSettings(propertyId: string, data: Partial<IShortletDTO>) {
        return await prismaClient.$transaction(async (tx) => {
            const property = await tx.properties.findUnique({
                where: { id: propertyId },
                include: {
                    specification: {
                        where: { isActive: true },
                        include: {
                            shortlet: true,
                            residential: true,
                        },
                    },
                },
            });

            if (!property) {
                throw new Error(`Property ${propertyId} not found`);
            }

            const activeSpec = property.specification?.find(spec => spec.isActive);

            if (!activeSpec?.shortlet) {
                throw new Error(
                    `Property ${propertyId} is not configured as a shortlet. Enable shortlet mode on the property page first.`
                );
            }

            const shortletId = activeSpec.shortlet.id;

            const {
                safetyFeatures,
                buildingAmenityFeatures,
                outdoorsSpacesFeatures,
                roomDetails,
                seasonalPricing,
                unavailableDates,
                additionalRules,
                hostLanguages,
                sharedFacilities,
                bookings,
                id: _shortletId,
                yearBuilt,
                ...updateData
            } = data;

            const shortletUpdate: Prisma.ShortletPropertyUpdateInput = {
                ...updateData,
                ...(yearBuilt !== undefined && {
                    yearBuilt:
                        yearBuilt === null || yearBuilt === ''
                            ? null
                            : Number(yearBuilt),
                }),
                ...(safetyFeatures !== undefined && {
                    safetyFeatures: { set: safetyFeatures },
                }),
                ...(buildingAmenityFeatures !== undefined && {
                    buildingAmenityFeatures: { set: buildingAmenityFeatures },
                }),
                ...(outdoorsSpacesFeatures !== undefined && {
                    outdoorsSpacesFeatures: { set: outdoorsSpacesFeatures },
                }),
            };

            await tx.shortletProperty.update({
                where: { id: shortletId },
                data: shortletUpdate,
            });

            return this.fetchFlattenedProperty(tx, propertyId);
        });
    }

    async searchPropertiesForRecommendation(filters: PropertySearchDto, currencyOptions?: CurrencyDisplayOptions) {
        const {
            propertyCategory,
            propertyType,
            location,
            bedrooms,
            bathrooms,
            minRent,
            maxRent,
            leaseDuration,
            moveInDate,
            minSize,
            maxSize,
        } = filters;

        const listings = await prismaClient.propertyListingHistory.findMany({
            where: {
                isActive: true,
                onListing: true,
                ...(propertyCategory && { listAs: propertyCategory }),
                ...(propertyType && { propertySubType: propertyType }),
                ...(minRent || maxRent
                    ? {
                        price: {
                            gte: minRent ?? 0,
                            lte: maxRent ?? undefined,
                        },
                    }
                    : {}),
                ...(moveInDate && {
                    availableFrom: {
                        lte: moveInDate,
                    },
                    availableTo: {
                        gte: moveInDate,
                    },
                }),
                property: {
                    isDeleted: false,
                    isListed: true,
                    ...(location && {
                        OR: [
                            { city: { contains: location, mode: 'insensitive' } },
                            { address: { contains: location, mode: 'insensitive' } },
                            { state: { name: { contains: location, mode: 'insensitive' } } },
                        ],
                    }),
                    ...(bedrooms || bathrooms
                        ? {
                            specification: {
                                some: {
                                    residential: {
                                        ...(bedrooms && { bedrooms: { gte: bedrooms } }),
                                        ...(bathrooms && { bathrooms: { gte: bathrooms } }),
                                    },
                                },
                            },
                        }
                        : {}),
                },
            },
            include: {
                property: {
                    include: {
                        specification: true,
                        images: true,
                        landlord: true,
                    },
                },
                unit: true,
                room: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        const normalizedListings: NormalizedListing[] = [];
        const currencyContext = await this.resolveCurrencyDisplayContext(currencyOptions);

        for (const listing of listings) {
            const normalized = ListingNormalizer.normalize(listing);
            normalizedListings.push(await this.applyCurrencyDisplay(normalized, listing.property?.currency, currencyContext));
        }

        return normalizedListings;
    }

    createEnquiry = async (data: {
        tenantId: string;
        landlordId: string;
        subject: string;
        message: string;
        propertyId?: string;
        unitId?: string;
        roomId?: string;
        logId?: string;
    }) => {
        return await prismaClient.propertyEnquiry.create({ data });
    }


    getLandlordEnquiries = async (landlordId: string) => {
        return prismaClient.propertyEnquiry.findMany({
            where: { landlordId },
            include: {
                tenant: {
                    select: {
                        id: true,
                        tenantWebUserEmail: true,
                        user: {
                            select: { id: true, email: true }
                        }
                    },
                },
                property: true,
                unit: true,
                room: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }
    getEnquiryById = async (id: string) => {
        return prismaClient.propertyEnquiry.findUnique({
            where: { id },
            include: { tenant: true, landlord: true, property: true, unit: true, room: true },
        });
    }

}

export default new PropertyService()
