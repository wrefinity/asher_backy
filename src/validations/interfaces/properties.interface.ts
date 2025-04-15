import { PropertyType, RoomDetail, PriceFrequency, OfficeLayout, LeaseTermUnit, BuildingClass, CancellationPolicy, AreaUnit, DocumentType, IdType, PropertySpecificationType, PropsApartmentStatus } from "@prisma/client"

export interface IPropertyDocument {
    id?: string;
    documentName: string;
    documentUrl: string[];
    createdAt?: Date;
    updatedAt?: Date;
    apartmentsId?: string;
    propertyId?: string;
    uploadedBy?: string;
    docType?: DocumentType;
    idType?: IdType;
}

export interface ICreateProperty {
    name: string;
    description: string;
    propertysize?: number;
    landlordId: string;
    agencyId?: string;
    yearBuilt?: Date;
    city: string;
    stateId: string;
    country: string;
    currency: string;
    zipcode: string;
    location?: string;
    useTypeCategory?: string;
    images?: string[];
    videourl?: string[];
    amenities?: string[];
    totalApartments?: number;
    noBedRoom?: number;
    noKitchen?: number;
    noGarage?: number;
    noBathRoom?: number;
    rentalFee?: number;
    initialDeposit?: number;
    latitude?: number;
    longitude?: number;
    type?: PropertyType;
    specificationType?: PropertySpecificationType;
}

export interface PropertyViewingIF {
    id?: string;
    userId: string;
    propertyId: string;
    isLiked?: boolean;
    review?: string;
    rating?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// TypeScript Interfaces
export interface CreatePropertyIF {
    // Core Property
    name: string;
    title: string;
    description?: string;
    shortDescription?: string;
    propertysize?: number;
    isDeleted?: boolean;
    showCase?: boolean;
    landlordId: string;
    agencyId?: string;
    
    // Market Values
    marketValue?: number;
    rentalFee?: number;
    initialDeposit?: number;
    dueDate?: Date;
  
    // Features
    noBedRoom?: number;
    noKitchen?: number;
    noGarage?: number;
    noBathRoom?: number;
    noReceptionRooms?: number;
    totalArea?: string;
    areaUnit?: string;
    yearBuilt?: Date;
    councilTaxBand?: string;
    tenure?: string;
    leaseYearsRemaining?: string;
    groundRent?: string;
    serviceCharge?: string;
  
    // Address
    city: string;
    stateId?: string;
    country: string;
    zipcode: string;
    location?: string;
    longitude?: number;
    latitude?: number;
  
    // Media
    images?: string[];
    videos?: string[];
    virtualTours?: string[];
  
    // Pricing
    price?: string;
    currency?: string;
    priceFrequency?: PriceFrequency;
    rentalPeriod?: string;
  
    // Specifications
    specificationType?: PropertySpecificationType;
    useTypeCategory?: string;
    residential?: IResidentialProperty;
    commercial?: ICommercialProperty;
    shotlet?: IShotletProperty;
  
    // Additional Fields
    amenities?: string[];
    customFeatures?: string[];
    nearbyAmenities?: INearbyAmenity[];
    unitConfigurations?: IUnitConfiguration[];
    sharedFacilities?: ISharedFacilities;
    availability?: PropsApartmentStatus;
    type?: PropertyType;

    // Property Specific Details
    hasLift?: boolean;
    gardenType?: string;
    gardenSize?: string;
    parkingSpaces?: number;
    garageType?: string;

    // Contact & Additional Information
    contactName?: string;
    contactCompany?: string;
    companyLogoUrl?: string;
    viewingArrangements?: string;
    keyFeatures?: string[];
    customKeyFeatures?: string[];
    additionalNotes?: string;

    // Multi-unit properties
    isMultiUnit?: boolean;
    totalUnits?: number;
    totalFloors?: number;
    unitsPerFloor?: number;

    // HMO specific
    isHMO?: boolean;
    hmoLicensed?: boolean;
    hmoLicenseNumber?: string;
    hmoLicenseExpiry?: string;
    hmoMaxOccupants?: number;

    // Room rental specific
    isRoomRental?: boolean;
    roomDetails?: RoomDetail[];

    // Energy and Sustainability
    epcRating?: string;
    energyEfficiencyRating?: number;
    environmentalImpactRating?: number;
    heatingTypes?: string[];
    glazingType?: string;
}
  
  interface INearbyAmenity {
    name: string;
    distance?: string;
  }
  
  interface IUnitConfiguration {
    unitType: string;
    count: number;
    bedrooms: number;
    bathrooms: number;
    price: string;
  }
  
  interface ISharedFacilities {
    kitchen?: boolean;
    bathroom?: boolean;
    livingRoom?: boolean;
    garden?: boolean;
    laundry?: boolean;
    parking?: boolean;
    other?: string;
  }
export interface IShotletProperty {
    // Host Information
    hostName: string;
    hostPhotoUrl?: string;

    // Property Details
    bedrooms: number;
    beds: number;
    bathrooms: number;
    maxGuests: number;
    propertySize?: string;
    sizeUnit?: AreaUnit;
    floorLevel?: number;
    totalFloors?: number;
    renovationYear?: string;

    // Amenities
    amenities?: string[];
    customAmenities?: string[];
    nearbyAttractions?: string[];
    customNearbyAttractions?: string[];
    attractionDistances?: Record<string, unknown>;
    safetyFeatures?: string[];
    customSafetyFeatures?: string[];

