"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IBasePropertyDTOSchema = exports.commercialPropertySchema = exports.residentialPropertySchema = exports.shortletPropertySchema = exports.propertyFeatureSchema = exports.suitableUseSchema = exports.hostLanguageSchema = exports.additionalRuleSchema = exports.unavailableDateSchema = exports.seasonalPricingSchema = exports.bookingSchema = exports.sharedFacilitiesSchema = exports.roomDetailSchema = exports.unitConfigurationSchema = exports.commercialPropertyFloorSchema = exports.commercialPropertyUnitSchema = exports.updatePropertyViewingSchema = exports.createPropertyViewingSchema = exports.updateListingStatusSchema = exports.updatePropertyListingSchema = exports.createPropertyListingSchema = exports.createFeaturesSchema = exports.featureSchema = exports.updatePropertyDocumentSchema = exports.documentUploadSchema = exports.createPropertyDocumentSchema = exports.updatePropertySchema = exports.createPropertySchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const propertyType = Object.values(client_1.PropertyType);
const documentType = Object.values(client_1.DocumentType);
const idType = Object.values(client_1.IdType);
const propertySpecificationType = Object.values(client_1.PropertySpecificationType);
// property listing schema
const listingTypes = Object.values(client_1.ListingType);
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
exports.createPropertyListingSchema = joi_1.default.object({
    payApplicationFee: joi_1.default.boolean().required(),
    type: joi_1.default.string().valid(...listingTypes).required(),
    propertyId: joi_1.default.string().optional(),
    propertySubType: joi_1.default.string().valid(...propertyType).required(),
    listAs: joi_1.default.string().valid(...Object.values(client_1.PropertySpecificationType)).required(),
    priceFrequency: joi_1.default.string().valid(...Object.values(client_1.PriceFrequency)).required(),
    price: joi_1.default.number().required(),
    securityDeposit: joi_1.default.number().required(),
    minStayDays: joi_1.default.number().optional(),
    maxStayDays: joi_1.default.number().optional(),
    availableFrom: joi_1.default.date().iso().optional(),
    availableTo: joi_1.default.date().iso().optional(),
});
exports.updatePropertyListingSchema = joi_1.default.object({
    payApplicationFee: joi_1.default.boolean().optional(),
    type: joi_1.default.string().valid(...listingTypes).default(client_1.ListingType.ENTIRE_PROPERTY).optional(),
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
/// ========== new work
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
exports.commercialPropertyFloorSchema = joi_1.default.object({
    floorNumber: joi_1.default.number().required(),
    area: joi_1.default.string().required(),
    price: joi_1.default.string().required(),
    available: joi_1.default.boolean(),
    partialFloor: joi_1.default.boolean(),
    description: joi_1.default.string().allow('', null),
    availability: joi_1.default.string().valid(...Object.values(client_1.AvailabilityStatus.VACANT)).optional(),
    amenities: joi_1.default.array().items(joi_1.default.string()).optional(),
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
exports.unitConfigurationSchema = joi_1.default.object({
    id: joi_1.default.string(),
    unitType: joi_1.default.string().required(),
    unitNumber: joi_1.default.string().optional(),
    floorNumber: joi_1.default.number().optional(),
    count: joi_1.default.number().optional(),
    bedrooms: joi_1.default.number(),
    bathrooms: joi_1.default.number(),
    price: joi_1.default.string().required(),
    area: joi_1.default.string(),
    description: joi_1.default.string().optional(),
    availability: joi_1.default.string().valid(...Object.values(client_1.AvailabilityStatus)).optional(),
});
// Room Detail Joi
exports.roomDetailSchema = joi_1.default.object({
    roomName: joi_1.default.string().required(),
    roomSize: joi_1.default.string().required(),
    ensuite: joi_1.default.boolean().default(false),
    price: joi_1.default.string().required(),
    availability: joi_1.default.string().valid(...Object.values(client_1.AvailabilityStatus)).default(client_1.AvailabilityStatus.VACANT),
});
// SharedFacilities Joi
exports.sharedFacilitiesSchema = joi_1.default.object({
    kitchen: joi_1.default.boolean().default(false),
    bathroom: joi_1.default.boolean().default(false),
    livingRoom: joi_1.default.boolean().default(false),
    garden: joi_1.default.boolean().default(false),
    garage: joi_1.default.boolean().default(false),
    laundry: joi_1.default.boolean().default(false),
    parking: joi_1.default.boolean().default(false),
    other: joi_1.default.string().optional(),
});
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
    shortletId: joi_1.default.string().required(),
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
    shortletId: joi_1.default.string().optional()
});
exports.additionalRuleSchema = joi_1.default.object({
    rule: joi_1.default.string().required(),
    shortletId: joi_1.default.string().optional()
});
exports.hostLanguageSchema = joi_1.default.object({
    language: joi_1.default.string().required(),
    shortletId: joi_1.default.string().optional()
});
// SuitableUse Schema
exports.suitableUseSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    commercialPropertyId: joi_1.default.string().optional(),
});
const propertyFeatureType = Object.values(client_1.PropertyFeatureType);
exports.propertyFeatureSchema = joi_1.default.object({
    name: joi_1.default.string().required(),
    type: joi_1.default.string()
        .valid(...propertyFeatureType)
        .default(client_1.PropertyFeatureType.KEY)
        .required(),
});
exports.shortletPropertySchema = joi_1.default.object({
    // House type specifics
    lotSize: joi_1.default.number().integer().optional(),
    garageSpaces: joi_1.default.number().integer().optional(),
    outdoorsSpacesFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    // Apartment specifics
    buildingName: joi_1.default.string().optional(),
    unitNumber: joi_1.default.number().integer().optional(),
    buildingAmenityFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    safetyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    customSafetyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    // Property Details
    bedrooms: joi_1.default.number().integer().required(),
    beds: joi_1.default.number().integer().optional(),
    bathrooms: joi_1.default.number().required(),
    maxGuests: joi_1.default.number().integer().optional(),
    propertySize: joi_1.default.string().optional(),
    sizeUnit: joi_1.default.string().valid(...Object.values(client_1.AreaUnit)).optional(),
    floorLevel: joi_1.default.number().integer().optional(),
    totalFloors: joi_1.default.number().integer().optional(),
    renovationYear: joi_1.default.string().optional(),
    yearBuilt: joi_1.default.number().integer().optional(),
    furnished: joi_1.default.boolean().default(true),
    // Availability && Pricing
    minStayDays: joi_1.default.number().integer().required(),
    maxStayDays: joi_1.default.number().integer().optional(),
    availableFrom: joi_1.default.date().optional(),
    availableTo: joi_1.default.date().optional(),
    basePrice: joi_1.default.number().required(),
    cleaningFee: joi_1.default.number().optional(),
    weeklyDiscount: joi_1.default.number().optional(),
    monthlyDiscount: joi_1.default.number().optional(),
    // House Rules
    checkInTime: joi_1.default.string().optional(),
    checkOutTime: joi_1.default.string().optional(),
    instantBooking: joi_1.default.boolean().default(false),
    allowChildren: joi_1.default.boolean().default(true),
    allowInfants: joi_1.default.boolean().default(true),
    allowPets: joi_1.default.boolean().default(false),
    allowSmoking: joi_1.default.boolean().default(false),
    allowParties: joi_1.default.boolean().default(false),
    quietHours: joi_1.default.boolean().default(false),
    quietHoursStart: joi_1.default.string().optional(),
    quietHoursEnd: joi_1.default.string().optional(),
    // Booking & Policies
    cancellationPolicy: joi_1.default.string().valid(...Object.values(client_1.CancellationPolicy)).optional(),
    customCancellationPolicy: joi_1.default.string().optional(),
    houseManual: joi_1.default.string().optional(),
    checkInInstructions: joi_1.default.string().required(),
    localRecommendations: joi_1.default.string().optional(),
    emergencyContact: joi_1.default.string().optional(),
    // Host info
    hostName: joi_1.default.string().optional(),
    hostPhotoUrl: joi_1.default.string().uri().optional(),
    responseRate: joi_1.default.number().optional(),
    responseTime: joi_1.default.string().optional(),
    isSuperhost: joi_1.default.boolean().default(false),
    joinedDate: joi_1.default.date().optional(),
    // Room details and shared facilities
    roomDetails: joi_1.default.array().items(exports.roomDetailSchema).optional(),
    sharedFacilities: joi_1.default.array().items(exports.sharedFacilitiesSchema).optional(),
    otherSharedFacilities: joi_1.default.array().items(joi_1.default.string()).optional(),
    houseRule: joi_1.default.string().optional(),
    maxOccupant: joi_1.default.number().integer().optional(),
    isHMO: joi_1.default.boolean().optional(),
    isShareHouse: joi_1.default.boolean().optional(),
    isHMOLicenced: joi_1.default.boolean().optional(),
    hmoLicenceNumber: joi_1.default.string().optional(),
    hmoLicenceExpiryDate: joi_1.default.date().optional(),
    totalOccupants: joi_1.default.number().integer().optional(),
    occupantsDetails: joi_1.default.string().optional(),
    // Relations (referenced by ID arrays)
    bookings: joi_1.default.array().items(exports.bookingSchema).optional(),
    seasonalPricing: joi_1.default.array().items(exports.seasonalPricingSchema).optional(),
    unavailableDates: joi_1.default.array().items(joi_1.default.string()).optional(),
    additionalRules: joi_1.default.array().items(joi_1.default.string()).optional(),
    hostLanguages: joi_1.default.array().items(joi_1.default.string()).optional(),
});
exports.residentialPropertySchema = joi_1.default.object({
    status: joi_1.default.string().valid(...Object.values(client_1.PropertyStatus)).default(client_1.PropertyStatus.FOR_RENT),
    bedrooms: joi_1.default.number().required(),
    bathrooms: joi_1.default.number().required(),
    receiptionRooms: joi_1.default.number().required(),
    toilets: joi_1.default.number().optional(),
    tenure: joi_1.default.string().valid(...Object.values(client_1.TensureType)).optional(),
    furnished: joi_1.default.boolean().optional(),
    renovationYear: joi_1.default.string().optional(),
    councilTaxBand: joi_1.default.string().optional(),
    parkingSpaces: joi_1.default.number().default(0),
    garageType: joi_1.default.string().valid(...Object.values(client_1.GarageType)).optional(),
    yearBuilt: joi_1.default.number().optional(),
    floorLevel: joi_1.default.number().optional(),
    totalArea: joi_1.default.string().optional(),
    areaUnit: joi_1.default.string().valid(...Object.values(client_1.AreaUnit)).optional(),
    petPolicy: joi_1.default.string().optional(),
    rentalTerms: joi_1.default.string().optional(),
    utilities: joi_1.default.array().items(joi_1.default.string()).optional(),
    garden: joi_1.default.string().optional(),
    gardenSize: joi_1.default.string().optional(),
    houseStyle: joi_1.default.string().optional(),
    numberOfStories: joi_1.default.string().optional(),
    outdoorsSpacesFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    buildingAmenityFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    safetyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
    roomDetails: joi_1.default.array().items(exports.roomDetailSchema).optional(),
    sharedFacilities: exports.sharedFacilitiesSchema.optional(),
    otherSharedFacilities: joi_1.default.array().items(joi_1.default.string()).optional(),
    houseRule: joi_1.default.string().optional(),
    maxOccupant: joi_1.default.number().optional(),
    isHMO: joi_1.default.boolean().optional(),
    isShareHouse: joi_1.default.boolean().optional(),
    isHMOLicenced: joi_1.default.boolean().optional(),
    hmoLicenceNumber: joi_1.default.string().optional(),
    hmoLicenceExpiryDate: joi_1.default.date().optional(),
    totalOccupants: joi_1.default.number().optional(),
    occupantsDetails: joi_1.default.string().optional(),
    unitConfiguration: joi_1.default.array().items(exports.unitConfigurationSchema).optional(),
    totalFloors: joi_1.default.number().optional(),
    unitPerFloors: joi_1.default.number().optional(),
    totalUnits: joi_1.default.number().optional(),
    customSafetyFeatures: joi_1.default.array().items(joi_1.default.string()),
    epcRating: joi_1.default.string().optional(),
    energyEfficiencyRating: joi_1.default.number().optional(),
    environmentalImpactRating: joi_1.default.number().optional(),
    heatingTypes: joi_1.default.array().items(joi_1.default.string()),
    coolingTypes: joi_1.default.array().items(joi_1.default.string()),
    glazingTypes: joi_1.default.string().valid(...Object.values(client_1.GlazingType)).optional(),
    additionalNotes: joi_1.default.string().optional(),
    bills: joi_1.default.array().items(joi_1.default.string().uuid()).optional(),
    PropertySpecification: joi_1.default.array().items(joi_1.default.object())
});
exports.commercialPropertySchema = joi_1.default.object({
    totalArea: joi_1.default.string().required(),
    areaUnit: joi_1.default.string().valid(...Object.values(client_1.AreaUnit)).required(),
    businessRates: joi_1.default.string().optional(),
    serviceCharge: joi_1.default.number().optional(),
    leaseTermUnit: joi_1.default.string().valid(...Object.values(client_1.LeaseTermUnit)).required(),
    minimumLeaseTerm: joi_1.default.number().required(),
    maximumLeaseTerm: joi_1.default.number().optional(),
    buildingClass: joi_1.default.string().valid(...Object.values(client_1.BuildingClass)).optional(),
    lastRefurbished: joi_1.default.string().optional(),
    totalFloors: joi_1.default.number().optional(),
    zoning: joi_1.default.string().optional(),
    yearBuilt: joi_1.default.number().optional(),
    totalRooms: joi_1.default.number().required(),
    parkingSpaces: joi_1.default.number().default(0),
    floorLevel: joi_1.default.number().optional(),
    availableFrom: joi_1.default.date().optional(),
    floorNumber: joi_1.default.number().optional(),
    workstations: joi_1.default.number().optional(),
    meetingRooms: joi_1.default.number().optional(),
    officeLayout: joi_1.default.string().optional(),
    highRiseFloors: joi_1.default.number().optional(),
    floorAvailability: joi_1.default.array().items(exports.commercialPropertyFloorSchema).optional(),
    securityFeatures: joi_1.default.array().items(joi_1.default.string()),
    clearHeight: joi_1.default.string().optional(),
    loadingDoorsCount: joi_1.default.number().optional(),
    powerSupply: joi_1.default.string().optional(),
    floorLoad: joi_1.default.string().optional(),
    columnSpacing: joi_1.default.string().optional(),
    hasYard: joi_1.default.boolean().default(false),
    yardDepth: joi_1.default.string().optional(),
    safetyFeatures: joi_1.default.array().items(joi_1.default.string()),
    customSafetyFeatures: joi_1.default.array().items(joi_1.default.string()),
    epcRating: joi_1.default.string().optional(),
    energyEfficiencyRating: joi_1.default.number().optional(),
    environmentalImpactRating: joi_1.default.number().optional(),
    heatingTypes: joi_1.default.array().items(joi_1.default.string()),
    coolingTypes: joi_1.default.array().items(joi_1.default.string()),
    hasGreenCertification: joi_1.default.boolean().default(false),
    greenCertificationType: joi_1.default.string().optional(),
    greenCertificationLevel: joi_1.default.string().optional(),
    totalUnits: joi_1.default.number().optional(),
    unitConfigurations: joi_1.default.array().items(exports.unitConfigurationSchema).optional(),
    leaseTerm: joi_1.default.string().optional(),
    leaseTermNegotiable: joi_1.default.boolean().default(true),
    rentReviewPeriod: joi_1.default.string().optional(),
    breakClause: joi_1.default.string().optional(),
    rentFreeOffered: joi_1.default.boolean().default(false),
    rentFreePeriod: joi_1.default.string().optional(),
    suitableFor: joi_1.default.array().items(joi_1.default.string()).optional(),
    roomDetails: joi_1.default.array().items(exports.roomDetailSchema).optional(),
    sharedFacilities: exports.sharedFacilitiesSchema.optional(),
    otherSharedFacilities: joi_1.default.array().items(joi_1.default.string()).optional(),
    houseRule: joi_1.default.string().optional(),
    maxOccupant: joi_1.default.number().optional(),
    isHMO: joi_1.default.boolean().optional(),
    isShareHouse: joi_1.default.boolean().optional(),
    isHMOLicenced: joi_1.default.boolean().optional(),
    hmoLicenceNumber: joi_1.default.string().optional(),
    hmoLicenceExpiryDate: joi_1.default.date().optional(),
    totalOccupants: joi_1.default.number().optional(),
    occupantsDetails: joi_1.default.string().optional(),
});
exports.IBasePropertyDTOSchema = joi_1.default.object({
    // media files attachement for middlewares
    documentName: joi_1.default.array().items(joi_1.default.string()).optional(),
    docType: joi_1.default.array().items(joi_1.default.string()).optional(),
    idType: joi_1.default.array().items(joi_1.default.string()).optional(),
    uploadedFiles: joi_1.default.array().items(joi_1.default.object()).optional(),
    name: joi_1.default.string().required(),
    description: joi_1.default.string().optional(),
    shortDescription: joi_1.default.string().optional(),
    propertySize: joi_1.default.number().optional(),
    areaUnit: joi_1.default.string().valid(...Object.values(client_1.AreaUnit)).optional(),
    yearBuilt: joi_1.default.number().optional(),
    city: joi_1.default.string().required(),
    state: joi_1.default.string().required(),
    country: joi_1.default.string().required(),
    zipcode: joi_1.default.string().required(),
    address: joi_1.default.string().required(),
    address2: joi_1.default.string().optional(),
    latitude: joi_1.default.number().optional(),
    longitude: joi_1.default.number().optional(),
    currency: joi_1.default.string().valid(...Object.values(client_1.Currency)).required(),
    marketValue: joi_1.default.number().optional(),
    price: joi_1.default.number().required(),
    securityDeposit: joi_1.default.number().optional(),
    initialDeposit: joi_1.default.number().optional(),
    priceFrequency: joi_1.default.string().valid(...Object.values(client_1.PriceFrequency)).optional(),
    rentalPeriod: joi_1.default.string().required(),
    specificationType: joi_1.default.string().valid(...Object.values(client_1.PropertySpecificationType)).required(),
    availability: joi_1.default.string().valid(...Object.values(client_1.AvailabilityStatus)).optional(),
    businessRateVerified: joi_1.default.boolean().optional(),
    postalCodeVerified: joi_1.default.boolean().optional(),
    landRegistryNumber: joi_1.default.string().optional(),
    vatStatus: joi_1.default.string().valid(...Object.values(client_1.VatStatus)).optional(),
    keyFeatures: joi_1.default.array().items(joi_1.default.string()).required(),
    customKeyFeatures: joi_1.default.array().items(joi_1.default.string()).required(),
    nearbyAmenities: joi_1.default.array().items(joi_1.default.string()).required(),
    customNearbyAmenities: joi_1.default.array().items(joi_1.default.string()).required(),
    amenityDistances: joi_1.default.object().pattern(joi_1.default.string(), joi_1.default.number()).optional(),
    contactName: joi_1.default.string().optional(),
    contactCompany: joi_1.default.string().optional(),
    companyLogoUrl: joi_1.default.string().uri().optional(),
    viewingArrangements: joi_1.default.string().optional(),
    propertyDocument: joi_1.default.array().items(propertyDocumentSchema).optional(),
    images: joi_1.default.array().items(propertyMediaFilesSchema).optional(),
    videos: joi_1.default.array().items(propertyMediaFilesSchema).optional(),
    virtualTours: joi_1.default.array().items(propertyMediaFilesSchema).optional(),
    propertySubType: joi_1.default.string().valid(...Object.values(propertyType)).required(),
    otherTypeSpecific: joi_1.default.alternatives().try(joi_1.default.object().unknown(), joi_1.default.string().custom((value, helpers) => {
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
    shortlet: joi_1.default.alternatives().conditional('specificationType', {
        is: client_1.PropertySpecificationType.SHORTLET,
        then: exports.shortletPropertySchema.required(),
        otherwise: joi_1.default.forbidden()
    }),
});
// {
//   "status": "FOR_RENT",
//   "bedrooms": 4,
//   "bathrooms": 3,
//   "receiptionRooms": 2,
//   "toilets": 4,
//   "tenure": "LEASE_HOLD",
//   "furnished": true,
//   "renovationYear": "2020",
//   "councilTaxBand": "Band D",
//   "parkingSpaces": 2,
//   "garageType": "SHARED_HOUSE",
//   "yearBuilt": 2010,
//   "floorLevel": 1,
//   "totalArea": "200",
//   "areaUnit": "SQM",
//   "petPolicy": "Pets allowed with conditions",
//   "rentalTerms": "Minimum 12-month lease",
//   "utilities": ["Water", "Electricity", "Gas"],
//   "outdoorsSpacesFeatures": ["cm9vtear30001jdrejsx7u84t", "cm9vtear30000jdre0i5nlcfl"],
//   "buildingAmenityFeatures": ["cm9vt1q6o0003qa22bz6k1dpb", "cm9vt1q6o0004qa22nxvu5srh"],
//   "safetyFeatures": ["cm9vt9igv000198ar7fiirbs1", "cm9vt9igv000098ar7z6s3uaj"],
//   "roomDetails": [
//     {
//       "roomName": "Master Bedroom",
//       "roomSize": "25 sqm",
//       "ensuite": true,
//       "price": "1000"
//     },
//     {
//       "roomName": "Bedroom 2",
//       "roomSize": "18 sqm",
//       "ensuite": false,
//       "price": "800"
//     }
//   ],
//   "SharedFacilities": [
//     {
//       "kitchen": true,
//       "bathroom": true,
//       "livingRoom": true,
//       "garden": true,
//       "garage": true,
//       "laundry": true,
//       "parking": true,
//       "others": "Shared storage"
//     }
//   ],
//   "otherSharedFacilities": ["Bicycle Rack", "Terrace Lounge"],
//   "houseRule": "No smoking indoors",
//   "maxOccupant": 5,
//   "isShareHouse": true,
//   "totalOccupants": 4,
//   "occupantsDetails": "All occupants are professionals",
//   "unitconfiguration": [
//     {
//       "unitType": "Flat",
//       "unitCount": 2,
//       "floor": 1
//     },
//     {
//       "unitType": "Studio",
//       "unitCount": 1,
//       "floor": 2
//     }
//   ],
//   "totalFloors": 3,
//   "unitPerFloors": 2,
//   "totalUnits": 5,
//   "customSafetyFeatures": ["Emergency Exit", "Carbon Monoxide Alarm"],
//   "epcRating": "B",
//   "energyEfficiencyRating": 85,
//   "environmentalImpactRating": 70,
//   "heatingTypes": ["Central Heating"],
//   "coolingTypes": ["Gas Central Heating", "Heat Pump", "Solid Fuel"],
//   "glazingTypes": "DOUBLE_GLAZING",
//   "additionalNotes": "Located near public transport and shopping centers."
// }
// {
//   "totalArea": "5000",
//   "areaUnit": "SQFT",
//   "businessRates": "£12,000 per annum",
//   "serviceCharge": 5.50,
//   "leaseTermUnit": "YEARS",
//   "minimumLeaseTerm": 24,
//   "maximumLeaseTerm": 60,
//   "buildingClass": "A",
//   "lastRefurbished": "2022",
//   "totalFloors": 10,
//   "zoning": "Commercial",
//   "yearBuilt": 2015,
//   "totalRooms": 25,
//   "parkingSpaces": 50,
//   "floorLevel": 3,
//   "availableFrom": "2025-06-01T00:00:00Z",
//     "floorNumber": 3,
//     "workstations": 80,
//     "meetingRooms": 5,
//     "officeLayout": "OPEN_PLAN",
//   "safetyFeatures": ["cm9vm5qpa000luiq72q9ywku8", "cm9vt9igv000098ar7z6s3uaj"],
//   "customSafetyFeatures": ["24/7 Security Patrol", "Biometric Access"],
//     "epcRating": "B",
//     "energyEfficiencyRating": 75,
//     "environmentalImpactRating": 65,
//     "heatingTypes": ["Central Heating"],
//     "coolingTypes": ["Gas Central Heating", "Heat Pump", "Solid Fuel"],
//     "hasGreenCertification": true,
//     "greenCertificationType": "BREEAM",
//     "greenCertificationLevel": "Excellent",
//     "leaseTerm": "5 years",
//     "leaseTermNegotiable": true,
//     "rentReviewPeriod": "Annual",
//     "breakClause": "After 3 years",
//     "rentFreeOffered": true,
//     "rentFreePeriod": "3 months",
//  "securityFeatures": ["cm9vt9igv000098ar7z6s3uaj", "cm9vt9igv000198ar7fiirbs1"],
//   "customSafetyFeatures": ["Emergency Exit", "Carbon Monoxide Alarm"],
//   "suitableFor": ["OFFICE", "CO_WORKING", "TECH_STARTUP"],
// highRiseFloors: 10,
//   "floorAvailability": [
//     {
//       "floorNumber": 5,
//       "area": "1200",
//       "price": "£35,000",
//       "available": true,
//       "partialFloor": false,
//       "description": "Corner office with panoramic views",
//       "amenities": ["cm9vt1q6o0006qa22kfp9myit", "cm9vt1q6o0004qa22nxvu5srh"]
//     },
//     {
//       "floorNumber": 6,
//       "area": "1500",
//       "price": "£42,000",
//       "available": true,
//       "partialFloor": true,
//       "description": "Partitioned floor available",
// "amenities": ["cm9vt1q6o0006qa22kfp9myit", "cm9vt1q6o0004qa22nxvu5srh"]
//     }
//   ],
// totalUnits: 2,
//   "unitConfigurations": [
//     {
//       "unitType": "PRIVATE_OFFICE",
//       "unitNumber": "301",
//       "floorNumber": 3,
//       "count": 1,
//       "bedrooms": 0,
//       "bathrooms": 1,
//       "price": "2,500,000",
//       "area": "80",
//       "description": "Executive private office",
//       "availability": "AVAILABLE"
//     },
//     {
//       "unitType": "GENERAL_OFFICE",
//       "unitNumber": "302",
//       "floorNumber": 2,
//       "count": 1,
//       "bedrooms": 0,
//       "bathrooms": 2,
//       "price": "2,100,000",
//       "area": "80",
//       "description": "Executive private office",
//       "availability": "AVAILABLE"
//     }
//   ],
//   "roomDetails": [
//     {
//       "roomName": "Board Room",
//       "roomSize": "50",
//       "ensuite": true,
//       "price": "500,000",
//       "availability": "VACANT"
//     }
//   ],
//   "sharedFacilities": {
//     "kitchen": true,
//     "bathroom": true,
//     "livingRoom": false,
//     "garden": false,
//     "garage": true,
//     "laundry": true,
//     "parking": true,
//     "other": "Bike storage"
//   },
//   "otherSharedFacilities": ["Conference Room", "Breakout Area"],
//   "houseRule": "No smoking in common areas",
//   "maxOccupant": 100,
//   "isHMO": false,
//   "isShareHouse": false,
//   "occupantsDetails": "Professional tenants only"
// }
// {
//   "lotSize": 1200,
//   "garageSpaces": 2,
//   "outdoorsSpacesFeatures": ["cm9vtear30001jdrejsx7u84t", "cm9vtear30000jdre0i5nlcfl"],
//   "buildingName": "Luxury Towers",
//   "unitNumber": 42,
//   "buildingAmenityFeatures": ["cm9vt1q6o0003qa22bz6k1dpb", "cm9vt1q6o0004qa22nxvu5srh"], 
// "safetyFeatures": ["cm9vm5qpa000luiq72q9ywku8", "cm9vt9igv000098ar7z6s3uaj"], 
//   "customSafetyFeatures": ["24/7 Security", "Fire extinguishers"],
//   "bedrooms": 3,
//   "beds": 4,
//   "bathrooms": 2,
//   "maxGuests": 6,
//   "propertySize": "120",
//   "sizeUnit": "SQM",
//   "floorLevel": 5,
//   "totalFloors": 10,
//   "renovationYear": "2021",
//   "yearBuilt": 2018,
//   "furnished": true,
//   // Availability & Pricing
//   "minStayDays": 2,
//   "maxStayDays": 30,
//   "availableFrom": "2023-06-01T00:00:00Z",
//   "availableTo": "2023-12-31T00:00:00Z",
//   "basePrice": 150,
//   "cleaningFee": 50,
//   "weeklyDiscount": 10,
//   "monthlyDiscount": 15,
//   // House Rules
//   "checkInTime": "14:00",
//   "checkOutTime": "11:00",
//   "instantBooking": true,
//   "allowChildren": true,
//   "allowInfants": true,
//   "allowPets": false,
//   "allowSmoking": false,
//   "allowParties": false,
//   "quietHours": true,
//   "quietHoursStart": "22:00",
//   "quietHoursEnd": "07:00",
//   // Booking & Policies
//   "cancellationPolicy": "FLEXIBLE",
//   "houseManual": "Please treat our home with respect...",
//   "checkInInstructions": "Use keypad code 1234# at main entrance",
//   "localRecommendations": "Great restaurants nearby...",
//   "emergencyContact": "+1234567890",
//   // Host info
//   "hostName": "John Doe",
//   "hostPhotoUrl": "https://example.com/host.jpg",
//   "responseRate": 95,
//   "responseTime": "within 1 hour",
//   "isSuperhost": true,
//   "joinedDate": "2020-01-15T00:00:00Z",
//   // Room details
//   "roomDetails": [
//     {
//       "roomName": "Master Bedroom",
//       "roomSize": "25",
//       "ensuite": true,
//       "price": "200",
//       "availability": "VACCANT"
//     },
//     {
//       "roomName": "Guest Room",
//       "roomSize": "18",
//       "ensuite": false,
//       "price": "150",
//       "availability": "VACCANT"
//     }
//   ],
//   // Shared facilities
//   "SharedFacilities": [
//     {
//       "kitchen": true,
//       "bathroom": true,
//       "livingRoom": true,
//       "garden": false,
//       "garage": true,
//       "laundry": true,
//       "parking": true,
//       "other": "Bicycle storage"
//     }
//   ],
//   "otherSharedFacilities": ["Swimming pool", "Gym"],
//   "houseRule": "No shoes inside please",
//   "maxOccupant": 8,
//   // Unit configurations (for multi-unit properties)
//   "unitConfigurations": [
//     {
//       "unitType": "STUDIO",
//       "unitNumber": "A1",
//       "floorNumber": 1,
//       "bedrooms": 0,
//       "bathrooms": 1,
//       "price": "1200",
//       "area": "45",
//       "description": "Cozy studio with kitchenette",
//       "availability": "AVAILABLE"
//     }
//   ],
//   // Additional rules and languages
//   "additionalRules": ["No loud music after 10pm", "Recycling mandatory"],
//   "hostLanguages": ["English", "French"]
// }
