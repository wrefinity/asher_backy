import {
    PropertyType, PropertyStatus, TensureType, AvailabilityStatus, Currency, VatStatus, RoomDetail, GarageType, GlazingType, PriceFrequency, OfficeLayout, LeaseTermUnit, BuildingClass, CancellationPolicy, AreaUnit, DocumentType, IdType, PropertySpecificationType,
    MediaType, BookingStatus, ShortletProperty, ResidentialProperty, CommercialProperty, bills
} from "@prisma/client"

export interface IPropertyDocument {
    id?: string;
    documentName: string;
    documentUrl: string[];
    createdAt?: Date;
    updatedAt?: Date;
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
    yearBuilt?: number;
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


interface INearbyAmenity {
    name: string;
    distance?: string;
}




export interface CommercialPropertyFloor {
    id: string;
    floorNumber: number;
    area: string;
    price: string;
    available?: boolean;
    partialFloor?: boolean;
    description?: string;
}


export interface IBasePropertyDTO {
    name: string;
    description?: string;
    landlordId?: string;
    agencyId?: string;

    propertySize?: number;
    areaUnit?: AreaUnit;
    yearBuilt?: number;

    city: string;
    stateId: string;
    country: string;
    zipcode: string;
    address: string;
    address2?: string;
    latitude?: number;
    longitude?: number;
    propertyValue?: number;
    purchaseType?: string;
    //
    currency?: Currency;
    marketValue?: number;
    price?: number;
    securityDeposit?: number;
    // initialDeposit?: number;
    priceFrequency?: PriceFrequency;
    rentalPeriod?: string;
    specificationType: PropertySpecificationType;

    availability?: AvailabilityStatus
    // UK specifics
    businessRateVerified?: boolean;
    postalCodeVerified?: boolean
    landRegistryNumber?: string;
    vatStatus?: VatStatus;

    keyFeatures: string[];
    customKeyFeatures: string[];
    // nearbyAmenities: string[];
    // customNearbyAmenities: string[];
    // amenityDistances?: Record<string, number>;

    propertyDocument: PropertyDocument[]
    image?: PropertyMediaFiles[]
    videos?: PropertyMediaFiles[]
    virtualTours?: PropertyMediaFiles[]
}

export interface ISharedFacilities {
    id?: string;
    kitchen?: boolean;
    bathroom?: boolean;
    livingRoom?: boolean;
    garden?: boolean;
    garage?: boolean;
    laundry?: boolean;
    parking?: boolean;
    other?: string;
}

export interface IRoomDetail {
    id?: string;
    roomName?: string;
    roomSize?: string;
    ensuite?: boolean;
    count?: number;
    price?: string;
    priceFrequency?: PriceFrequency;
    availability?: AvailabilityStatus;
}

export interface Booking {
    id?: string;
    checkInDate: Date;
    checkOutDate: Date;
    guestCount: number;
    totalPrice: string;
    status: BookingStatus;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    specialRequests?: string;
    paymentStatus?: string;
    paymentMethod?: string;
    transactionReference?: string;
    shortletId?: string;
}


export interface PropertyMediaFiles {
    id?: string
    url: string
    caption?: string
    isPrimary?: boolean
    fileType?: string
    type: MediaType
}

export interface PropertyDocument {
    id?: string
    documentName: string
    documentUrl: string[]
    size?: string
    type?: string
    idType?: IdType
    docType?: DocumentType
    agreementId?: string
    applicationId?: string
    propertyId?: string
    uploadedBy?: string
}

export interface IUnitConfiguration {
    id?: string;
    unitType: string;
    unitNumber: string;
    floorNumber: number;
    count?: number;
    bedrooms?: number;
    bathrooms?: number;
    price: string;
    priceFrequency?: PriceFrequency;
    area?: string;
    description?: string;
}
export interface UnavailableDate {
    id?: string;
    date: Date;
    shortletId?: string;
}
export interface SeasonalPricing {
    id?: string;
    seasonName: string;
    startDate: Date;
    endDate: Date;
    price: string;
    propertyId: string;
}

export interface HostLanguage {
    id: string;
    language: string;
    shortletId?: string;
}

export interface AdditionalRule {
    id?: string;
    rule: string;
    shortletId?: string;
}

export interface SuitableUse {
    id: string;
    name: string;
}

export interface IResidentialDTO {
    id?: string;
    status: PropertyStatus;
    bedrooms?: number;
    bathrooms?: number;
    receiptionRooms?: number;
    toilets?: number;
    tenure?: TensureType;
    furnished?: boolean;
    renovationYear?: string;
    councilTaxBand?: String;
    garageType?: GarageType;
    yearBuilt?: number;
    floorLevel?: number;

