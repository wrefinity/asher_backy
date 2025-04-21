import Joi, { object, valid } from 'joi';
import {
  ListingType, PropertyType, PropertySpecificationType, ShortletType, DocumentType, IdType,
  PriceFrequency, PropsApartmentStatus,
  LeaseTermUnit, AreaUnit, BuildingClass,
  OfficeLayout, CancellationPolicy,
  MediaType,
  BookingStatus,
  PropertyFeatureType
} from '@prisma/client';
const propertyType = Object.values(PropertyType);
const documentType = Object.values(DocumentType);
const idType = Object.values(IdType);
const propertySpecificationType = Object.values(PropertySpecificationType);
// property listing schema
const listingTypes = Object.values(ListingType);
const shortletType = Object.values(ShortletType);

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
  yearBuilt: Joi.number().integer().optional(),
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
  yearBuilt: Joi.number().integer().optional(),
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



export const featureSchema = Joi.object({
  name: Joi.string().required().messages({
    'string.empty': 'Feature name cannot be empty',
    'any.required': 'Feature name is required'
  }),
  type: Joi.string().valid(...Object.values(PropertyFeatureType)).required()
    .messages({
      'any.only': `Type must be one of ${Object.values(PropertyFeatureType).join(', ')}`,
      'any.required': 'Feature type is required'
    })
});

export const createFeaturesSchema = Joi.array()
  .items(featureSchema)
  .min(1)
  .required()
  .messages({
    'array.base': 'Input must be an array of features',
    'array.min': 'At least one feature is required',
    'any.required': 'Features array is required'
  });

const propertyMediaFilesSchema = Joi.object({
  id: Joi.string().optional(),
  url: Joi.string().uri().required(),
  caption: Joi.string().optional(),
  isPrimary: Joi.boolean().optional(),
  fileType: Joi.string().optional(),
  type: Joi.string()
    .valid(...Object.values(MediaType))
    .default(MediaType.IMAGE)
    .required(),
})

const propertyDocumentSchema = Joi.object({
  id: Joi.string().optional(),
  documentName: Joi.string().required(),
  documentUrl: Joi.array().items(Joi.string().uri()).required(),
  size: Joi.string().optional(),
  type: Joi.string().optional(),
  idType: Joi.string().valid(...Object.values(IdType)).optional(),
  docType: Joi.string().valid(...Object.values(DocumentType)).optional(),
  agreementId: Joi.string().optional(),
  applicationId: Joi.string().optional(),
  apartmentsId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
  uploadedBy: Joi.string().optional(),
})



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




