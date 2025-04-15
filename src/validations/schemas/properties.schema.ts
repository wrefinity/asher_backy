import Joi from 'joi';
import {
  ListingType, PropertyType, PropertySpecificationType, ShortletType, DocumentType, IdType,
  PriceFrequency, PropsApartmentStatus,
  LeaseTermUnit, AreaUnit, BuildingClass,
  OfficeLayout, CancellationPolicy,
  MediaType
} from '@prisma/client';
const propertyType = Object.values(PropertyType);
const documentType = Object.values(DocumentType);
const idType = Object.values(IdType);
const propertySpecificationType = Object.values(PropertySpecificationType);

export const createPropertySchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().required(),
  propertysize: Joi.number().optional(),
  agencyId: Joi.string().optional(),
  // isWholeRent: Joi.boolean().required(),
  noBedRoom: Joi.number().optional(),
  noKitchen: Joi.number().optional(),
  noGarage: Joi.number().optional(),
  noBathRoom: Joi.number().optional(),
  marketValue: Joi.number().optional(),
  rentalFee: Joi.number().optional(),
  initialDeposit: Joi.number().optional(),
  longitude: Joi.number().optional(),
  latitude: Joi.number().optional(),
  // latePaymentFeeType: Joi.string().valid('ONE_TIME', 'DAILY').optional(),
  dueDate: Joi.date().optional(),
  type: Joi.string().valid(...propertyType).default(PropertyType.SINGLE_UNIT).required(),
  specificationType: Joi.string().valid(...propertySpecificationType).default(PropertySpecificationType.RESIDENTIAL).required(),
  useTypeCategory: Joi.string().optional(),
  // landlordId: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().required(),
  currency: Joi.string().required(),
  zipcode: Joi.string().required(),
  location: Joi.string().optional(),
  yearBuilt: Joi.date().optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  totalApartments: Joi.number().integer().optional(),
  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
});

// Joi schema for validating property update data
export const updatePropertySchema = Joi.object({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  marketValue: Joi.number().optional(),
  rentalFee: Joi.number().optional(),
  initialDeposit: Joi.number().optional(),
  propertysize: Joi.number().integer().optional(),
  isDeleted: Joi.boolean().optional(),
  landlordId: Joi.string().optional(),
  agencyId: Joi.string().optional(),
  yearBuilt: Joi.date().iso().optional(),
  createdAt: Joi.date().iso().optional(),
  city: Joi.string().optional(),
  state: Joi.string().optional(),
  country: Joi.string().optional(),
  zipcode: Joi.string().optional(),
  location: Joi.string().optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  videourl: Joi.array().items(Joi.string().uri()).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  totalApartments: Joi.number().integer().optional(),
  transactions: Joi.array().items(Joi.string()).optional(),
  apartments: Joi.array().items(Joi.string()).optional(),
  ratings: Joi.array().items(Joi.string()).optional(),
  tenants: Joi.array().items(Joi.string()).optional(),
  inventory: Joi.array().items(Joi.string()).optional(),
  applicant: Joi.array().items(Joi.string()).optional(),
  maintenance: Joi.array().items(Joi.string()).optional(),
  reviews: Joi.array().items(Joi.string()).optional(),
  propertyDocument: Joi.array().items(Joi.string()).optional(),
});


export const createPropertyDocumentSchema = Joi.object({
  documentName: Joi.string().required(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string()).optional(),
  cloudinaryUrls: Joi.array().items(Joi.string()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string()).optional(),
  apartmentsId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
  size: Joi.string().required(),
  type: Joi.string().required(),
  docType: Joi.string().valid(...documentType).optional(),
  idType: Joi.string().valid(...idType).optional(),
});


export const documentUploadSchema = Joi.object({
  documentName: Joi.string().required(),
  apartmentsId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
  size: Joi.string().optional(),
  type: Joi.string().optional(),
  docType: Joi.string().valid(...documentType).required()
});


export const updatePropertyDocumentSchema = Joi.object({
  name: Joi.string().optional(),
  documentUrl: Joi.string().uri().optional(),
  apartmentsId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
  size: Joi.string().optional(),
  type: Joi.string().optional(),
});

// property listing schema
const listingTypes = Object.values(ListingType);
const shortletType = Object.values(ShortletType);