    // Additional details
    totalArea?: string;
    areaUnit?: AreaUnit;
    rentalTerms?: string;
    utilities?: string[];


    // dettached_house specifics
    garden?: string;
    gardenSize?: string;
    houseStyle?: string;
    numberOfStories?: string;
    outdoorsSpacesFeatures?: string[];


    // shared room and hmo specifics
    roomDetails?: IRoomDetail[];
    sharedFacilities?: ISharedFacilities;
    otherSharedFacilities?: string[];
    houseRule?: string;
    maxOccupant?: number;
    isHMO?: boolean;
    isShareHouse?: boolean;
    isHMOLicenced?: boolean;
    hmoLicenceNumber?: string;
    hmoLicenceExpiryDate?: Date;
    totalOccupants?: number;
    occupantsDetails?: string;

    // unit configuration for highrise build type
    unitConfigurations?: IUnitConfiguration[];
    totalFloors?: number;
    unitPerFloors?: number;
    totalUnits?: number;
    buildingAmenityFeatures?: string[];
    safetyFeatures?: string[];
    customSafetyFeatures?: string[];

    epcRating?: string;
    energyEfficiencyRating?: number;
    environmentalImpactRating?: number
    heatingTypes?: string[];
    coolingTypes?: string[];
    glazingTypes?: GlazingType;

    bills?: string[];
    additionalNotes?: string
}

export interface ICommercialDTO {

    id?: string;
    totalArea: String;
    areaUnit: AreaUnit;
    businessRates?: string;
    serviceCharge?: number;

    // Lease terms
    leaseTermUnit: LeaseTermUnit;
    minimumLeaseTerm: number;
    maximumLeaseTerm: number;

    buildingClass?: BuildingClass;
    lastRefurbished?: string;
    totalFloors?: number;
    zoning?: string;
    yearBuilt?: number;
    totalRooms?: number;
    parkingSpaces?: number;
    floorLevel?: number;
    availableFrom?: Date;

    // Office Space Details
    floorNumber?: number;
    workstations?: number;
    meetingRooms?: number;
    officeLayout?: OfficeLayout;

    // High-rise building specific
    highRiseFloors?: number;
    floorAvailability?: CommercialPropertyFloor[]

    // Warehouse Details
    securityFeatures?: string[]
    clearHeight?: string;
    loadingDoorsCount?: string;
    powerSupply?: string;
    floorLoad?: string;
    columnSpacing?: string;
    hasYard?: boolean;
    yardDepth?: string;

    safetyFeatures: string[];
    customSafetyFeatures: string[];

    // Energy and Sustainability
    epcRating?: string;
    energyEfficiencyRating?: number;
    environmentalImpactRating?: number;
    heatingTypes?: string[];
    coolingTypes?: string[];
    hasGreenCertification?: boolean;
    greenCertificationType?: string;
    greenCertificationLevel?: string;

    // Multi-unit properties
    totalUnits?: number;
    unitConfigurations?: IUnitConfiguration[];

    // Additional commercial-specific fields
    leaseTerm?: string;
    leaseTermNegotiable?: boolean;
    rentReviewPeriod?: boolean;
    breakClause?: boolean;
    rentFreeOffered?: boolean;
    rentFreePeriod?: string;