export const residentialPropertySchema = Joi.object({
  propertySubType: Joi.string().valid(...propertyType).required(),
  typeSpecific: Joi.object().optional(),

  bedrooms: Joi.number().required(),
  bathrooms: Joi.number().required(),
  toilets: Joi.number().optional(),
  halfBathrooms: Joi.number().optional(),
  furnished: Joi.boolean().default(false),
  parkingSpaces: Joi.number().default(0),
  yearBuilt: Joi.number().optional(),
  floorLevel: Joi.number().optional(),
  totalFloors: Joi.number().optional(),
  petsAllowed: Joi.boolean().default(false),
  availableFrom: Joi.date().optional(),
  minimumStay: Joi.number().optional(),
  maximumStay: Joi.number().optional(),
  serviced: Joi.boolean().default(false),
  shared: Joi.boolean().default(false),

  nearbyAmenities: Joi.array().items(Joi.string()).required(),
  customNearbyAmenities: Joi.array().items(Joi.string()).optional(),
  amenityDistances: Joi.object().pattern(Joi.string(), Joi.number()).optional(),

  totalArea: Joi.string().optional(),
  areaUnit: Joi.string().valid(...Object.values(AreaUnit)).optional(),
  petPolicy: Joi.string().optional(),
  rentalTerms: Joi.string().optional(),
  securityDeposit: Joi.string().optional(),
  utilities: Joi.array().items(Joi.string()).required(),

  propertyCondition: Joi.string().optional(),
  gym: Joi.boolean().default(false),
  pool: Joi.boolean().default(false),
  security: Joi.boolean().default(false),
  waterSupply: Joi.string().optional(),
  powerSupply: Joi.string().optional(),
  internetAvailable: Joi.boolean().default(false),
  internetSpeed: Joi.string().optional(),
  furnishingDetails: Joi.string().optional(),
  renovationYear: Joi.string().optional(),

  waterIncluded: Joi.boolean().default(false),
  electricityIncluded: Joi.boolean().default(false),
  internetIncluded: Joi.boolean().default(false),
  gasIncluded: Joi.boolean().default(false),
  cableIncluded: Joi.boolean().default(false),

  garden: Joi.boolean().default(false),
  balcony: Joi.boolean().default(false),
  patio: Joi.boolean().default(false),
  roofDeck: Joi.boolean().default(false),
  terrace: Joi.boolean().default(false),

  epcRating: Joi.string().optional(),
  energyEfficiencyRating: Joi.number().optional(),
  environmentalImpactRating: Joi.number().optional(),
  heatingTypes: Joi.array().items(Joi.string()).required(),
  coolingTypes: Joi.array().items(Joi.string()).required(),
  gazingTypes: Joi.string().required(),

  contactName: Joi.string().optional(),
  contactCompany: Joi.string().optional(),
  companyLogoUrl: Joi.string().uri().optional(),
  viewingArrangements: Joi.string().optional(),
  keyFeatures: Joi.array().items(Joi.string()).required(),
  customKeyFeatures: Joi.array().items(Joi.string()).optional(),
  additionalNotes: Joi.string().optional(),
});
// 🔹 CommercialPropertyUnit Schema
export const commercialPropertyUnitSchema = Joi.object({
  id: Joi.string().required(),
  unitType: Joi.string().required(),
  unitNumber: Joi.string().optional(),
  floorNumber: Joi.number().integer().required(),
  area: Joi.string().required(),
  price: Joi.string().required(),
  available: Joi.boolean().default(true),
  description: Joi.string().optional(),
  propertyId: Joi.string().required(),
});

// 🔹 CommercialPropertyFloor Schema
export const commercialPropertyFloorSchema = Joi.object({
  id: Joi.string().required(),
  floorNumber: Joi.number().integer().required(),
  area: Joi.string().required(),
  price: Joi.string().required(),
  available: Joi.boolean().default(true),
  partialFloor: Joi.boolean().default(false),
  description: Joi.string().optional(),
  propertyId: Joi.string().required(),
});

// 🔹 SuitableUse Schema
export const suitableUseSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  commercialPropertyId: Joi.string().required(),
});

