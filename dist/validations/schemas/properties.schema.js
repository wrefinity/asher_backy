"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertyValidation = exports.updatePropertyViewingSchema = exports.createPropertyViewingSchema = exports.updateListingStatusSchema = exports.updatePropertyListingSchema = exports.createPropertyListingSchema = exports.updatePropertyDocumentSchema = exports.documentUploadSchema = exports.createPropertyDocumentSchema = exports.updatePropertySchema = exports.createPropertySchema = void 0;
const joi_1 = __importDefault(require("joi"));
const client_1 = require("@prisma/client");
const propertyType = Object.values(client_1.PropertyType);
const documentType = Object.values(client_1.DocumentType);
const idType = Object.values(client_1.IdType);
const propertySpecificationType = Object.values(client_1.PropertySpecificationType);
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
    yearBuilt: joi_1.default.date().optional(),
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
    yearBuilt: joi_1.default.date().iso().optional(),
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
// property listing schema
const listingTypes = Object.values(client_1.ListingType);
const shortletType = Object.values(client_1.ShortletType);
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
exports.PropertyValidation = {
    createProperty: joi_1.default.object({
        // Core Property Fields
        name: joi_1.default.string().required().max(255),
        title: joi_1.default.string().required().max(255),
        description: joi_1.default.string().optional().allow(''),
        shortDescription: joi_1.default.string().optional().max(500),
        propertysize: joi_1.default.number().optional().positive(),
        showCase: joi_1.default.boolean().default(false),
        // Market Values
        marketValue: joi_1.default.number().precision(2).optional(),
        rentalFee: joi_1.default.number().precision(2).optional(),
        initialDeposit: joi_1.default.number().precision(2).optional(),
        dueDate: joi_1.default.date().optional(),
        // Features
        noBedRoom: joi_1.default.number().integer().min(0).default(1),
        noKitchen: joi_1.default.number().integer().min(0).default(1),
        noGarage: joi_1.default.number().integer().min(0).default(0),
        noBathRoom: joi_1.default.number().integer().min(0).default(1),
        noReceptionRooms: joi_1.default.number().integer().min(0).default(0),
        totalArea: joi_1.default.string().optional(),
        areaUnit: joi_1.default.string().default('sq-ft'),
        yearBuilt: joi_1.default.date().optional(),
        councilTaxBand: joi_1.default.string().optional(),
        tenure: joi_1.default.string().default('freehold'),
        leaseYearsRemaining: joi_1.default.string().optional(),
        groundRent: joi_1.default.string().optional(),
        serviceCharge: joi_1.default.string().optional(),
        // Address
        city: joi_1.default.string().required(),
        // stateId: Joi.string().optional(),
        country: joi_1.default.string().required(),
        zipcode: joi_1.default.string().required(),
        location: joi_1.default.string().optional(),
        longitude: joi_1.default.number().precision(6).optional(),
        latitude: joi_1.default.number().precision(6).optional(),
        // Media
        images: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
        videos: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
        virtualTours: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
        // Pricing
        price: joi_1.default.string().required(),
        currency: joi_1.default.string().required().default('NGN'),
        priceFrequency: joi_1.default.valid(...Object.values(client_1.PriceFrequency)).optional(),
        rentalPeriod: joi_1.default.string().optional(),
        // Availability
        availability: joi_1.default.valid(...Object.values(client_1.PropsApartmentStatus)).default('VACANT'),
        availableFrom: joi_1.default.date().optional(),
        type: joi_1.default.valid(...Object.values(client_1.PropertyType)).default('SINGLE_UNIT'),
        // Specifications
        specificationType: joi_1.default.valid(...Object.values(client_1.PropertySpecificationType)).default('RESIDENTIAL'),
        // Residential Specific
        residential: joi_1.default.object({
            // Core Details
            bedrooms: joi_1.default.number().integer().min(1).required(),
            bathrooms: joi_1.default.number().precision(1).min(1).required(),
            toilets: joi_1.default.number().integer().min(0).optional(),
            furnished: joi_1.default.boolean().default(false),
            serviced: joi_1.default.boolean().default(false),
            shared: joi_1.default.boolean().default(false),
            // Features
            features: joi_1.default.array().items(joi_1.default.string()).optional(),
            customFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
            // Nearby Amenities
            nearbyAmenities: joi_1.default.array().items(joi_1.default.string()).optional(),
            customNearbyAmenities: joi_1.default.array().items(joi_1.default.string()).optional(),
            amenityDistances: joi_1.default.object().optional(),
            // Property Details
            totalArea: joi_1.default.string().optional(),
            areaUnit: joi_1.default.valid(...Object.values(client_1.AreaUnit)).optional(),
            parkingSpaces: joi_1.default.number().integer().min(0).optional(),
            petPolicy: joi_1.default.string().optional(),
            rentalTerms: joi_1.default.string().optional(),
            securityDeposit: joi_1.default.string().optional(),
            utilities: joi_1.default.array().items(joi_1.default.string()).optional(),
            // Additional Features
            propertyCondition: joi_1.default.string().optional(),
            balcony: joi_1.default.boolean().default(false),
            garden: joi_1.default.boolean().default(false),
            gym: joi_1.default.boolean().default(false),
            pool: joi_1.default.boolean().default(false),
            security: joi_1.default.boolean().default(false),
            // Utilities
            waterSupply: joi_1.default.string().optional(),
            powerSupply: joi_1.default.string().optional(),
            internetAvailable: joi_1.default.boolean().default(false),
            internetSpeed: joi_1.default.string().optional(),
            furnishingDetails: joi_1.default.string().optional(),
            renovationYear: joi_1.default.string().optional()
        }).when('specificationType', {
            is: client_1.PropertySpecificationType.RESIDENTIAL,
            then: joi_1.default.required()
        }),
        // Commercial Specific
        commercial: joi_1.default.object({
            // Core Details
            totalArea: joi_1.default.string().required(),
            areaUnit: joi_1.default.valid(...Object.values(client_1.AreaUnit)).required(),
            minLeaseTerm: joi_1.default.string().required(),
            maxLeaseTerm: joi_1.default.string().optional(),
            leaseTermUnit: joi_1.default.valid(...Object.values(client_1.LeaseTermUnit)).required(),
            businessRates: joi_1.default.string().optional(),
            serviceCharge: joi_1.default.string().optional(),
            buildingClass: joi_1.default.valid(...Object.values(client_1.BuildingClass)).optional(),
            lastRefurbished: joi_1.default.string().optional(),
            floorNumber: joi_1.default.number().integer().optional(),
            totalFloors: joi_1.default.number().integer().optional(),
            parkingSpaces: joi_1.default.number().integer().min(0).optional(),
            // Property Types
            isOfficeSpace: joi_1.default.boolean().default(false),
            isWarehouse: joi_1.default.boolean().default(false),
            isHighRise: joi_1.default.boolean().default(false),
            isMultiUnit: joi_1.default.boolean().default(false),
            isRetail: joi_1.default.boolean().default(false),
            isIndustrial: joi_1.default.boolean().default(false),
            // Office Details
            workstations: joi_1.default.number().integer().min(0).optional(),
            meetingRooms: joi_1.default.number().integer().min(0).optional(),
            hasReception: joi_1.default.boolean().default(false),
            officeLayout: joi_1.default.valid(...Object.values(client_1.OfficeLayout)).optional(),
            // Warehouse Details
            clearHeight: joi_1.default.string().optional(),
            loadingDoorsCount: joi_1.default.number().integer().optional(),
            powerSupply: joi_1.default.string().optional(),
            floorLoad: joi_1.default.string().optional(),
            columnSpacing: joi_1.default.string().optional(),
            hasYard: joi_1.default.boolean().default(false),
            yardDepth: joi_1.default.string().optional(),
            // Features
            features: joi_1.default.array().items(joi_1.default.string()).optional(),
            customFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
            nearbyAmenities: joi_1.default.array().items(joi_1.default.string()).optional(),
            customNearbyAmenities: joi_1.default.array().items(joi_1.default.string()).optional(),
            amenityDistances: joi_1.default.object().optional(),
            // Energy
            epcRating: joi_1.default.string().optional(),
            energyEfficiencyRating: joi_1.default.number().integer().optional(),
            environmentalImpactRating: joi_1.default.number().integer().optional(),
            heatingTypes: joi_1.default.array().items(joi_1.default.string()).optional(),
            coolingTypes: joi_1.default.array().items(joi_1.default.string()).optional(),
            hasGreenCertification: joi_1.default.boolean().default(false),
            greenCertificationType: joi_1.default.string().optional(),
            greenCertificationLevel: joi_1.default.string().optional(),
            // Security Features
            securityFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
            // Key Features
            keyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
            customKeyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
            // Additional Fields
            internetSpeed: joi_1.default.string().optional(),
            hasElevator: joi_1.default.boolean().default(false),
            hasLoadingBay: joi_1.default.boolean().default(false),
            hasSprinklerSystem: joi_1.default.boolean().default(false),
            hasAlarmSystem: joi_1.default.boolean().default(false),
            hasCCTV: joi_1.default.boolean().default(false),
            has24HrAccess: joi_1.default.boolean().default(false),
            hasBackupGenerator: joi_1.default.boolean().default(false),
            fitOutIncluded: joi_1.default.boolean().default(false),
            fitOutDetails: joi_1.default.string().optional(),
            leaseTerm: joi_1.default.string().optional(),
            leaseTermNegotiable: joi_1.default.boolean().default(true),
            rentReviewPeriod: joi_1.default.string().optional(),
            breakClause: joi_1.default.string().optional(),
            rentFreeOffered: joi_1.default.boolean().default(false),
            rentFreePeriod: joi_1.default.string().optional(),
            // Unit Configurations
            unitConfigurations: joi_1.default.array().items(joi_1.default.object({
                unitType: joi_1.default.string().required(),
                unitNumber: joi_1.default.string().optional(),
                floorNumber: joi_1.default.number().integer().required(),
                area: joi_1.default.string().required(),
                price: joi_1.default.string().required(),
                available: joi_1.default.boolean().default(true),
                description: joi_1.default.string().optional()
            })).optional(),
            // Floor Configurations
            floorAvailability: joi_1.default.array().items(joi_1.default.object({
                floorNumber: joi_1.default.number().integer().required(),
                area: joi_1.default.string().required(),
                price: joi_1.default.string().required(),
                available: joi_1.default.boolean().default(true),
                partialFloor: joi_1.default.boolean().default(false),
                description: joi_1.default.string().optional()
            })).optional(),
            commercialPropertyUnit: joi_1.default.object({
                unitType: joi_1.default.string().required(),
                unitNumber: joi_1.default.string().optional(),
                floorNumber: joi_1.default.number().integer().required(),
                area: joi_1.default.string().required(),
                price: joi_1.default.string().required(),
                available: joi_1.default.boolean().default(true),
                description: joi_1.default.string().optional()
            }),
            commercialPropertyFloor: joi_1.default.object({
                floorNumber: joi_1.default.number().integer().required(),
                area: joi_1.default.string().required(),
                price: joi_1.default.string().required(),
                available: joi_1.default.boolean().default(true),
                partialFloor: joi_1.default.boolean().default(false),
                description: joi_1.default.string().optional()
            })
        }).when('specificationType', {
            is: client_1.PropertySpecificationType.COMMERCIAL,
            then: joi_1.default.required()
        }),
        // Shotlet Specific
        shotlet: joi_1.default.object({
            // Host Information
            hostName: joi_1.default.string().required(),
            hostPhotoUrl: joi_1.default.string().uri().optional(),
            // Property Details
            bedrooms: joi_1.default.number().integer().min(1).required(),
            beds: joi_1.default.number().integer().min(1).required(),
            bathrooms: joi_1.default.number().precision(1).min(1).required(),
            maxGuests: joi_1.default.number().integer().min(1).required(),
            propertySize: joi_1.default.string().optional(),
            sizeUnit: joi_1.default.valid(...Object.values(client_1.AreaUnit)).optional(),
            floorLevel: joi_1.default.number().integer().optional(),
            totalFloors: joi_1.default.number().integer().optional(),
            renovationYear: joi_1.default.string().optional(),
            // Amenities
            amenities: joi_1.default.array().items(joi_1.default.string()).optional(),
            customAmenities: joi_1.default.array().items(joi_1.default.string()).optional(),
            nearbyAttractions: joi_1.default.array().items(joi_1.default.string()).optional(),
            customNearbyAttractions: joi_1.default.array().items(joi_1.default.string()).optional(),
            attractionDistances: joi_1.default.object().optional(),
            safetyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
            customSafetyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
            // Availability & Pricing
            minStayDays: joi_1.default.number().integer().min(1).required(),
            maxStayDays: joi_1.default.number().integer().min(1).required(),
            availableTo: joi_1.default.date().optional(),
            cleaningFee: joi_1.default.string().optional(),
            securityDeposit: joi_1.default.string().optional(),
            weeklyDiscount: joi_1.default.string().optional(),
            monthlyDiscount: joi_1.default.string().optional(),
            unavailableDates: joi_1.default.array().items(joi_1.default.date()).optional(),
            // House Rules
            checkInTime: joi_1.default.string().pattern(/^\d{2}:\d{2}$/).required(),
            checkOutTime: joi_1.default.string().pattern(/^\d{2}:\d{2}$/).required(),
            instantBooking: joi_1.default.boolean().default(false),
            allowChildren: joi_1.default.boolean().default(true),
            allowInfants: joi_1.default.boolean().default(true),
            allowPets: joi_1.default.boolean().default(false),
            allowSmoking: joi_1.default.boolean().default(false),
            allowParties: joi_1.default.boolean().default(false),
            quietHours: joi_1.default.boolean().default(false),
            quietHoursStart: joi_1.default.string().pattern(/^\d{2}:\d{2}$/).optional(),
            quietHoursEnd: joi_1.default.string().pattern(/^\d{2}:\d{2}$/).optional(),
            additionalRules: joi_1.default.array().items(joi_1.default.string()).optional(),
            // Booking & Policies
            cancellationPolicy: joi_1.default.valid(...Object.values(client_1.CancellationPolicy)).required(),
            customCancellationPolicy: joi_1.default.string().optional(),
            houseManual: joi_1.default.string().optional(),
            checkInInstructions: joi_1.default.string().required(),
            localRecommendations: joi_1.default.string().optional(),
            emergencyContact: joi_1.default.string().required(),
            // Amenity Flags
            hasWifi: joi_1.default.boolean().default(true),
            wifiSpeed: joi_1.default.string().optional(),
            hasTV: joi_1.default.boolean().default(false),
            hasKitchen: joi_1.default.boolean().default(true),
            hasWasher: joi_1.default.boolean().default(false),
            hasDryer: joi_1.default.boolean().default(false),
            hasAirConditioning: joi_1.default.boolean().default(false),
            hasHeating: joi_1.default.boolean().default(false),
            hasWorkspace: joi_1.default.boolean().default(false),
            hasPool: joi_1.default.boolean().default(false),
            hasHotTub: joi_1.default.boolean().default(false),
            hasFreeParking: joi_1.default.boolean().default(false),
            hasGym: joi_1.default.boolean().default(false),
            hasBreakfast: joi_1.default.boolean().default(false),
            hasSelfCheckin: joi_1.default.boolean().default(false),
            hasBalcony: joi_1.default.boolean().default(false),
            hasGarden: joi_1.default.boolean().default(false),
            hasBBQ: joi_1.default.boolean().default(false),
            hasFireplace: joi_1.default.boolean().default(false),
            hasBeachAccess: joi_1.default.boolean().default(false),
            hasLakeAccess: joi_1.default.boolean().default(false),
            hasMountainView: joi_1.default.boolean().default(false),
            hasOceanView: joi_1.default.boolean().default(false),
            hasCityView: joi_1.default.boolean().default(false)
        }).when('specificationType', {
            is: client_1.PropertySpecificationType.SHORTLET,
            then: joi_1.default.required()
        }),
        // Additional Fields
        amenities: joi_1.default.array().items(joi_1.default.string()).optional(),
        customFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
        nearbyAmenities: joi_1.default.array().items(joi_1.default.object({
            name: joi_1.default.string().required(),
            distance: joi_1.default.string().optional()
        })).optional(),
        // Unit Configurations
        unitConfigurations: joi_1.default.array().items(joi_1.default.object({
            unitType: joi_1.default.string().required(),
            count: joi_1.default.number().required(),
            bedrooms: joi_1.default.number().required(),
            bathrooms: joi_1.default.number().required(),
            price: joi_1.default.string().required()
        })).optional(),
        // Shared Facilities
        sharedFacilities: joi_1.default.object({
            kitchen: joi_1.default.boolean().default(false),
            bathroom: joi_1.default.boolean().default(false),
            livingRoom: joi_1.default.boolean().default(false),
            garden: joi_1.default.boolean().default(false),
            laundry: joi_1.default.boolean().default(false),
            parking: joi_1.default.boolean().default(false),
            other: joi_1.default.string().optional()
        }).optional(),
        // Property Specific Details
        hasLift: joi_1.default.boolean().default(false),
        gardenType: joi_1.default.string().optional(),
        gardenSize: joi_1.default.string().optional(),
        parkingSpaces: joi_1.default.number().integer().min(0).default(0),
        garageType: joi_1.default.string().optional(),
        // Contact & Additional Information
        contactName: joi_1.default.string().optional(),
        contactCompany: joi_1.default.string().optional(),
        companyLogoUrl: joi_1.default.string().uri().optional(),
        viewingArrangements: joi_1.default.string().optional(),
        keyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
        customKeyFeatures: joi_1.default.array().items(joi_1.default.string()).optional(),
        additionalNotes: joi_1.default.string().optional(),
        // Multi-unit properties
        isMultiUnit: joi_1.default.boolean().default(false),
        totalUnits: joi_1.default.number().integer().min(0).optional(),
        totalFloors: joi_1.default.number().integer().min(0).optional(),
        unitsPerFloor: joi_1.default.number().integer().min(0).optional(),
        // HMO specific
        isHMO: joi_1.default.boolean().default(false),
        hmoLicensed: joi_1.default.boolean().default(false),
        hmoLicenseNumber: joi_1.default.string().optional(),
        hmoLicenseExpiry: joi_1.default.string().optional(),
        hmoMaxOccupants: joi_1.default.number().integer().min(0).optional(),
        // Room rental specific
        isRoomRental: joi_1.default.boolean().default(false),
        roomDetails: joi_1.default.array().items(joi_1.default.object({
            roomName: joi_1.default.string().required(),
            roomSize: joi_1.default.string().optional(),
            ensuite: joi_1.default.boolean().default(false),
            price: joi_1.default.string().required(),
            availability: joi_1.default.valid(...Object.values(client_1.PropsApartmentStatus)).default('VACANT')
        })).optional(),
        // Energy and Sustainability
        epcRating: joi_1.default.string().optional(),
        energyEfficiencyRating: joi_1.default.number().integer().default(0),
        environmentalImpactRating: joi_1.default.number().integer().default(0),
        heatingTypes: joi_1.default.array().items(joi_1.default.string()).optional(),
        glazingType: joi_1.default.string().optional(),
    }).xor(client_1.PropertySpecificationType.RESIDENTIAL, client_1.PropertySpecificationType.COMMERCIAL, "SHORTLET")
        .with('isMultiUnit', ['totalUnits', 'totalFloors'])
        .with('isHMO', ['hmoLicensed'])
        .with('isRoomRental', ['roomDetails'])
};