    // Availability & Pricing
    minStayDays: number;
    maxStayDays: number;
    availableTo?: Date;
    cleaningFee?: string;
    securityDeposit?: string;
    weeklyDiscount?: string;
    monthlyDiscount?: string;
    unavailableDates?: Date[];

    // House Rules
    checkInTime: string;
    checkOutTime: string;
    instantBooking?: boolean;
    allowChildren?: boolean;
    allowInfants?: boolean;
    allowPets?: boolean;
    allowSmoking?: boolean;
    allowParties?: boolean;
    quietHours?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    additionalRules?: string[];

    // Booking & Policies
    cancellationPolicy: CancellationPolicy;
    customCancellationPolicy?: string;
    houseManual?: string;
    checkInInstructions: string;
    localRecommendations?: string;
    emergencyContact: string;

    // Amenity Flags
    hasWifi?: boolean;
    wifiSpeed?: string;
    hasTV?: boolean;
    hasKitchen?: boolean;
    hasWasher?: boolean;
    hasDryer?: boolean;
    hasAirConditioning?: boolean;
    hasHeating?: boolean;
    hasWorkspace?: boolean;
    hasPool?: boolean;
    hasHotTub?: boolean;
    hasFreeParking?: boolean;
    hasGym?: boolean;
    hasBreakfast?: boolean;
    hasSelfCheckin?: boolean;
    hasBalcony?: boolean;
    hasGarden?: boolean;
    hasBBQ?: boolean;
    hasFireplace?: boolean;
    hasBeachAccess?: boolean;
    hasLakeAccess?: boolean;
    hasMountainView?: boolean;
    hasOceanView?: boolean;
    hasCityView?: boolean;
}

export interface IResidentialProperty {
    // Core Details
    bedrooms: number;
    bathrooms: number;
    toilets?: number;
    furnished?: boolean;
    serviced?: boolean;
    shared?: boolean;

    // Features
    features?: string[];
    customFeatures?: string[];

    // Nearby Amenities
    nearbyAmenities?: string[];
    customNearbyAmenities?: string[];
    amenityDistances?: Record<string, unknown>;

    // Property Details
    totalArea?: string;
    areaUnit?: AreaUnit;
    parkingSpaces?: number;
    petPolicy?: string;
    rentalTerms?: string;
    securityDeposit?: string;
    utilities?: string[];

    // Additional Features
    propertyCondition?: string;
    balcony?: boolean;
    garden?: boolean;
    gym?: boolean;
    pool?: boolean;
    security?: boolean;

    // Utilities
    waterSupply?: string;
    powerSupply?: string;
    internetAvailable?: boolean;
    internetSpeed?: string;
    furnishingDetails?: string;
    renovationYear?: string;
}

export interface ICommercialProperty {
    // Core Details
    totalArea: string;
    areaUnit: AreaUnit;
    minLeaseTerm: string;
    maxLeaseTerm?: string;
    leaseTermUnit: LeaseTermUnit;
    businessRates?: string;
    serviceCharge?: string;
    buildingClass?: BuildingClass;
    lastRefurbished?: string;
    floorNumber?: number;
    totalFloors?: number;
    parkingSpaces?: number;

    // Property Types
    isOfficeSpace?: boolean;
    isWarehouse?: boolean;
    isHighRise?: boolean;
    isMultiUnit?: boolean;
    isRetail?: boolean;
    isIndustrial?: boolean;

    // Office Details
    workstations?: number;
    meetingRooms?: number;
    hasReception?: boolean;
    officeLayout?: OfficeLayout;

    // Warehouse Details
    clearHeight?: string;
    loadingDoorsCount?: number;
    powerSupply?: string;
    floorLoad?: string;
    columnSpacing?: string;
    hasYard?: boolean;
    yardDepth?: string;

    // Features
    features?: string[];
    customFeatures?: string[];
    nearbyAmenities?: string[];
    customNearbyAmenities?: string[];
    amenityDistances?: Record<string, unknown>;

    // Energy
    epcRating?: string;
    energyEfficiencyRating?: number;
    environmentalImpactRating?: number;
    heatingTypes?: string[];
    coolingTypes?: string[];
    hasGreenCertification?: boolean;
    greenCertificationType?: string;
    greenCertificationLevel?: string;

    // Security
    securityFeatures?: string[];

    // Key Features
    keyFeatures?: string[];
    customKeyFeatures?: string[];

    // Additional Fields
    internetSpeed?: string;
    hasElevator?: boolean;
    hasLoadingBay?: boolean;
    hasSprinklerSystem?: boolean;
    hasAlarmSystem?: boolean;
    hasCCTV?: boolean;
    has24HrAccess?: boolean;
    hasBackupGenerator?: boolean;
    fitOutIncluded?: boolean;
    fitOutDetails?: string;
    leaseTerm?: string;
    leaseTermNegotiable?: boolean;
    rentReviewPeriod?: string;
    breakClause?: string;
    rentFreeOffered?: boolean;
    rentFreePeriod?: string;

    // Relationships
    unitConfigurations?: ICommercialPropertyUnit[];
    floorAvailability?: ICommercialPropertyFloor[];
}

export interface ICommercialPropertyUnit {
    unitType: string;
    unitNumber?: string;
    floorNumber: number;
    area: string;
    price: string;
    available?: boolean;
    description?: string;
}

export interface ICommercialPropertyFloor {
    floorNumber: number;
    area: string;
    price: string;
    available?: boolean;
    partialFloor?: boolean;
    description?: string;
}