export const commercialPropertySchema = Joi.object({
  propertySubType: Joi.string().required(),
  typeSpecific: Joi.any().optional(),
  totalArea: Joi.string().required(),
  areaUnit: Joi.string().required(),
  businessRates: Joi.string().optional(),
  serviceCharge: Joi.number().optional(),
  leaseTermUnit: Joi.string().required(),
  minimumLeaseTerm: Joi.number().integer().required(),
  maximumLeaseTerm: Joi.number().integer().optional(),
  securityDeposit: Joi.number().required(),
  buildingClass: Joi.string().optional(),
  lastRefurbished: Joi.string().optional(),
  floorNumber: Joi.number().integer().optional(),
  totalFloors: Joi.number().integer().optional(),
  zoning: Joi.string().optional(),
  yearBuilt: Joi.number().integer().optional(),
  totalRooms: Joi.number().integer().required(),
  parkingSpaces: Joi.number().integer().default(0),
  floorLevel: Joi.number().integer().optional(),
  availableFrom: Joi.date().optional(),
  workstations: Joi.number().integer().optional(),
  meetingRooms: Joi.number().integer().optional(),
  officeLayout: Joi.string().optional(),
  clearHeight: Joi.string().optional(),
  loadingDoorsCount: Joi.number().integer().optional(),
  powerSupply: Joi.string().optional(),
  floorLoad: Joi.string().optional(),
  columnSpacing: Joi.string().optional(),
  hasYard: Joi.boolean().default(false),
  yardDepth: Joi.string().optional(),
  // features: Joi.array().items(Joi.string()).required(),
  // customFeatures: Joi.array().items(Joi.string()).optional(),
  nearbyAmenities: Joi.array().items(Joi.string()).required(),
  customNearbyAmenities: Joi.array().items(Joi.string()).optional(),
  amenityDistances: Joi.object().optional(),
  epcRating: Joi.string().optional(),
  energyEfficiencyRating: Joi.number().integer().optional(),
  environmentalImpactRating: Joi.number().integer().optional(),
  heatingTypes: Joi.array().items(Joi.string()).required(),
  coolingTypes: Joi.array().items(Joi.string()).required(),
  hasGreenCertification: Joi.boolean().default(false),
  greenCertificationType: Joi.string().optional(),
  greenCertificationLevel: Joi.string().optional(),
  totalUnits: Joi.number().integer().optional(),
  unitConfigurations: Joi.array().items(commercialPropertyUnitSchema).optional(),
  highRiseFloors: Joi.number().integer().optional(),
  floorAvailability: Joi.array().items(commercialPropertyFloorSchema).optional(),
  securityFeatures: Joi.array().items(Joi.string()).required(),
  keyFeatures: Joi.array().items(Joi.string()).required(),
  customKeyFeatures: Joi.array().items(Joi.string()).optional(),
  internetSpeed: Joi.string().optional(),
  hasLoadingBay: Joi.boolean().optional(),
  hasSprinklerSystem: Joi.boolean().optional(),
  hasAlarmSystem: Joi.boolean().optional(),
  hasCCTV: Joi.boolean().optional(),
  has24HrAccess: Joi.boolean().optional(),
  hasBackupGenerator: Joi.boolean().optional(),
  fitOutIncluded: Joi.boolean().optional(),
  fitOutDetails: Joi.string().optional(),
  leaseTerm: Joi.string().optional(),
  leaseTermNegotiable: Joi.boolean().optional(),
  rentReviewPeriod: Joi.string().optional(),
  breakClause: Joi.string().optional(),
  rentFreeOffered: Joi.boolean().optional(),
  rentFreePeriod: Joi.string().optional(),
  contactName: Joi.string().optional(),
  contactCompany: Joi.string().optional(),
  companyLogoUrl: Joi.string().optional(),
  viewingArrangements: Joi.string().optional(),
  elevator: Joi.boolean().optional(),
  hasReception: Joi.boolean().optional(),
  hasSecurity: Joi.boolean().optional(),
  hasConferenceRoom: Joi.boolean().optional(),
  hasCafeteria: Joi.boolean().optional(),
  hasGym: Joi.boolean().optional(),
  suitableFor: Joi.array().items(suitableUseSchema).optional()
});



// Nested Models
export const bookingSchema = Joi.object({
  checkInDate: Joi.date().required(),
  checkOutDate: Joi.date().required(),
  guestCount: Joi.number().required(),
  totalPrice: Joi.string().required(),
  status: Joi.string().valid(...Object.values(BookingStatus)).default(BookingStatus.PENDING),

  guestName: Joi.string().required(),
  guestEmail: Joi.string().email().required(),
  guestPhone: Joi.string().optional(),
  specialRequests: Joi.string().optional(),
  paymentStatus: Joi.string().optional(),
  paymentMethod: Joi.string().optional(),
  transactionReference: Joi.string().optional(),

  propertyId: Joi.string().required(),
  userId: Joi.string().optional()
});

export const seasonalPricingSchema = Joi.object({
  seasonName: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  price: Joi.string().required(),
  propertyId: Joi.string().required()
});

export const unavailableDateSchema = Joi.object({
  date: Joi.date().required(),
  shortletId: Joi.string().required()
});

export const additionalRuleSchema = Joi.object({
  rule: Joi.string().required(),
  shortletId: Joi.string().required()
});

export const hostLanguageSchema = Joi.object({
  language: Joi.string().required(),
  shortletId: Joi.string().required()
});

