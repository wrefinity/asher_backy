import { PropertyType, RoomDetail, PriceFrequency, OfficeLayout, LeaseTermUnit, BuildingClass, CancellationPolicy, AreaUnit, DocumentType, IdType, PropertySpecificationType, PropsApartmentStatus, MediaType, BookingStatus, PropertyFeatureType, ShortletProperty, ResidentialProperty, CommercialProperty } from "@prisma/client"

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

interface INearbyAmenity {
    name: string;
    distance?: string;
}


export interface CommercialPropertyUnit {
    id: string;
    unitType: string;
    unitNumber?: string;
    floorNumber: number;
    area: string;
    price: string;
    available?: boolean;
    description?: string;
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

export interface SuitableUse {
    id: string;
    name: string;
}

export interface ICommercialProperty {
    id: string;
    propertySubType: PropertyType;
    typeSpecific?: Record<string, any>;
    propertyId: string;

    totalArea: string;
    areaUnit: AreaUnit;
    businessRates?: string;
    serviceCharge?: number;
    leaseTermUnit: LeaseTermUnit;
    minimumLeaseTerm: number;
    maximumLeaseTerm?: number;
    securityDeposit: number;

    buildingClass?: BuildingClass;
    lastRefurbished?: string;
    floorNumber?: number;
    totalFloors?: number;
    zoning?: string;
    yearBuilt?: number;
    totalRooms: number;
    parkingSpaces?: number;
    floorLevel?: number;
    availableFrom?: Date;

    workstations?: number;
    meetingRooms?: number;
    officeLayout?: OfficeLayout;

    clearHeight?: string;
    loadingDoorsCount?: number;
    powerSupply?: string;
    floorLoad?: string;
    columnSpacing?: string;
    hasYard?: boolean;
    yardDepth?: string;

    nearbyAmenities: string[];
    customNearbyAmenities: string[];
    amenityDistances?: any;

    epcRating?: string;
    energyEfficiencyRating?: number;
    environmentalImpactRating?: number;
    heatingTypes: string[];
    coolingTypes: string[];
    hasGreenCertification?: boolean;
    greenCertificationType?: string;
    greenCertificationLevel?: string;

    totalUnits?: number;
    // unitConfigurations: CommercialPropertyUnit[];
    highRiseFloors?: number;
    // floorAvailability: CommercialPropertyFloor[];
    securityFeatures: string[];

    keyFeatures: string[];
    customKeyFeatures: string[];

    internetSpeed?: string;
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

    contactName?: string;
    contactCompany?: string;
    companyLogoUrl?: string;
    viewingArrangements?: string;

    elevator?: boolean;
    hasReception?: boolean;
    hasSecurity?: boolean;
    hasConferenceRoom?: boolean;
    hasCafeteria?: boolean;
    hasGym?: boolean;
    // suitableFor: SuitableUse[];
}

export interface IResidentialProperty {
    id?: string;
    propertyId: string;
    propertySubType: PropertyType;
    typeSpecific?: Record<string, any>;

    bedrooms: number;
    bathrooms: number;
    toilets?: number;
    halfBathrooms?: number;
    furnished?: boolean;
    parkingSpaces?: number;
    yearBuilt?: number;
    floorLevel?: number;
    totalFloors?: number;
    petsAllowed?: boolean;
    availableFrom?: Date;
    minimumStay?: number;
    maximumStay?: number;
    serviced?: boolean;
    shared?: boolean;

    features: string[];
    customFeatures: string[];

    nearbyAmenities: string[];
    customNearbyAmenities: string[];
    amenityDistances?: Record<string, number>;

    totalArea?: string;
    areaUnit?: AreaUnit;
    petPolicy?: string;
    rentalTerms?: string;
    securityDeposit?: string;
    utilities: string[];

    propertyCondition?: string;
    gym?: boolean;
    pool?: boolean;
    security?: boolean;
    waterSupply?: string;
    powerSupply?: string;
    internetAvailable?: boolean;
    internetSpeed?: string;
    furnishingDetails?: string;
    renovationYear?: string;

    waterIncluded?: boolean;
    electricityIncluded?: boolean;
    internetIncluded?: boolean;
    gasIncluded?: boolean;
    cableIncluded?: boolean;

