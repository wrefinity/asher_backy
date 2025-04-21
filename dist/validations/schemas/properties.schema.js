"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyFeatureSchema = exports.propertySchema = exports.roomDetailSchema = exports.unitConfigurationSchema = exports.sharedFacilitiesSchema = exports.shortletPropertySchema = exports.hostLanguageSchema = exports.additionalRuleSchema = exports.unavailableDateSchema = exports.seasonalPricingSchema = exports.bookingSchema = exports.commercialPropertySchema = exports.suitableUseSchema = exports.commercialPropertyFloorSchema = exports.commercialPropertyUnitSchema = exports.residentialPropertySchema = exports.updatePropertyViewingSchema = exports.createPropertyViewingSchema = exports.updateListingStatusSchema = exports.updatePropertyListingSchema = exports.createPropertyListingSchema = exports.createFeaturesSchema = exports.featureSchema = exports.updatePropertyDocumentSchema = exports.documentUploadSchema = exports.createPropertyDocumentSchema = exports.updatePropertySchema = exports.createPropertySchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const propertyType = Object.values(client_1.PropertyType);
const documentType = Object.values(client_1.DocumentType);
const idType = Object.values(client_1.IdType);
const propertySpecificationType = Object.values(client_1.PropertySpecificationType);
// property listing schema
const listingTypes = Object.values(client_1.ListingType);
const shortletType = Object.values(client_1.ShortletType);
exports.createPropertySchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    propertysize: joi_1.default.number().optional(),
    agencyId: joi_1.default.string().optional(),
    // isWholeRent: Joi.boolean().required(),
    noBedRoom: joi_1.default.number().optional(),
    noKitchen: joi_1.default.number().optional(),
    noGarage: joi_1.default.number().optional(),
    noBathRoom: joi_1.default.number().optional(),
    marketValue: joi_1.default.number().optional(),
    rentalFee: joi_1.default.number().optional(),
    initialDeposit: joi_1.default.number().optional(),
    longitude: joi_1.default.number().optional(),
    latitude: joi_1.default.number().optional(),
    // latePaymentFeeType: Joi.string().valid('ONE_TIME', 'DAILY').optional(),
    dueDate: joi_1.default.date().optional(),
    type: joi_1.default.string().valid(...propertyType).default(client_1.PropertyType.SINGLE_UNIT).required(),
    specificationType: joi_1.default.string().valid(...propertySpecificationType).default(client_1.PropertySpecificationType.RESIDENTIAL).required(),
    useTypeCategory: joi_1.default.string().optional(),
    // landlordId: Joi.string().required(),
    city: joi_1.default.string().required(),
    state: joi_1.default.string().required(),
    country: joi_1.default.string().required(),
    currency: joi_1.default.string().required(),
    zipcode: joi_1.default.string().required(),
    location: joi_1.default.string().optional(),
    yearBuilt: joi_1.default.number().integer().optional(),
    amenities: joi_1.default.array().items(joi_1.default.string()).optional(),
    totalApartments: joi_1.default.number().integer().optional(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryAudioUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
});
// Joi schema for validating property update data
exports.updatePropertySchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    description: joi_1.default.string().optional(),
    marketValue: joi_1.default.number().optional(),
    rentalFee: joi_1.default.number().optional(),
    initialDeposit: joi_1.default.number().optional(),
    propertysize: joi_1.default.number().integer().optional(),
    isDeleted: joi_1.default.boolean().optional(),
    landlordId: joi_1.default.string().optional(),
    agencyId: joi_1.default.string().optional(),
    yearBuilt: joi_1.default.number().integer().optional(),
    createdAt: joi_1.default.date().iso().optional(),
    city: joi_1.default.string().optional(),
    state: joi_1.default.string().optional(),
    country: joi_1.default.string().optional(),
    zipcode: joi_1.default.string().optional(),
    location: joi_1.default.string().optional(),
    images: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    videourl: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
    amenities: joi_1.default.array().items(joi_1.default.string()).optional(),
    totalApartments: joi_1.default.number().integer().optional(),
    transactions: joi_1.default.array().items(joi_1.default.string()).optional(),
    apartments: joi_1.default.array().items(joi_1.default.string()).optional(),
    ratings: joi_1.default.array().items(joi_1.default.string()).optional(),
    tenants: joi_1.default.array().items(joi_1.default.string()).optional(),
    inventory: joi_1.default.array().items(joi_1.default.string()).optional(),
    applicant: joi_1.default.array().items(joi_1.default.string()).optional(),
    maintenance: joi_1.default.array().items(joi_1.default.string()).optional(),
    reviews: joi_1.default.array().items(joi_1.default.string()).optional(),
    propertyDocument: joi_1.default.array().items(joi_1.default.string()).optional(),
});
exports.createPropertyDocumentSchema = joi_1.default.object({
    documentName: joi_1.default.string().required(),
    cloudinaryDocumentUrls: joi_1.default.array().items(joi_1.default.string()).optional(),
    cloudinaryUrls: joi_1.default.array().items(joi_1.default.string()).optional(),
    cloudinaryVideoUrls: joi_1.default.array().items(joi_1.default.string()).optional(),
    cloudinaryAudioUrls: joi_1.default.array().items(joi_1.default.string()).optional(),
    apartmentsId: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().optional(),
    size: joi_1.default.string().required(),
    type: joi_1.default.string().required(),
    docType: joi_1.default.string().valid(...documentType).optional(),
    idType: joi_1.default.string().valid(...idType).optional(),
});
exports.documentUploadSchema = joi_1.default.object({
    documentName: joi_1.default.string().required(),
    apartmentsId: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().optional(),
    size: joi_1.default.string().optional(),
    type: joi_1.default.string().optional(),
    docType: joi_1.default.string().valid(...documentType).required()
});
exports.updatePropertyDocumentSchema = joi_1.default.object({
    name: joi_1.default.string().optional(),
    documentUrl: joi_1.default.string().uri().optional(),
    apartmentsId: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().optional(),
    size: joi_1.default.string().optional(),
    type: joi_1.default.string().optional(),
});
exports.featureSchema = joi_1.default.object({
    name: joi_1.default.string().required().messages({
        'string.empty': 'Feature name cannot be empty',
        'any.required': 'Feature name is required'
    }),
    type: joi_1.default.string().valid(...Object.values(client_1.PropertyFeatureType)).required()
        .messages({
        'any.only': `Type must be one of ${Object.values(client_1.PropertyFeatureType).join(', ')}`,
        'any.required': 'Feature type is required'
    })
});
exports.createFeaturesSchema = joi_1.default.array()
    .items(exports.featureSchema)
    .min(1)
    .required()
    .messages({
    'array.base': 'Input must be an array of features',
    'array.min': 'At least one feature is required',
    'any.required': 'Features array is required'
});
const propertyMediaFilesSchema = joi_1.default.object({
    id: joi_1.default.string().optional(),
    url: joi_1.default.string().uri().required(),
    caption: joi_1.default.string().optional(),
    isPrimary: joi_1.default.boolean().optional(),
    fileType: joi_1.default.string().optional(),
    type: joi_1.default.string()
        .valid(...Object.values(client_1.MediaType))
        .default(client_1.MediaType.IMAGE)
        .required(),
});
const propertyDocumentSchema = joi_1.default.object({
    id: joi_1.default.string().optional(),
    documentName: joi_1.default.string().required(),
    documentUrl: joi_1.default.array().items(joi_1.default.string().uri()).required(),
    size: joi_1.default.string().optional(),
    type: joi_1.default.string().optional(),
    idType: joi_1.default.string().valid(...Object.values(client_1.IdType)).optional(),
    docType: joi_1.default.string().valid(...Object.values(client_1.DocumentType)).optional(),
    agreementId: joi_1.default.string().optional(),
    applicationId: joi_1.default.string().optional(),
    apartmentsId: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().optional(),
    uploadedBy: joi_1.default.string().optional(),
});
exports.createPropertyListingSchema = joi_1.default.object({
    payApplicationFee: joi_1.default.boolean().required(),
    isShortlet: joi_1.default.boolean().required(),
    shortletDuration: joi_1.default.string().valid(...shortletType).default(client_1.ShortletType.MONTHLY).required(),
    type: joi_1.default.string().valid(...listingTypes).default(client_1.ListingType.LISTING_WEBSITE).required(),
    propertyId: joi_1.default.string().optional(),
    apartmentId: joi_1.default.string().optional(),
});
exports.updatePropertyListingSchema = joi_1.default.object({
    payApplicationFee: joi_1.default.boolean().optional(),
    isShortlet: joi_1.default.boolean().optional(),
    shortletDuration: joi_1.default.string().valid(...shortletType).default(client_1.ShortletType.MONTHLY).optional(),
    type: joi_1.default.string().valid(...listingTypes).default(client_1.ListingType.LISTING_WEBSITE).optional(),
    // propertyId: Joi.string().optional(),
    apartmentId: joi_1.default.string().optional(),
    isActive: joi_1.default.boolean().optional(),
    onListing: joi_1.default.boolean().optional()
});
exports.updateListingStatusSchema = joi_1.default.object({
    isLeased: joi_1.default.boolean().required(),
});
// new design 
exports.createPropertyViewingSchema = joi_1.default.object({
    isLiked: joi_1.default.boolean().optional(),
    propertyId: joi_1.default.string().required(),
    review: joi_1.default.string().optional(),
    rating: joi_1.default.number().integer().min(1).max(5).optional(),
});
exports.updatePropertyViewingSchema = joi_1.default.object({
    propertyId: joi_1.default.string().optional(),
    isLiked: joi_1.default.boolean().optional(),
    review: joi_1.default.string().optional(),
    rating: joi_1.default.number().integer().min(1).max(5).optional(),
});
exports.residentialPropertySchema = joi_1.default.object({
    propertySubType: joi_1.default.string().valid(...propertyType).required(),
    typeSpecific: joi_1.default.object().optional(),
    bedrooms: joi_1.default.number().required(),
    bathrooms: joi_1.default.number().required(),
    toilets: joi_1.default.number().optional(),
    halfBathrooms: joi_1.default.number().optional(),
    furnished: joi_1.default.boolean().default(false),
    parkingSpaces: joi_1.default.number().default(0),
    yearBuilt: joi_1.default.number().optional(),
    floorLevel: joi_1.default.number().optional(),
    totalFloors: joi_1.default.number().optional(),
    petsAllowed: joi_1.default.boolean().default(false),
    availableFrom: joi_1.default.date().optional(),
    minimumStay: joi_1.default.number().optional(),
    maximumStay: joi_1.default.number().optional(),
    serviced: joi_1.default.boolean().default(false),
    shared: joi_1.default.boolean().default(false),
    nearbyAmenities: joi_1.default.array().items(joi_1.default.string()).required(),
    customNearbyAmenities: joi_1.default.array().items(joi_1.default.string()).optional(),
    amenityDistances: joi_1.default.object().pattern(joi_1.default.string(), joi_1.default.number()).optional(),
    totalArea: joi_1.default.string().optional(),
    areaUnit: joi_1.default.string().valid(...Object.values(client_1.AreaUnit)).optional(),
    petPolicy: joi_1.default.string().optional(),
    rentalTerms: joi_1.default.string().optional(),
    securityDeposit: joi_1.default.string().optional(),
    utilities: joi_1.default.array().items(joi_1.default.string()).required(),
    propertyCondition: joi_1.default.string().optional(),
    gym: joi_1.default.boolean().default(false),
    pool: joi_1.default.boolean().default(false),
    security: joi_1.default.boolean().default(false),
    waterSupply: joi_1.default.string().optional(),
    powerSupply: joi_1.default.string().optional(),
    internetAvailable: joi_1.default.boolean().default(false),
    internetSpeed: joi_1.default.string().optional(),
    furnishingDetails: joi_1.default.string().optional(),
    renovationYear: joi_1.default.string().optional(),
    waterIncluded: joi_1.default.boolean().default(false),
    electricityIncluded: joi_1.default.boolean().default(false),
    internetIncluded: joi_1.default.boolean().default(false),
    gasIncluded: joi_1.default.boolean().default(false),
    cableIncluded: joi_1.default.boolean().default(false),
    garden: joi_1.default.boolean().default(false),
    balcony: joi_1.default.boolean().default(false),
    patio: joi_1.default.boolean().default(false),
    roofDeck: joi_1.default.boolean().default(false),
    terrace: joi_1.default.boolean().default(false),
    epcRating: joi_1.default.string().optional(),
    energyEfficiencyRating: joi_1.default.number().optional(),
    environmentalImpactRating: joi_1.default.number().optional(),
    heatingTypes: joi_1.default.array().items(joi_1.default.string()).required(),
    coolingTypes: joi_1.default.array().items(joi_1.default.string()).required(),
    gazingTypes: joi_1.default.string().required(),
    contactName: joi_1.default.string().optional(),
    contactCompany: joi_1.default.string().optional(),
    companyLogoUrl: joi_1.default.string().uri().optional(),
    viewingArrangements: joi_1.default.string().optional(),
    keyFeatures: joi_1.default.array().items(joi_1.default.string()).required(),
    customKeyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    additionalNotes: joi_1.default.string().optional(),
});
// 🔹 CommercialPropertyUnit Schema
exports.commercialPropertyUnitSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    unitType: joi_1.default.string().required(),
    unitNumber: joi_1.default.string().optional(),
    floorNumber: joi_1.default.number().integer().required(),
    area: joi_1.default.string().required(),
    price: joi_1.default.string().required(),
    available: joi_1.default.boolean().default(true),
    description: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().required(),
});
// 🔹 CommercialPropertyFloor Schema
exports.commercialPropertyFloorSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    floorNumber: joi_1.default.number().integer().required(),
    area: joi_1.default.string().required(),
    price: joi_1.default.string().required(),
    available: joi_1.default.boolean().default(true),
    partialFloor: joi_1.default.boolean().default(false),
    description: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().required(),
});
// 🔹 SuitableUse Schema
exports.suitableUseSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
    name: joi_1.default.string().required(),
    commercialPropertyId: joi_1.default.string().required(),
});
exports.commercialPropertySchema = joi_1.default.object({
    propertySubType: joi_1.default.string().required(),
    typeSpecific: joi_1.default.any().optional(),
    totalArea: joi_1.default.string().required(),
    areaUnit: joi_1.default.string().required(),
    businessRates: joi_1.default.string().optional(),
    serviceCharge: joi_1.default.number().optional(),
    leaseTermUnit: joi_1.default.string().required(),
    minimumLeaseTerm: joi_1.default.number().integer().required(),
    maximumLeaseTerm: joi_1.default.number().integer().optional(),
    securityDeposit: joi_1.default.number().required(),
    buildingClass: joi_1.default.string().optional(),
    lastRefurbished: joi_1.default.string().optional(),
    floorNumber: joi_1.default.number().integer().optional(),
    totalFloors: joi_1.default.number().integer().optional(),
    zoning: joi_1.default.string().optional(),
    yearBuilt: joi_1.default.number().integer().optional(),
    totalRooms: joi_1.default.number().integer().required(),
    parkingSpaces: joi_1.default.number().integer().default(0),
    floorLevel: joi_1.default.number().integer().optional(),
    availableFrom: joi_1.default.date().optional(),
    workstations: joi_1.default.number().integer().optional(),
    meetingRooms: joi_1.default.number().integer().optional(),
    officeLayout: joi_1.default.string().optional(),
    clearHeight: joi_1.default.string().optional(),
    loadingDoorsCount: joi_1.default.number().integer().optional(),
    powerSupply: joi_1.default.string().optional(),
    floorLoad: joi_1.default.string().optional(),
    columnSpacing: joi_1.default.string().optional(),
    hasYard: joi_1.default.boolean().default(false),
    yardDepth: joi_1.default.string().optional(),
    // features: Joi.array().items(Joi.string()).required(),
    // customFeatures: Joi.array().items(Joi.string()).optional(),
    nearbyAmenities: joi_1.default.array().items(joi_1.default.string()).required(),
    customNearbyAmenities: joi_1.default.array().items(joi_1.default.string()).optional(),
    amenityDistances: joi_1.default.object().optional(),
    epcRating: joi_1.default.string().optional(),
    energyEfficiencyRating: joi_1.default.number().integer().optional(),
    environmentalImpactRating: joi_1.default.number().integer().optional(),
    heatingTypes: joi_1.default.array().items(joi_1.default.string()).required(),
    coolingTypes: joi_1.default.array().items(joi_1.default.string()).required(),
    hasGreenCertification: joi_1.default.boolean().default(false),
    greenCertificationType: joi_1.default.string().optional(),
    greenCertificationLevel: joi_1.default.string().optional(),
    totalUnits: joi_1.default.number().integer().optional(),
    unitConfigurations: joi_1.default.array().items(exports.commercialPropertyUnitSchema).optional(),
    highRiseFloors: joi_1.default.number().integer().optional(),
    floorAvailability: joi_1.default.array().items(exports.commercialPropertyFloorSchema).optional(),
    securityFeatures: joi_1.default.array().items(joi_1.default.string()).required(),
    keyFeatures: joi_1.default.array().items(joi_1.default.string()).required(),
    customKeyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    internetSpeed: joi_1.default.string().optional(),
    hasLoadingBay: joi_1.default.boolean().optional(),
    hasSprinklerSystem: joi_1.default.boolean().optional(),
    hasAlarmSystem: joi_1.default.boolean().optional(),
    hasCCTV: joi_1.default.boolean().optional(),
    has24HrAccess: joi_1.default.boolean().optional(),
    hasBackupGenerator: joi_1.default.boolean().optional(),
    fitOutIncluded: joi_1.default.boolean().optional(),
    fitOutDetails: joi_1.default.string().optional(),
    leaseTerm: joi_1.default.string().optional(),
    leaseTermNegotiable: joi_1.default.boolean().optional(),
    rentReviewPeriod: joi_1.default.string().optional(),
    breakClause: joi_1.default.string().optional(),
    rentFreeOffered: joi_1.default.boolean().optional(),
    rentFreePeriod: joi_1.default.string().optional(),
    contactName: joi_1.default.string().optional(),
    contactCompany: joi_1.default.string().optional(),
    companyLogoUrl: joi_1.default.string().optional(),
    viewingArrangements: joi_1.default.string().optional(),
    elevator: joi_1.default.boolean().optional(),
    hasReception: joi_1.default.boolean().optional(),
    hasSecurity: joi_1.default.boolean().optional(),
    hasConferenceRoom: joi_1.default.boolean().optional(),
    hasCafeteria: joi_1.default.boolean().optional(),
    hasGym: joi_1.default.boolean().optional(),
    suitableFor: joi_1.default.array().items(exports.suitableUseSchema).optional()
});
// Nested Models
exports.bookingSchema = joi_1.default.object({
    checkInDate: joi_1.default.date().required(),
    checkOutDate: joi_1.default.date().required(),
    guestCount: joi_1.default.number().required(),
    totalPrice: joi_1.default.string().required(),
    status: joi_1.default.string().valid(...Object.values(client_1.BookingStatus)).default(client_1.BookingStatus.PENDING),
    guestName: joi_1.default.string().required(),
    guestEmail: joi_1.default.string().email().required(),
    guestPhone: joi_1.default.string().optional(),
    specialRequests: joi_1.default.string().optional(),
    paymentStatus: joi_1.default.string().optional(),
    paymentMethod: joi_1.default.string().optional(),
    transactionReference: joi_1.default.string().optional(),
    propertyId: joi_1.default.string().required(),
    userId: joi_1.default.string().optional()
});
exports.seasonalPricingSchema = joi_1.default.object({
    seasonName: joi_1.default.string().required(),
    startDate: joi_1.default.date().required(),
    endDate: joi_1.default.date().required(),
    price: joi_1.default.string().required(),
    propertyId: joi_1.default.string().required()
});
exports.unavailableDateSchema = joi_1.default.object({
    date: joi_1.default.date().required(),
    shortletId: joi_1.default.string().required()
});
exports.additionalRuleSchema = joi_1.default.object({
    rule: joi_1.default.string().required(),
    shortletId: joi_1.default.string().required()
});
exports.hostLanguageSchema = joi_1.default.object({
    language: joi_1.default.string().required(),
    shortletId: joi_1.default.string().required()
});
//  Shortlet Property Schema
exports.shortletPropertySchema = joi_1.default.object({
    propertySubType: joi_1.default.string().required(),
    typeSpecific: joi_1.default.object().optional(),
    bedrooms: joi_1.default.number().required(),
    beds: joi_1.default.number().required(),
    bathrooms: joi_1.default.number().required(),
    maxGuests: joi_1.default.number().optional(),
    propertySize: joi_1.default.string().optional(),
    sizeUnit: joi_1.default.string().optional(),
    floorLevel: joi_1.default.number().optional(),
    totalFloors: joi_1.default.number().optional(),
    renovationYear: joi_1.default.string().optional(),
    yearBuilt: joi_1.default.number().integer().optional(),
    furnished: joi_1.default.boolean().default(true),
    amenities: joi_1.default.array().items(joi_1.default.string()).required(),
    customAmenities: joi_1.default.array().items(joi_1.default.string()).optional(),
    customNearbyAttractions: joi_1.default.array().items(joi_1.default.string()).optional(),
    attractionDistances: joi_1.default.object().optional(),
    safetyFeatures: joi_1.default.array().items(joi_1.default.string()).required(),
    customSafetyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    minStayDays: joi_1.default.number().required(),
    maxStayDays: joi_1.default.number().required(),
    availableFrom: joi_1.default.date().optional(),
    availableTo: joi_1.default.date().optional(),
    basePrice: joi_1.default.number().required(),
    cleaningFee: joi_1.default.number().optional(),
    securityDeposit: joi_1.default.number().optional(),
    weeklyDiscount: joi_1.default.number().optional(),
    monthlyDiscount: joi_1.default.number().optional(),
    checkInTime: joi_1.default.string().required(),
    checkOutTime: joi_1.default.string().required(),
    instantBooking: joi_1.default.boolean().default(false),
    allowChildren: joi_1.default.boolean().default(true),
    allowInfants: joi_1.default.boolean().default(true),
    allowPets: joi_1.default.boolean().default(false),
    allowSmoking: joi_1.default.boolean().default(false),
    allowParties: joi_1.default.boolean().default(false),
    quietHours: joi_1.default.boolean().default(false),
    quietHoursStart: joi_1.default.string().optional(),
    quietHoursEnd: joi_1.default.string().optional(),
    cancellationPolicy: joi_1.default.string().valid(...Object.values(client_1.CancellationPolicy)).required(),
    customCancellationPolicy: joi_1.default.string().optional(),
    houseManual: joi_1.default.string().optional(),
    checkInInstructions: joi_1.default.string().required(),
    localRecommendations: joi_1.default.string().optional(),
    emergencyContact: joi_1.default.string().optional(),
    hostName: joi_1.default.string().optional(),
    hostPhotoUrl: joi_1.default.string().uri().optional(),
    responseRate: joi_1.default.number().optional(),
    responseTime: joi_1.default.string().optional(),
    isSuperhost: joi_1.default.boolean().default(false),
    joinedDate: joi_1.default.date().required(),
    bookings: joi_1.default.array().items(exports.bookingSchema).optional(),
    seasonalPricing: joi_1.default.array().items(exports.seasonalPricingSchema).optional(),
    unavailableDates: joi_1.default.array().items(exports.unavailableDateSchema).optional(),
    additionalRules: joi_1.default.array().items(exports.additionalRuleSchema).optional(),
    nearbyAttractions: joi_1.default.array().items(joi_1.default.string()).optional(),
    hostLanguages: joi_1.default.array().items(exports.hostLanguageSchema).optional()
});
// SharedFacilities Joi
exports.sharedFacilitiesSchema = joi_1.default.object({
    kitchen: joi_1.default.boolean().default(false),
    bathroom: joi_1.default.boolean().default(false),
    livingRoom: joi_1.default.boolean().default(false),
    garden: joi_1.default.boolean().default(false),
    laundry: joi_1.default.boolean().default(false),
    parking: joi_1.default.boolean().default(false),
    other: joi_1.default.string().optional(),
});
// Unit Configuration Joi
exports.unitConfigurationSchema = joi_1.default.object({
    unitType: joi_1.default.string().required(),
    count: joi_1.default.number().required(),
    bedrooms: joi_1.default.number().required(),
    bathrooms: joi_1.default.number().required(),
    price: joi_1.default.string().required(),
});
// Room Detail Joi
exports.roomDetailSchema = joi_1.default.object({
    roomName: joi_1.default.string().required(),
    roomSize: joi_1.default.string().required(),
    ensuite: joi_1.default.boolean().default(false),
    price: joi_1.default.string().required(),
    availability: joi_1.default.string().valid(...Object.values(client_1.PropsApartmentStatus)).default(client_1.PropsApartmentStatus.VACANT),
});
// Main Property Schema
exports.propertySchema = joi_1.default.object({
    // media files attachement for middlewares
    documentName: joi_1.default.array().items(joi_1.default.string()).optional(),
    docType: joi_1.default.array().items(joi_1.default.string()).optional(),
    idType: joi_1.default.array().items(joi_1.default.string()).optional(),
    uploadedFiles: joi_1.default.array().items(joi_1.default.object()).optional(),
    // main property information
    name: joi_1.default.string().required(),
    title: joi_1.default.string().optional(),
    description: joi_1.default.string().optional(),
    shortDescription: joi_1.default.string().optional(),
    propertysize: joi_1.default.number().optional(),
    isDeleted: joi_1.default.boolean().default(false),
    showCase: joi_1.default.boolean().default(false),
    marketValue: joi_1.default.number().precision(2).default(0.0),
    rentalFee: joi_1.default.number().precision(2).default(0.0),
    initialDeposit: joi_1.default.number().precision(2).default(0.0),
    dueDate: joi_1.default.date().optional(),
    noBedRoom: joi_1.default.number().default(0),
    noKitchen: joi_1.default.number().default(0),
    noGarage: joi_1.default.number().default(0),
    noBathRoom: joi_1.default.number().default(0),
    noReceptionRooms: joi_1.default.number().default(0),
    totalArea: joi_1.default.string().optional(),
    areaUnit: joi_1.default.string().valid(...Object.values(client_1.AreaUnit)).required(),
    yearBuilt: joi_1.default.number().integer().optional(),
    city: joi_1.default.string().required(),
    state: joi_1.default.string().optional(),
    country: joi_1.default.string().required(),
    zipcode: joi_1.default.string().required(),
    location: joi_1.default.string().optional(),
    locationId: joi_1.default.string().optional(),
    // images: Joi.array().items(Joi.string()).optional(),
    // videourl: Joi.array().items(Joi.string()).optional(),
    propertyDocument: joi_1.default.array().items(propertyDocumentSchema).optional(),
    image: joi_1.default.array().items(propertyMediaFilesSchema).optional(),
    videos: joi_1.default.array().items(propertyMediaFilesSchema).optional(),
    virtualTours: joi_1.default.array().items(propertyMediaFilesSchema).optional(),
    amenities: joi_1.default.array().items(joi_1.default.string()).optional(),
    totalApartments: joi_1.default.number().optional(),
    longitude: joi_1.default.number().precision(6).optional(),
    latitude: joi_1.default.number().precision(6).optional(),
    price: joi_1.default.string().optional(),
    currency: joi_1.default.string().optional(),
    priceFrequency: joi_1.default.string().valid(...Object.values(client_1.PriceFrequency)).required(),
    rentalPeriod: joi_1.default.string().optional(),
    availability: joi_1.default.string().valid(...Object.values(client_1.PropsApartmentStatus)).default(client_1.PropsApartmentStatus.VACANT).required(),
    availableFrom: joi_1.default.date().optional(),
    type: joi_1.default.string().valid(...Object.values(propertyType)).required(),
    typeSpecific: joi_1.default.alternatives().try(joi_1.default.object().unknown(), joi_1.default.string().custom((value, helpers) => {
        try {
            const parsed = JSON.parse(value);
            if (typeof parsed !== 'object' || parsed === null) {
                return helpers.error('any.invalid');
            }
            return parsed;
        }
        catch (e) {
            return helpers.error('any.invalid');
        }
    })).optional(),
    settings: joi_1.default.array().items(joi_1.default.object()).optional(),
    specificationType: joi_1.default.string().valid(...Object.values(client_1.PropertySpecificationType)).required(),
    useTypeCategory: joi_1.default.string().optional(),
    sharedFacilities: exports.sharedFacilitiesSchema.optional(),
    roomDetails: joi_1.default.array().items(exports.roomDetailSchema).optional(),
    UnitConfiguration: joi_1.default.array().items(exports.unitConfigurationSchema).optional(),
    // Residential Conditional
    residential: joi_1.default.alternatives().conditional('specificationType', {
        is: client_1.PropertySpecificationType.RESIDENTIAL,
        then: exports.residentialPropertySchema.required(),
        otherwise: joi_1.default.forbidden() // Ensures field is absent when not needed
    }),
    // Commercial Conditional
    commercial: joi_1.default.alternatives().conditional('specificationType', {
        is: client_1.PropertySpecificationType.COMMERCIAL,
        then: exports.commercialPropertySchema.required(),
        otherwise: joi_1.default.forbidden()
    }),
    // Shortlet Conditional
    shotlet: joi_1.default.alternatives().conditional('specificationType', {
        is: client_1.PropertySpecificationType.SHORTLET,
        then: exports.shortletPropertySchema.required(),
        otherwise: joi_1.default.forbidden()
    }),
});
const propertyFeatureType = Object.values(client_1.PropertyFeatureType);
exports.propertyFeatureSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    type: joi_1.default.string()
        .valid(...propertyFeatureType) // Ensure this spreads an array of strings
        .default(client_1.PropertyFeatureType.KEY)
        .required(),
});
// {
//   "propertySubType": "Office",
//   "typeSpecific": {
//     "officeType": "Class A",
//     "layout": "Open-plan"
//   },
//   "propertyId": "PROP123456",
//   "totalArea": "10000",
//   "areaUnit": "sqft",
//   "businessRates": "5000 GBP/year",
//   "serviceCharge": 2000,
//   "leaseTermUnit": "years",
//   "minimumLeaseTerm": 3,
//   "maximumLeaseTerm": 7,
//   "securityDeposit": 10000,
//   "buildingClass": "A",
//   "lastRefurbished": "2023-06-01",
//   "floorNumber": 5,
//   "totalFloors": 10,
//   "zoning": "Commercial",
//   "yearBuilt": 2015,
//   "totalRooms": 20,
//   "parkingSpaces": 50,
//   "floorLevel": 5,
//   "availableFrom": "2025-05-01",
//   "workstations": 100,
//   "meetingRooms": 4,
//   "officeLayout": "Open-plan with private offices",
//   "clearHeight": "12 ft",
//   "loadingDoorsCount": 2,
//   "powerSupply": "Three-phase",
//   "floorLoad": "100 psf",
//   "columnSpacing": "30 ft",
//   "hasYard": false,
//   "yardDepth": null,
//   "features": ["High-speed internet", "Modern HVAC", "Natural light"],
//   "customFeatures": ["Rooftop terrace", "Bike storage"],
//   "nearbyAmenities": ["Supermarkets", "Restaurants", "Public Transportation"],
//   "customNearbyAmenities": ["Coffee shop", "Fitness center"],
//   "amenityDistances": {
//     "Supermarkets": "0.5 miles",
//     "Restaurants": "0.2 miles",
//     "Public Transportation": "0.1 miles"
//   },
//   "epcRating": "B",
//   "energyEfficiencyRating": 85,
//   "environmentalImpactRating": 90,
//   "heatingTypes": ["Central heating", "Electric heating"],
//   "coolingTypes": ["Central air conditioning", "VRF system"],
//   "hasGreenCertification": true,
//   "greenCertificationType": "LEED",
//   "greenCertificationLevel": "Gold",
//   "totalUnits": 10,
//   "highRiseFloors": 10,
//   "securityFeatures": ["cm9radrvt0001q5ew6ouliobd", "cm9radrvs0000q5ewg3dwz30x", "Access control"],
//   "keyFeatures": ["cm9r722qs0000jkg69rzk2jor", "cm9r722qt0001jkg6ag5k5j5t"],
//   "customKeyFeatures": ["Smart lighting", "Acoustic panels"],
//   "internetSpeed": "1 Gbps",
//   "hasLoadingBay": true,
//   "hasSprinklerSystem": true,
//   "hasAlarmSystem": true,
//   "hasCCTV": true,
//   "has24HrAccess": true,
//   "hasBackupGenerator": true,
//   "fitOutIncluded": true,
//   "fitOutDetails": "Modern fit-out with furniture and cabling",
//   "leaseTerm": "5 years",
//   "leaseTermNegotiable": true,
//   "rentReviewPeriod": "3 years",
//   "breakClause": "2 years",
//   "rentFreeOffered": true,
//   "rentFreePeriod": "3 months",
//   "contactName": "John Doe",
//   "contactCompany": "Acme Realty",
//   "companyLogoUrl": "https://example.com/logo.png",
//   "viewingArrangements": "By appointment, contact John Doe",
//   "elevator": true,
//   "hasReception": true,
//   "hasSecurity": true,
//   "hasConferenceRoom": true,
//   "hasCafeteria": true,
//   "hasGym": false,
// }
//   "unitConfigurations": [
//     {
//       "unitNumber": "501",
//       "area": "1000 sqft",
//       "type": "Private office",
//       "rent": 3000
//     },
//     {
//       "unitNumber": "502",
//       "area": "1200 sqft",
//       "type": "Open-plan",
//       "rent": 3500
//     }
//   ],
//   "suitableFor": [
//     {
//       "use": "Office",
//       "description": "Suitable for corporate offices"
//     },
//     {
//       "use": "Co-working",
//       "description": "Flexible spaces for startups"
//     }
//   ]