//  Shortlet Property Schema
export const shortletPropertySchema = Joi.object({
  propertySubType: Joi.string().required(),
  typeSpecific: Joi.object().optional(),
  bedrooms: Joi.number().required(),
  beds: Joi.number().required(),
  bathrooms: Joi.number().required(),
  maxGuests: Joi.number().optional(),
  propertySize: Joi.string().optional(),
  sizeUnit: Joi.string().optional(),
  floorLevel: Joi.number().optional(),
  totalFloors: Joi.number().optional(),
  renovationYear: Joi.string().optional(),
  yearBuilt: Joi.number().integer().optional(),
  furnished: Joi.boolean().default(true),

  amenities: Joi.array().items(Joi.string()).required(),
  customAmenities: Joi.array().items(Joi.string()).optional(),
  customNearbyAttractions: Joi.array().items(Joi.string()).optional(),
  attractionDistances: Joi.object().optional(),
  safetyFeatures: Joi.array().items(Joi.string()).required(),
  customSafetyFeatures: Joi.array().items(Joi.string()).optional(),

  minStayDays: Joi.number().required(),
  maxStayDays: Joi.number().required(),
  availableFrom: Joi.date().optional(),
  availableTo: Joi.date().optional(),
  basePrice: Joi.number().required(),
  cleaningFee: Joi.number().optional(),
  securityDeposit: Joi.number().optional(),
  weeklyDiscount: Joi.number().optional(),
  monthlyDiscount: Joi.number().optional(),

  checkInTime: Joi.string().required(),
  checkOutTime: Joi.string().required(),
  instantBooking: Joi.boolean().default(false),
  allowChildren: Joi.boolean().default(true),
  allowInfants: Joi.boolean().default(true),
  allowPets: Joi.boolean().default(false),
  allowSmoking: Joi.boolean().default(false),
  allowParties: Joi.boolean().default(false),
  quietHours: Joi.boolean().default(false),
  quietHoursStart: Joi.string().optional(),
  quietHoursEnd: Joi.string().optional(),

  cancellationPolicy: Joi.string().valid(...Object.values(CancellationPolicy)).required(),
  customCancellationPolicy: Joi.string().optional(),
  houseManual: Joi.string().optional(),
  checkInInstructions: Joi.string().required(),
  localRecommendations: Joi.string().optional(),
  emergencyContact: Joi.string().optional(),

  hostName: Joi.string().optional(),
  hostPhotoUrl: Joi.string().uri().optional(),
  responseRate: Joi.number().optional(),
  responseTime: Joi.string().optional(),
  isSuperhost: Joi.boolean().default(false),
  joinedDate: Joi.date().required(),

  bookings: Joi.array().items(bookingSchema).optional(),
  seasonalPricing: Joi.array().items(seasonalPricingSchema).optional(),
  unavailableDates: Joi.array().items(unavailableDateSchema).optional(),
  additionalRules: Joi.array().items(additionalRuleSchema).optional(),
  nearbyAttractions: Joi.array().items(Joi.string()).optional(),
  hostLanguages: Joi.array().items(hostLanguageSchema).optional()
});


// SharedFacilities Joi
export const sharedFacilitiesSchema = Joi.object({
  kitchen: Joi.boolean().default(false),
  bathroom: Joi.boolean().default(false),
  livingRoom: Joi.boolean().default(false),
  garden: Joi.boolean().default(false),
  laundry: Joi.boolean().default(false),
  parking: Joi.boolean().default(false),
  other: Joi.string().optional(),
});

// Unit Configuration Joi
export const unitConfigurationSchema = Joi.object({
  unitType: Joi.string().required(),
  count: Joi.number().required(),
  bedrooms: Joi.number().required(),
  bathrooms: Joi.number().required(),
  price: Joi.string().required(),
});

// Room Detail Joi
export const roomDetailSchema = Joi.object({
  roomName: Joi.string().required(),
  roomSize: Joi.string().required(),
  ensuite: Joi.boolean().default(false),
  price: Joi.string().required(),
  availability: Joi.string().valid(...Object.values(PropsApartmentStatus)).default(PropsApartmentStatus.VACANT),
});