export const createPropertyListingSchema = Joi.object({
  payApplicationFee: Joi.boolean().required(),
  isShortlet: Joi.boolean().required(),
  shortletDuration: Joi.string().valid(...shortletType).default(ShortletType.MONTHLY).required(),
  type: Joi.string().valid(...listingTypes).default(ListingType.LISTING_WEBSITE).required(),
  propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
});
export const updatePropertyListingSchema = Joi.object({
  payApplicationFee: Joi.boolean().optional(),
  isShortlet: Joi.boolean().optional(),
  shortletDuration: Joi.string().valid(...shortletType).default(ShortletType.MONTHLY).optional(),
  type: Joi.string().valid(...listingTypes).default(ListingType.LISTING_WEBSITE).optional(),
  // propertyId: Joi.string().optional(),
  apartmentId: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  onListing: Joi.boolean().optional()
});

export const updateListingStatusSchema = Joi.object({
  isLeased: Joi.boolean().required(),
});


// new design 
export const createPropertyViewingSchema = Joi.object({
  isLiked: Joi.boolean().optional(),
  propertyId: Joi.string().required(),
  review: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

export const updatePropertyViewingSchema = Joi.object({
  propertyId: Joi.string().optional(),
  isLiked: Joi.boolean().optional(),
  review: Joi.string().optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});


export const PropertyValidation = {
  createProperty: Joi.object({
    // Core Property Fields
    name: Joi.string().required().max(255),
    title: Joi.string().required().max(255),
    description: Joi.string().optional().allow(''),
    shortDescription: Joi.string().optional().max(500),
    propertysize: Joi.number().optional().positive(),
    showCase: Joi.boolean().default(false),

    // Market Values
    marketValue: Joi.number().precision(2).optional(),
    rentalFee: Joi.number().precision(2).optional(),
    initialDeposit: Joi.number().precision(2).optional(),
    dueDate: Joi.date().optional(),

    // Features
    noBedRoom: Joi.number().integer().min(0).default(1),
    noKitchen: Joi.number().integer().min(0).default(1),
    noGarage: Joi.number().integer().min(0).default(0),
    noBathRoom: Joi.number().integer().min(0).default(1),
    noReceptionRooms: Joi.number().integer().min(0).default(0),
    totalArea: Joi.string().optional(),
    areaUnit: Joi.string().default('sq-ft'),
    yearBuilt: Joi.date().optional(),
    councilTaxBand: Joi.string().optional(),
    tenure: Joi.string().default('freehold'),
    leaseYearsRemaining: Joi.string().optional(),
    groundRent: Joi.string().optional(),
    serviceCharge: Joi.string().optional(),

    // Address
    city: Joi.string().required(),
    // stateId: Joi.string().optional(),
    country: Joi.string().required(),
    zipcode: Joi.string().required(),
    location: Joi.string().optional(),
    longitude: Joi.number().precision(6).optional(),
    latitude: Joi.number().precision(6).optional(),

    // Media
    images: Joi.array().items(Joi.string().uri()).optional(),
    videos: Joi.array().items(Joi.string().uri()).optional(),
    virtualTours: Joi.array().items(Joi.string().uri()).optional(),

    // Pricing
    price: Joi.string().required(),
    currency: Joi.string().required().default('NGN'),
    priceFrequency: Joi.valid(...Object.values(PriceFrequency)).optional(),
    rentalPeriod: Joi.string().optional(),

    // Availability
    availability: Joi.valid(...Object.values(PropsApartmentStatus)).default('VACANT'),
    availableFrom: Joi.date().optional(),
    type: Joi.valid(...Object.values(PropertyType)).default('SINGLE_UNIT'),

    // Specifications
    specificationType: Joi.valid(...Object.values(PropertySpecificationType)).default('RESIDENTIAL'),

    // Residential Specific
    residential: Joi.object({
      // Core Details
      bedrooms: Joi.number().integer().min(1).required(),
      bathrooms: Joi.number().precision(1).min(1).required(),
      toilets: Joi.number().integer().min(0).optional(),
      furnished: Joi.boolean().default(false),
      serviced: Joi.boolean().default(false),
      shared: Joi.boolean().default(false),

      // Features
      features: Joi.array().items(Joi.string()).optional(),
      customFeatures: Joi.array().items(Joi.string()).optional(),

      // Nearby Amenities
      nearbyAmenities: Joi.array().items(Joi.string()).optional(),
      customNearbyAmenities: Joi.array().items(Joi.string()).optional(),
      amenityDistances: Joi.object().optional(),

      // Property Details
      totalArea: Joi.string().optional(),
      areaUnit: Joi.valid(...Object.values(AreaUnit)).optional(),
      parkingSpaces: Joi.number().integer().min(0).optional(),
      petPolicy: Joi.string().optional(),
      rentalTerms: Joi.string().optional(),
      securityDeposit: Joi.string().optional(),
      utilities: Joi.array().items(Joi.string()).optional(),

      // Additional Features
      propertyCondition: Joi.string().optional(),
      balcony: Joi.boolean().default(false),
      garden: Joi.boolean().default(false),
      gym: Joi.boolean().default(false),
      pool: Joi.boolean().default(false),
      security: Joi.boolean().default(false),

      // Utilities
      waterSupply: Joi.string().optional(),
      powerSupply: Joi.string().optional(),
      internetAvailable: Joi.boolean().default(false),
      internetSpeed: Joi.string().optional(),
      furnishingDetails: Joi.string().optional(),
      renovationYear: Joi.string().optional()
    }).when('specificationType', {
      is: PropertySpecificationType.RESIDENTIAL,
      then: Joi.required()
    }),

    // Commercial Specific
    commercial: Joi.object({
      // Core Details
      totalArea: Joi.string().required(),
      areaUnit: Joi.valid(...Object.values(AreaUnit)).required(),
      minLeaseTerm: Joi.string().required(),
      maxLeaseTerm: Joi.string().optional(),
      leaseTermUnit: Joi.valid(...Object.values(LeaseTermUnit)).required(),
      businessRates: Joi.string().optional(),
      serviceCharge: Joi.string().optional(),
      buildingClass: Joi.valid(...Object.values(BuildingClass)).optional(),
      lastRefurbished: Joi.string().optional(),
      floorNumber: Joi.number().integer().optional(),
      totalFloors: Joi.number().integer().optional(),
      parkingSpaces: Joi.number().integer().min(0).optional(),

      // Property Types
      isOfficeSpace: Joi.boolean().default(false),
      isWarehouse: Joi.boolean().default(false),
      isHighRise: Joi.boolean().default(false),
      isMultiUnit: Joi.boolean().default(false),
      isRetail: Joi.boolean().default(false),
      isIndustrial: Joi.boolean().default(false),

      // Office Details
      workstations: Joi.number().integer().min(0).optional(),
      meetingRooms: Joi.number().integer().min(0).optional(),
      hasReception: Joi.boolean().default(false),
      officeLayout: Joi.valid(...Object.values(OfficeLayout)).optional(),

      // Warehouse Details
      clearHeight: Joi.string().optional(),
      loadingDoorsCount: Joi.number().integer().optional(),
      powerSupply: Joi.string().optional(),
      floorLoad: Joi.string().optional(),
      columnSpacing: Joi.string().optional(),
      hasYard: Joi.boolean().default(false),
      yardDepth: Joi.string().optional(),

      // Features
      features: Joi.array().items(Joi.string()).optional(),
      customFeatures: Joi.array().items(Joi.string()).optional(),
      nearbyAmenities: Joi.array().items(Joi.string()).optional(),
      customNearbyAmenities: Joi.array().items(Joi.string()).optional(),
      amenityDistances: Joi.object().optional(),

      // Energy
      epcRating: Joi.string().optional(),
      energyEfficiencyRating: Joi.number().integer().optional(),
      environmentalImpactRating: Joi.number().integer().optional(),
      heatingTypes: Joi.array().items(Joi.string()).optional(),
      coolingTypes: Joi.array().items(Joi.string()).optional(),
      hasGreenCertification: Joi.boolean().default(false),
      greenCertificationType: Joi.string().optional(),
      greenCertificationLevel: Joi.string().optional(),

      // Security Features
      securityFeatures: Joi.array().items(Joi.string()).optional(),

      // Key Features
      keyFeatures: Joi.array().items(Joi.string()).optional(),
      customKeyFeatures: Joi.array().items(Joi.string()).optional(),

      // Additional Fields
      internetSpeed: Joi.string().optional(),
      hasElevator: Joi.boolean().default(false),
      hasLoadingBay: Joi.boolean().default(false),
      hasSprinklerSystem: Joi.boolean().default(false),
      hasAlarmSystem: Joi.boolean().default(false),
      hasCCTV: Joi.boolean().default(false),
      has24HrAccess: Joi.boolean().default(false),
      hasBackupGenerator: Joi.boolean().default(false),
      fitOutIncluded: Joi.boolean().default(false),
      fitOutDetails: Joi.string().optional(),
      leaseTerm: Joi.string().optional(),
      leaseTermNegotiable: Joi.boolean().default(true),
      rentReviewPeriod: Joi.string().optional(),
      breakClause: Joi.string().optional(),
      rentFreeOffered: Joi.boolean().default(false),
      rentFreePeriod: Joi.string().optional(),

      // Unit Configurations
      unitConfigurations: Joi.array().items(
        Joi.object({
          unitType: Joi.string().required(),
          unitNumber: Joi.string().optional(),
          floorNumber: Joi.number().integer().required(),
          area: Joi.string().required(),
          price: Joi.string().required(),
          available: Joi.boolean().default(true),
          description: Joi.string().optional()
        })
      ).optional(),

      // Floor Configurations
      floorAvailability: Joi.array().items(
        Joi.object({
          floorNumber: Joi.number().integer().required(),
          area: Joi.string().required(),
          price: Joi.string().required(),
          available: Joi.boolean().default(true),
          partialFloor: Joi.boolean().default(false),
          description: Joi.string().optional()
        })
      ).optional(),

      commercialPropertyUnit: Joi.object({
        unitType: Joi.string().required(),
        unitNumber: Joi.string().optional(),
        floorNumber: Joi.number().integer().required(),
        area: Joi.string().required(),
        price: Joi.string().required(),
        available: Joi.boolean().default(true),
        description: Joi.string().optional()
      }),

      commercialPropertyFloor: Joi.object({
        floorNumber: Joi.number().integer().required(),
        area: Joi.string().required(),
        price: Joi.string().required(),
        available: Joi.boolean().default(true),
        partialFloor: Joi.boolean().default(false),
        description: Joi.string().optional()
      })
    }).when('specificationType', {
      is: PropertySpecificationType.COMMERCIAL,
      then: Joi.required()
    }),

    // Shotlet Specific
    shotlet: Joi.object({
      // Host Information
      hostName: Joi.string().required(),
      hostPhotoUrl: Joi.string().uri().optional(),

      // Property Details
      bedrooms: Joi.number().integer().min(1).required(),
      beds: Joi.number().integer().min(1).required(),
      bathrooms: Joi.number().precision(1).min(1).required(),
      maxGuests: Joi.number().integer().min(1).required(),
      propertySize: Joi.string().optional(),
      sizeUnit: Joi.valid(...Object.values(AreaUnit)).optional(),
      floorLevel: Joi.number().integer().optional(),
      totalFloors: Joi.number().integer().optional(),
      renovationYear: Joi.string().optional(),

      // Amenities
      amenities: Joi.array().items(Joi.string()).optional(),
      customAmenities: Joi.array().items(Joi.string()).optional(),
      nearbyAttractions: Joi.array().items(Joi.string()).optional(),
      customNearbyAttractions: Joi.array().items(Joi.string()).optional(),
      attractionDistances: Joi.object().optional(),
      safetyFeatures: Joi.array().items(Joi.string()).optional(),
      customSafetyFeatures: Joi.array().items(Joi.string()).optional(),

      // Availability & Pricing
      minStayDays: Joi.number().integer().min(1).required(),
      maxStayDays: Joi.number().integer().min(1).required(),
      availableTo: Joi.date().optional(),
      cleaningFee: Joi.string().optional(),
      securityDeposit: Joi.string().optional(),
      weeklyDiscount: Joi.string().optional(),
      monthlyDiscount: Joi.string().optional(),
      unavailableDates: Joi.array().items(Joi.date()).optional(),

      // House Rules
      checkInTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      checkOutTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      instantBooking: Joi.boolean().default(false),
      allowChildren: Joi.boolean().default(true),
      allowInfants: Joi.boolean().default(true),
      allowPets: Joi.boolean().default(false),
      allowSmoking: Joi.boolean().default(false),
      allowParties: Joi.boolean().default(false),
      quietHours: Joi.boolean().default(false),
      quietHoursStart: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
      quietHoursEnd: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
      additionalRules: Joi.array().items(Joi.string()).optional(),

      // Booking & Policies
      cancellationPolicy: Joi.valid(...Object.values(CancellationPolicy)).required(),
      customCancellationPolicy: Joi.string().optional(),
      houseManual: Joi.string().optional(),
      checkInInstructions: Joi.string().required(),
      localRecommendations: Joi.string().optional(),
      emergencyContact: Joi.string().required(),

      // Amenity Flags
      hasWifi: Joi.boolean().default(true),
      wifiSpeed: Joi.string().optional(),
      hasTV: Joi.boolean().default(false),
      hasKitchen: Joi.boolean().default(true),
      hasWasher: Joi.boolean().default(false),
      hasDryer: Joi.boolean().default(false),
      hasAirConditioning: Joi.boolean().default(false),
      hasHeating: Joi.boolean().default(false),
      hasWorkspace: Joi.boolean().default(false),
      hasPool: Joi.boolean().default(false),
      hasHotTub: Joi.boolean().default(false),
      hasFreeParking: Joi.boolean().default(false),
      hasGym: Joi.boolean().default(false),
      hasBreakfast: Joi.boolean().default(false),
      hasSelfCheckin: Joi.boolean().default(false),
      hasBalcony: Joi.boolean().default(false),
      hasGarden: Joi.boolean().default(false),
      hasBBQ: Joi.boolean().default(false),
      hasFireplace: Joi.boolean().default(false),
      hasBeachAccess: Joi.boolean().default(false),
      hasLakeAccess: Joi.boolean().default(false),
      hasMountainView: Joi.boolean().default(false),
      hasOceanView: Joi.boolean().default(false),
      hasCityView: Joi.boolean().default(false)
    }).when('specificationType', {
      is: PropertySpecificationType.SHORTLET,
      then: Joi.required()
    }),

    // Additional Fields
    amenities: Joi.array().items(Joi.string()).optional(),
    customFeatures: Joi.array().items(Joi.string()).optional(),
    nearbyAmenities: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        distance: Joi.string().optional()
      })
    ).optional(),

    // Unit Configurations
    unitConfigurations: Joi.array().items(
      Joi.object({
        unitType: Joi.string().required(),
        count: Joi.number().required(),
        bedrooms: Joi.number().required(),
        bathrooms: Joi.number().required(),
        price: Joi.string().required()
      })
    ).optional(),

    // Shared Facilities
    sharedFacilities: Joi.object({
      kitchen: Joi.boolean().default(false),
      bathroom: Joi.boolean().default(false),
      livingRoom: Joi.boolean().default(false),
      garden: Joi.boolean().default(false),
      laundry: Joi.boolean().default(false),
      parking: Joi.boolean().default(false),
      other: Joi.string().optional()
    }).optional(),


    // Property Specific Details
    hasLift: Joi.boolean().default(false),
    gardenType: Joi.string().optional(),
    gardenSize: Joi.string().optional(),
    parkingSpaces: Joi.number().integer().min(0).default(0),
    garageType: Joi.string().optional(),

    // Contact & Additional Information
    contactName: Joi.string().optional(),
    contactCompany: Joi.string().optional(),
    companyLogoUrl: Joi.string().uri().optional(),
    viewingArrangements: Joi.string().optional(),
    keyFeatures: Joi.array().items(Joi.string()).optional(),
    customKeyFeatures: Joi.array().items(Joi.string()).optional(),
    additionalNotes: Joi.string().optional(),

    // Multi-unit properties
    isMultiUnit: Joi.boolean().default(false),
    totalUnits: Joi.number().integer().min(0).optional(),
    totalFloors: Joi.number().integer().min(0).optional(),
    unitsPerFloor: Joi.number().integer().min(0).optional(),

    // HMO specific
    isHMO: Joi.boolean().default(false),
    hmoLicensed: Joi.boolean().default(false),
    hmoLicenseNumber: Joi.string().optional(),
    hmoLicenseExpiry: Joi.string().optional(),
    hmoMaxOccupants: Joi.number().integer().min(0).optional(),

    // Room rental specific
    isRoomRental: Joi.boolean().default(false),
    roomDetails: Joi.array().items(
      Joi.object({
        roomName: Joi.string().required(),
        roomSize: Joi.string().optional(),
        ensuite: Joi.boolean().default(false),
        price: Joi.string().required(),
        availability: Joi.valid(...Object.values(PropsApartmentStatus)).default('VACANT')
      })
    ).optional(),
    // Energy and Sustainability
    epcRating: Joi.string().optional(),
    energyEfficiencyRating: Joi.number().integer().default(0),
    environmentalImpactRating: Joi.number().integer().default(0),
    heatingTypes: Joi.array().items(Joi.string()).optional(),
    glazingType: Joi.string().optional(),
  }).xor(PropertySpecificationType.RESIDENTIAL, PropertySpecificationType.COMMERCIAL, "SHORTLET")
  .with('isMultiUnit', ['totalUnits', 'totalFloors'])
  .with('isHMO', ['hmoLicensed'])
  .with('isRoomRental', ['roomDetails'])
};