    garden?: boolean;
    balcony?: boolean;
    patio?: boolean;
    roofDeck?: boolean;
    terrace?: boolean;

    epcRating?: string;
    energyEfficiencyRating?: number;
    environmentalImpactRating?: number;
    heatingTypes: string[];
    coolingTypes: string[];
    gazingTypes: string;

    contactName?: string;
    contactCompany?: string;
    companyLogoUrl?: string;
    viewingArrangements?: string;
    keyFeatures: string[];
    customKeyFeatures: string[];
    additionalNotes?: string;
}


export interface IShortletProperty {
    id: string;
    propertyId: string;
    propertySubType: PropertyType;
    typeSpecific?: any;

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
    furnished: boolean;

    amenities: string[];
    customAmenities: string[];
    customNearbyAttractions: string[];
    attractionDistances?: Record<string, number>;
    safetyFeatures: string[];
    customSafetyFeatures: string[];

    minStayDays: number;
    maxStayDays: number;
    availableFrom?: Date;
    availableTo?: Date;
    basePrice: number;
    cleaningFee?: number;
    securityDeposit?: number;
    weeklyDiscount?: number;
    monthlyDiscount?: number;

    checkInTime: string;
    checkOutTime: string;
    instantBooking: boolean;
    allowChildren: boolean;
    allowInfants: boolean;
    allowPets: boolean;
    allowSmoking: boolean;
    allowParties: boolean;
    quietHours: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;

    cancellationPolicy: CancellationPolicy;
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

    // bookings?: Booking[];
    // seasonalPricing?: SeasonalPricing[];
    // unavailableDates?: UnavailableDate[];
    // additionalRules?: AdditionalRule[];
    nearbyAttractions?: string[];
    // hostLanguages?: HostLanguage[];
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
}

export interface AdditionalRule {
    id?: string;
    rule: string;
    shortletId: string;
}

export interface UnavailableDate {
    id?: string;
    date: Date;
    shortletId: string;
}


export interface ISharedFacilities {
    kitchen: boolean;
    bathroom: boolean;
    livingRoom: boolean;
    garden: boolean;
    laundry: boolean;
    parking: boolean;
    other?: string;
}

export interface IUnitConfiguration {
    unitType: string;
    count: number;
    bedrooms: number;
    bathrooms: number;
    price: string;
}

export interface IRoomDetail {
    roomName: string;
    roomSize: string;
    ensuite?: boolean;
    price: string;
    availability?: string;
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
    apartmentsId?: string
    propertyId?: string
    uploadedBy?: string
}
export interface IProperty {
    name: string;
    title?: string;
    description?: string;
    shortDescription?: string;
    propertysize?: number;
    isDeleted?: boolean;
    showCase?: boolean;
    landlordId?: string;
    agencyId?: string;
    marketValue?: number;
    rentalFee?: number;
    initialDeposit?: number;
    dueDate?: Date;
    noBedRoom?: number;
    noKitchen?: number;
    noGarage?: number;
    noBathRoom?: number;
    noReceptionRooms?: number;
    totalArea?: string;
    areaUnit?: AreaUnit;
    yearBuilt?: number;
    city: string;
    stateId?: string;
    country: string;
    zipcode: string;
    location?: string;
    // images: string[];
    // videourl: string[];
    propertyDocument: PropertyDocument[]
    image?: PropertyMediaFiles[]
    videos?: PropertyMediaFiles[]
    virtualTours?: PropertyMediaFiles[]

    amenities: string[];
    totalApartments?: number;
    longitude?: number;
    latitude?: number;
    price?: string;
    currency?: string;
    priceFrequency?: PriceFrequency;
    rentalPeriod?: string;
    availability?: PropsApartmentStatus;
    availableFrom?: Date;
    type?: PropertyType;
    typeSpecific?: object;
    // settings?: any[];
    specificationType?: PropertySpecificationType;
    useTypeCategory?: string;
    shortlet: ShortletProperty
    residential: ResidentialProperty,
    commercial: CommercialProperty
    // sharedFacilities?: ISharedFacilities;
    // roomDetails?: IRoomDetail[];
    // UnitConfiguration?: IUnitConfiguration[];
}


export interface PropertyFeature {
    id?: string
    name: string
    type: PropertyFeatureType
    isDeleted?: boolean
}