// Main Property Schema
export const propertySchema = Joi.object({
  // media files attachement for middlewares
  documentName: Joi.array().items(Joi.string()).optional(),
  docType: Joi.array().items(Joi.string()).optional(),
  idType: Joi.array().items(Joi.string()).optional(),
  uploadedFiles:Joi.array().items(Joi.object()).optional(),

  // main property information
  name: Joi.string().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  shortDescription: Joi.string().optional(),
  propertysize: Joi.number().optional(),
  isDeleted: Joi.boolean().default(false),
  showCase: Joi.boolean().default(false),


  marketValue: Joi.number().precision(2).default(0.0),
  rentalFee: Joi.number().precision(2).default(0.0),
  initialDeposit: Joi.number().precision(2).default(0.0),
  dueDate: Joi.date().optional(),

  noBedRoom: Joi.number().default(0),
  noKitchen: Joi.number().default(0),
  noGarage: Joi.number().default(0),
  noBathRoom: Joi.number().default(0),
  noReceptionRooms: Joi.number().default(0),
  totalArea: Joi.string().optional(),
  areaUnit: Joi.string().valid(...Object.values(AreaUnit)).required(),
  yearBuilt: Joi.number().integer().optional(),

  city: Joi.string().required(),
  state: Joi.string().optional(),
  country: Joi.string().required(),
  zipcode: Joi.string().required(),
  location: Joi.string().optional(),
  locationId: Joi.string().optional(),

  // images: Joi.array().items(Joi.string()).optional(),
  // videourl: Joi.array().items(Joi.string()).optional(),
  propertyDocument: Joi.array().items(propertyDocumentSchema).optional(),
  image: Joi.array().items(propertyMediaFilesSchema).optional(),
  videos: Joi.array().items(propertyMediaFilesSchema).optional(),
  virtualTours: Joi.array().items(propertyMediaFilesSchema).optional(),


  amenities: Joi.array().items(Joi.string()).optional(),

  totalApartments: Joi.number().optional(),
  longitude: Joi.number().precision(6).optional(),
  latitude: Joi.number().precision(6).optional(),

  price: Joi.string().optional(),
  currency: Joi.string().optional(),
  priceFrequency: Joi.string().valid(...Object.values(PriceFrequency)).required(),
  rentalPeriod: Joi.string().optional(),

  availability: Joi.string().valid(...Object.values(PropsApartmentStatus)).default(PropsApartmentStatus.VACANT).required(),
  availableFrom: Joi.date().optional(),
  type: Joi.string().valid(...Object.values(propertyType)).required(),
  typeSpecific: Joi.alternatives().try(
    Joi.object().unknown(),
    Joi.string().custom((value, helpers) => {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed !== 'object' || parsed === null) {
          return helpers.error('any.invalid');
        }
        return parsed;
      } catch (e) {
        return helpers.error('any.invalid');
      }
    })
  ).optional(),
  settings: Joi.array().items(Joi.object()).optional(),

  specificationType: Joi.string().valid(...Object.values(PropertySpecificationType)).required(),
  useTypeCategory: Joi.string().optional(),

  sharedFacilities: sharedFacilitiesSchema.optional(),
  roomDetails: Joi.array().items(roomDetailSchema).optional(),
  UnitConfiguration: Joi.array().items(unitConfigurationSchema).optional(),

  // Residential Conditional
  residential: Joi.alternatives().conditional('specificationType', {
    is: PropertySpecificationType.RESIDENTIAL,
    then: residentialPropertySchema.required(),
    otherwise: Joi.forbidden() // Ensures field is absent when not needed
  }),

  // Commercial Conditional
  commercial: Joi.alternatives().conditional('specificationType', {
    is: PropertySpecificationType.COMMERCIAL,
    then: commercialPropertySchema.required(),
    otherwise: Joi.forbidden()
  }),

  // Shortlet Conditional
  shotlet: Joi.alternatives().conditional('specificationType', {
    is: PropertySpecificationType.SHORTLET,
    then: shortletPropertySchema.required(),
    otherwise: Joi.forbidden()
  }),
});


const propertyFeatureType = Object.values(PropertyFeatureType);
export const propertyFeatureSchema = Joi.object({
  name: Joi.string().required(),
  type: Joi.string()
    .valid(...propertyFeatureType) // Ensure this spreads an array of strings
    .default(PropertyFeatureType.KEY)
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