    // shared room and hmo specifics
    roomDetails?: IRoomDetail[];
    sharedFacilities?: ISharedFacilities;
    otherSharedFacilities: string[];
    houseRule: string;
    maxOccupant?: number;
    isHMO?: boolean;
    isShareHouse?: boolean;
    isHMOLicenced?: boolean;
    hmoLicenceNumber?: string;
    hmoLicenceExpiryDate?: Date;
    totalOccupants?: number;
    occupantsDetails?: string;

    suitableFor?: string[];
}

export interface IShortletDTO {
    id: string;
    // house type specifics 
    lotSize?: number;
    garageSpaces?: number;
    outdoorsSpacesFeatures?: string[];

    // apartment specifics
    buildingName: string;
    unitNumber: number;
    buildingAmenityFeatures?: string[];

    // Property Details
    bedrooms: number;
    beds: number;
    bathrooms: number;
    maxGuests?: number;
    propertySize?: string;
    sizeUnit?: AreaUnit;
    floorLevel?: number;
    totalFloors?: number;
    renovationYear?: string;
    yearBuilt?: string;
    furnished?: boolean;

    safetyFeatures: string[];
    customSafetyFeatures: string[];

    // Availability && Pricing
    minStayDays: number;
    maxStayDays: number;
    availableFrom?: Date;
    availableTo?: Date;
    basePrice: number;
    cleaningFee?: number;
    weeklyDiscount?: number;
    monthlyDiscount?: number;

    // House Rules
    checkInTime?: string;
    checkOutTime?: string;
    instantBooking: boolean;
    allowChildren: boolean;
    allowInfants: boolean;
    allowPets: boolean;
    allowSmoking: boolean;
    allowParties: boolean;
    quietHours: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;

    cancellationPolicy?: CancellationPolicy;
    customCancellationPolicy?: string;
    houseManual?: string;
    checkInInstructions: string;
    localRecommendations?: string;
    emergencyContact?: string;

    hostName?: string;
    hostPhotoUrl?: string;
    responseRate?: number;
    responseTime?: string;
    isSuperhost: boolean;
    joinedDate?: Date;

    // shared room and hmo specifics
    roomDetails?: IRoomDetail[];
    sharedFacilities?: ISharedFacilities;
    otherSharedFacilities: string[];
    houseRule: string;
    maxOccupant?: number;
    isHMO?: boolean;
    isShareHouse?: boolean;
    isHMOLicenced?: boolean;
    hmoLicenceNumber?: string;
    hmoLicenceExpiryDate?: Date;
    totalOccupants?: number;
    occupantsDetails?: string;

    bookings?: Booking[];
    seasonalPricing?: SeasonalPricing[];
    unavailableDates?: Date[];
    hostLanguages?: string[];
    additionalRules?: string[];
}

// export interface PropertyFeature {
//     id?: string
//     name: string
//     type: PropertyFeatureType
//     isDeleted?: boolean
// }



export interface IPropertySpecificationDTO {
    id?: string;
    propertyId?: string;
    specificationType: PropertySpecificationType;
    propertySubType: PropertyType;
    otherTypeSpecific?: Record<string, any>;
    shortlet?: ShortletProperty;
    residential?: ResidentialProperty;
    commercial?: CommercialProperty;
    createdAt?: Date;
    updatedAt?: Date;

    residentialId?: string
    commercialId?: string
    shortletId?: string
}

export interface PropertySearchDto {
    propertyCategory?: PropertySpecificationType; // RESIDENTIAL | COMMERCIAL | SHORTLET
    propertyType?: PropertyType;                  // Subtype (e.g., APARTMENT, OFFICE, SHOP)
    location?: string;
    bedrooms?: number;
    bathrooms?: number;
    minRent?: number;
    maxRent?: number;
    leaseDuration?: number;
    moveInDate?: Date;

    // 🔹 Commercial-specific
    minSize?: number; // floor size min
    maxSize?: number; // floor size max
}
