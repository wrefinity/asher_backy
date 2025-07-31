import Joi, { object, valid } from 'joi';
import {
  ListingType, PropertyType, PropertySpecificationType, DocumentType, IdType,
  PriceFrequency, AvailabilityStatus, PropertyStatus, GarageType, AreaUnit, BuildingClass,
  OfficeLayout, CancellationPolicy, Currency, VatStatus, LeaseTermUnit, GlazingType,
  MediaType, TensureType,
  BookingStatus,

} from '@prisma/client';
import { uploadSchema } from './upload.schema';
const propertyType = Object.values(PropertyType);
const documentType = Object.values(DocumentType);
const idType = Object.values(IdType);
const propertySpecificationType = Object.values(PropertySpecificationType);
// property listing schema
const listingTypes = Object.values(ListingType);

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
}).concat(uploadSchema);;

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
  propertyId: Joi.string().optional(),
  size: Joi.string().required(),
  type: Joi.string().required(),
  docType: Joi.string().valid(...documentType).optional(),
  idType: Joi.string().valid(...idType).optional(),
}).concat(uploadSchema);;


export const documentUploadSchema = Joi.object({
  documentName: Joi.string().required(),
  propertyId: Joi.string().optional(),
  size: Joi.string().optional(),
  type: Joi.string().optional(),
  docType: Joi.string().valid(...documentType).required()
});


export const updatePropertyDocumentSchema = Joi.object({
  name: Joi.string().optional(),
  documentUrl: Joi.string().uri().optional(),
  propertyId: Joi.string().optional(),
  size: Joi.string().optional(),
  type: Joi.string().optional(),
});




export const createPropertyListingSchema = Joi.object({
  payApplicationFee: Joi.boolean().required(),
  applicationFeeAmount: Joi.number().optional(),

  type: Joi.string()
    .valid(...Object.values(ListingType))
    .required()
    .messages({
      'string.base': '"type" must be a string',
      'any.only': `"type" must be one of ${Object.values(ListingType).join(', ')}`,
      'any.required': '"type" is required',
    }),

  propertyId: Joi.string().required(),
  unitId: Joi.array().items(Joi.string()).optional(),
  roomId: Joi.array().items(Joi.string()).optional(),

  propertySubType: Joi.string()
    .valid(...propertyType)
    .optional()
    .messages({
      'string.base': '"propertySubType" must be a string',
      'any.only': `"propertySubType" must be one of ${propertyType.join(', ')}`,
    }),

  listAs: Joi.string()
    .valid(...Object.values(PropertySpecificationType))
    .required()
    .messages({
      'string.base': '"listAs" must be a string',
      'any.only': `"listAs" must be one of ${Object.values(PropertySpecificationType).join(', ')}`,
      'any.required': '"listAs" is required',
    }),

  priceFrequency: Joi.string()
    .valid(...Object.values(PriceFrequency))
    .optional()
    .messages({
      'string.base': '"priceFrequency" must be a string',
      'any.only': `"priceFrequency" must be one of ${Object.values(PriceFrequency).join(', ')}`,
    }),

  price: Joi.number().positive().optional(),
  securityDeposit: Joi.number().min(0).optional(),
  minStayDays: Joi.number().integer().min(1).optional(),
  maxStayDays: Joi.number().integer().min(Joi.ref('minStayDays')).optional(),
  availableFrom: Joi.date().iso().min('now').optional(),
  availableTo: Joi.date().iso().min(Joi.ref('availableFrom')).optional(),
}).custom((value, helpers) => {
  const { type, unitId = [], roomId = [] } = value;

  // TypeScript type guard for Joi custom validation
  const createError = (message: string) => {
    return helpers.error('any.custom', { message });
  };

  if (type === ListingType.ENTIRE_PROPERTY) {
    if (unitId.length > 0 || roomId.length > 0) {
      return createError('Cannot specify units or rooms when listing entire property');
    }
  }

  if (type === ListingType.SINGLE_UNIT) {
    if (unitId.length === 0) {
      return createError('At least one unit must be specified for single unit listing');
    }
    if (roomId.length > 0) {
      return createError('Cannot specify rooms when listing a single unit');
    }
  }

  if (type === ListingType.ROOM) {
    if (roomId.length === 0) {
      return createError('At least one room must be specified for room listing');
    }
    if (unitId.length > 0) {
      return createError('Cannot specify units when listing a room');
    }
  }

  return value;
}).messages({
  'any.custom': '{{#error}}',
  'number.base': '{{#label}} must be a number',
  'number.positive': 'Price must be positive',
  'date.min': '{{#label}} must be in the future',
  'number.min': '{{#label}} must be at least {{#limit}}'
});



export const updatePropertyListingSchema = Joi.object({
  payApplicationFee: Joi.boolean().optional(),
  type: Joi.string().valid(...listingTypes).default(ListingType.ENTIRE_PROPERTY).optional(),
  // propertyId: Joi.string().optional(),
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





// 🔹 CommercialPropertyUnit Schema
export const commercialPropertyUnitSchema = Joi.object({
  id: Joi.string().optional(),
  unitType: Joi.string().required(),
  unitNumber: Joi.string().optional(),
  floorNumber: Joi.number().integer().required(),
  area: Joi.string().required(),
  price: Joi.string().required(),
  available: Joi.boolean().default(true),
  description: Joi.string().optional(),
  propertyId: Joi.string().required(),
});


/// ========== new work
const propertyDocumentSchema = Joi.object({
  id: Joi.string().optional(),
  documentName: Joi.string().required(),
  documentUrl: Joi.array().items(Joi.string().uri()).required(),
  size: Joi.string().optional(),
  type: Joi.string().optional(),
  idType: Joi.string().valid(...Object.values(IdType)).messages({
    'any.only': `IdType type must be one of: ${Object.values(IdType).join(',')}`,
    'string.base': 'IdType type must be a string'
  }).optional(),
  docType: Joi.string().valid(...Object.values(DocumentType)).messages({
    'any.only': `DocumentType type must be one of: ${Object.values(DocumentType).join(',')}`,
    'string.base': 'DocumentType type must be a string'
  }).optional(),
  agreementId: Joi.string().optional(),
  applicationId: Joi.string().optional(),
  propertyId: Joi.string().optional(),
  uploadedBy: Joi.string().optional(),
})

// ..
export const commercialPropertyFloorSchema = Joi.object({
  floorNumber: Joi.number().required(),
  area: Joi.string().required(),
  price: Joi.string().optional(),
  available: Joi.boolean().optional(),
  partialFloor: Joi.boolean().optional(),
  description: Joi.string().allow('', null),
  availability: Joi.string().valid(...Object.values(AvailabilityStatus.VACANT)).messages({
    'any.only': `AvailabilityStatus type must be one of: ${Object.values(AvailabilityStatus).join(',')}`,
    'string.base': 'AvailabilityStatus type must be a string'
  }).optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
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
    .messages({
      'any.only': `MediaType type must be one of: ${Object.values(MediaType).join(',')}`,
      'string.base': 'MediaType type must be a string'
    })
    .required(),
})

export const unitConfigurationSchema = Joi.object({
  id: Joi.string().optional(),
  residentialPropertyId: Joi.string().optional(),
  commercialPropertyId: Joi.string().optional(),

  // media files attachement for middlewares
  documentName: Joi.array().items(Joi.string()).optional(),
  docType: Joi.array().items(Joi.string()).optional(),
  idType: Joi.array().items(Joi.string()).optional(),
  uploadedFiles: Joi.array().items(Joi.object()).optional(),
  images: Joi.array().items(propertyMediaFilesSchema).optional(),

  unitType: Joi.string().required(),
  unitNumber: Joi.string().optional(),
  floorNumber: Joi.number().optional(),
  count: Joi.number().optional(),
  bedrooms: Joi.number().optional(),
  bathrooms: Joi.number().optional(),
  price: Joi.string().required(),
  priceFrequency: Joi.string().valid(...Object.values(PriceFrequency)).messages({
    'any.only': `priceFrequency type must be one of: ${Object.values(PriceFrequency).join(',')}`,
    'string.base': 'priceFrequency type must be a string'
  }).optional(),
  area: Joi.string().optional(),
  description: Joi.string().optional(),
  availability: Joi.string().valid(...Object.values(AvailabilityStatus)).messages({
    'any.only': `AvailabilityStatus type must be one of: ${Object.values(AvailabilityStatus).join(',')}`,
    'string.base': 'AvailabilityStatus type must be a string'
  }).optional(),
});

// Room Detail Joi
export const roomDetailSchema = Joi.object({
  residentialPropertyId: Joi.string().optional(),
  commercialPropertyId: Joi.string().optional(),
  unitId: Joi.string().optional(),
  // media files attachement for middlewares
  documentName: Joi.array().items(Joi.string()).optional(),
  docType: Joi.array().items(Joi.string()).optional(),
  idType: Joi.array().items(Joi.string()).optional(),
  uploadedFiles: Joi.array().items(Joi.object()).optional(),
  images: Joi.array().items(propertyMediaFilesSchema).optional(),
  count: Joi.number().optional(),
  roomName: Joi.string().required(),
  roomSize: Joi.string().required(),
  ensuite: Joi.boolean().default(false).optional(),
  price: Joi.string().required(),
  priceFrequency: Joi.string().valid(...Object.values(PriceFrequency)).messages({
    'any.only': `priceFrequency type must be one of: ${Object.values(PriceFrequency).join(',')}`,
    'string.base': 'priceFrequency type must be a string'
  }).optional(),
  availability: Joi.string().valid(...Object.values(AvailabilityStatus)).messages({
    'any.only': `AvailabilityStatus type must be one of: ${Object.values(AvailabilityStatus).join(',')}`,
    'string.base': 'AvailabilityStatus type must be a string'
  }).default(AvailabilityStatus.VACANT),
});

// SharedFacilities Joi
export const sharedFacilitiesSchema = Joi.object({
  kitchen: Joi.boolean().default(false).optional(),
  bathroom: Joi.boolean().default(false).optional(),
  livingRoom: Joi.boolean().default(false).optional(),
  garden: Joi.boolean().default(false).optional(),
  garage: Joi.boolean().default(false).optional(),
  laundry: Joi.boolean().default(false).optional(),
  parking: Joi.boolean().default(false).optional(),
  other: Joi.string().optional(),
});

export const bookingSchema = Joi.object({
  checkInDate: Joi.date().required(),
  checkOutDate: Joi.date().required(),
  guestCount: Joi.number().required(),
  totalPrice: Joi.string().required(),
  status: Joi.string().valid(...Object.values(BookingStatus)).messages({
    'any.only': `BookingStatus type must be one of: ${Object.values(BookingStatus).join(',')}`,
    'string.base': 'BookingStatus type must be a string'
  }).default(BookingStatus.PENDING),

  guestName: Joi.string().required(),
  guestEmail: Joi.string().email().required(),
  guestPhone: Joi.string().optional(),
  specialRequests: Joi.string().optional(),
  paymentStatus: Joi.string().optional(),
  paymentMethod: Joi.string().optional(),
  transactionReference: Joi.string().optional(),
  shortletId: Joi.string().required(),
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
  shortletId: Joi.string().optional()
});

export const additionalRuleSchema = Joi.object({
  rule: Joi.string().required(),
  shortletId: Joi.string().optional()
});

export const hostLanguageSchema = Joi.object({
  language: Joi.string().required(),
  shortletId: Joi.string().optional()
});
// SuitableUse Schema
export const suitableUseSchema = Joi.object({
  name: Joi.string().required(),
  commercialPropertyId: Joi.string().optional(),
});

// Common across schemas
const commonFields = {
  bedrooms: Joi.number().optional(),
  bathrooms: Joi.number().optional(),
  yearBuilt: Joi.number().optional(),
  floorLevel: Joi.number().optional(),
  totalFloors: Joi.number().optional(),
  renovationYear: Joi.string().optional(),
  furnished: Joi.boolean().optional(),
  safetyFeatures: Joi.array().items(Joi.string()).optional(),
  customSafetyFeatures: Joi.array().items(Joi.string()).optional(),
  epcRating: Joi.string().allow('', null).optional(),
  energyEfficiencyRating: Joi.number().optional(),
  environmentalImpactRating: Joi.number().optional(),
  heatingTypes: Joi.array().items(Joi.string()).optional(),
  coolingTypes: Joi.array().items(Joi.string()).optional(),
  roomDetails: Joi.array().items(roomDetailSchema).optional(),
  sharedFacilities: sharedFacilitiesSchema.optional(),
  otherSharedFacilities: Joi.array().items(Joi.string()).optional(),
  houseRule: Joi.string().optional(),
  maxOccupant: Joi.number().optional(),
  isHMO: Joi.boolean().optional(),
  isShareHouse: Joi.boolean().optional(),
  isHMOLicenced: Joi.boolean().optional(),
  hmoLicenceNumber: Joi.string().optional(),
  hmoLicenceExpiryDate: Joi.date().optional(),
  totalOccupants: Joi.number().optional(),
  occupantsDetails: Joi.string().optional(),
  buildingAmenityFeatures: Joi.array().items(Joi.string()).optional(),
  outdoorsSpacesFeatures: Joi.array().items(Joi.string()).optional()
};
export const commonPropertyFields = Joi.object({
  ...commonFields
});


export const shortletPropertySchema = Joi.object({
  // House type specifics
  lotSize: Joi.number().integer().optional(),
  garageSpaces: Joi.number().integer().optional(),
  outdoorsSpacesFeatures: Joi.array().items(Joi.string()).optional(),

  // Apartment specifics
  buildingName: Joi.string().optional(),
  unitNumber: Joi.number().integer().optional(),
  buildingAmenityFeatures: Joi.array().items(Joi.string()).optional(),

  safetyFeatures: Joi.array().items(Joi.string()).optional(),
  customSafetyFeatures: Joi.array().items(Joi.string()).optional(),

  // Property Details
  bedrooms: Joi.number().integer().optional(),
  beds: Joi.number().integer().optional(),
  bathrooms: Joi.number().optional(),
  maxGuests: Joi.number().integer().optional(),
  propertySize: Joi.string().optional(),
  sizeUnit: Joi.string().valid(...Object.values(AreaUnit)).messages({
    'any.only': `sizeUnit type must be one of: ${Object.values(AreaUnit).join(',')}`,
    'string.base': 'sizeUnit type must be a string'
  }).optional(),
  floorLevel: Joi.number().integer().optional(),
  totalFloors: Joi.number().integer().optional(),
  renovationYear: Joi.string().optional(),
  yearBuilt: Joi.number().integer().optional(),
  furnished: Joi.boolean().default(true),

  // Availability && Pricing
  minStayDays: Joi.number().integer().optional(),
  maxStayDays: Joi.number().integer().optional(),
  availableFrom: Joi.date().optional(),
  availableTo: Joi.date().optional(),
  basePrice: Joi.number().optional(),
  cleaningFee: Joi.number().optional(),
  weeklyDiscount: Joi.number().optional(),
  monthlyDiscount: Joi.number().optional(),

  // House Rules
  checkInTime: Joi.string().optional(),
  checkOutTime: Joi.string().optional(),
  instantBooking: Joi.boolean().default(false),
  allowChildren: Joi.boolean().default(true),
  allowInfants: Joi.boolean().default(true),
  allowPets: Joi.boolean().default(false),
  allowSmoking: Joi.boolean().default(false),
  allowParties: Joi.boolean().default(false),
  quietHours: Joi.boolean().default(false),
  quietHoursStart: Joi.string().optional(),
  quietHoursEnd: Joi.string().optional(),

  // Booking & Policies
  cancellationPolicy: Joi.string().valid(...Object.values(CancellationPolicy)).messages({
    'any.only': `CancellationPolicy type must be one of: ${Object.values(CancellationPolicy).join(',')}`,
    'string.base': 'CancellationPolicy type must be a string'
  }).optional(),
  customCancellationPolicy: Joi.string().optional(),
  houseManual: Joi.string().optional(),
  checkInInstructions: Joi.string().optional(),
  localRecommendations: Joi.string().optional(),
  emergencyContact: Joi.string().optional(),

  // Host info
  hostName: Joi.string().optional(),
  hostPhotoUrl: Joi.string().uri().optional(),
  responseRate: Joi.number().optional(),
  responseTime: Joi.string().optional(),
  isSuperhost: Joi.boolean().default(false),
  joinedDate: Joi.date().optional(),

  // Room details and shared facilities
  roomDetails: Joi.array().items(roomDetailSchema).optional(),
  sharedFacilities: Joi.array().items(sharedFacilitiesSchema).optional(),
  otherSharedFacilities: Joi.array().items(Joi.string()).optional(),

  houseRule: Joi.string().optional(),
  maxOccupant: Joi.number().integer().optional(),
  isHMO: Joi.boolean().optional(),
  isShareHouse: Joi.boolean().optional(),
  isHMOLicenced: Joi.boolean().optional(),
  hmoLicenceNumber: Joi.string().optional(),
  hmoLicenceExpiryDate: Joi.date().optional(),
  totalOccupants: Joi.number().integer().optional(),
  occupantsDetails: Joi.string().optional(),

  // Relations (referenced by ID arrays)
  bookings: Joi.array().items(bookingSchema).optional(),
  seasonalPricing: Joi.array().items(seasonalPricingSchema).optional(),
  unavailableDates: Joi.array().items(Joi.string()).optional(),
  additionalRules: Joi.array().items(Joi.string()).optional(),
  hostLanguages: Joi.array().items(Joi.string()).optional(),
});

export const residentialPropertySchema = Joi.object({
  status: Joi.string().valid(...Object.values(PropertyStatus)).messages({
    'any.only': `Property Status type must be one of: ${Object.values(PropertyStatus).join(',')}`,
    'string.base': 'PropertyStatus type must be a string'
  }).default(PropertyStatus.FOR_RENT),
  bedrooms: Joi.number().optional(),
  bathrooms: Joi.number().optional(),
  receiptionRooms: Joi.number().optional(),
  toilets: Joi.number().optional(),
  tenure: Joi.string().valid(...Object.values(TensureType)).messages({
    'any.only': `Tensure type must be one of: ${Object.values(TensureType).join(',')}`,
    'string.base': 'Tensure type must be a string'
  }).optional(),
  furnished: Joi.boolean().optional(),
  renovationYear: Joi.string().optional(),
  councilTaxBand: Joi.string().optional(),
  garageType: Joi.string().valid(...Object.values(GarageType)).messages({
    'any.only': `Garage type must be one of: ${Object.values(GarageType).join(',')}`,
    'string.base': 'Garage type must be a string'
  }).optional(),
  yearBuilt: Joi.number().optional(),
  floorLevel: Joi.number().optional(),

  totalArea: Joi.string().optional(),
  areaUnit: Joi.string().valid(...Object.values(AreaUnit)).messages({
    'any.only': `areaUnit type must be one of: ${Object.values(AreaUnit).join(',')}`,
    'string.base': 'areaUnit type must be a string'
  }).optional(),
  rentalTerms: Joi.string().optional(),
  utilities: Joi.array().items(Joi.string()).optional(),

  garden: Joi.string().optional(),
  gardenSize: Joi.string().optional(),
  houseStyle: Joi.string().optional(),
  numberOfStories: Joi.string().optional(),
  outdoorsSpacesFeatures: Joi.array().items(Joi.string()).optional(),

  buildingAmenityFeatures: Joi.array().items(Joi.string()).optional(),
  safetyFeatures: Joi.array().items(Joi.string()).optional(),

  roomDetails: Joi.array().items(roomDetailSchema).optional(),
  sharedFacilities: sharedFacilitiesSchema.optional(),
  otherSharedFacilities: Joi.array().items(Joi.string()).optional(),
  houseRule: Joi.string().optional(),
  maxOccupant: Joi.number().optional(),
  isHMO: Joi.boolean().optional(),
  isShareHouse: Joi.boolean().optional(),
  isHMOLicenced: Joi.boolean().optional(),
  hmoLicenceNumber: Joi.string().optional(),
  hmoLicenceExpiryDate: Joi.date().optional(),
  totalOccupants: Joi.number().optional(),
  occupantsDetails: Joi.string().optional(),

  unitConfigurations: Joi.array().items(unitConfigurationSchema).optional(),
  totalFloors: Joi.number().optional(),
  unitPerFloors: Joi.number().optional(),
  totalUnits: Joi.number().optional(),

  customSafetyFeatures: Joi.array().items(Joi.string()),
  epcRating: Joi.string().allow('', null).optional(),

  energyEfficiencyRating: Joi.number().optional(),
  environmentalImpactRating: Joi.number().optional(),
  heatingTypes: Joi.array().items(Joi.string()).optional(),
  coolingTypes: Joi.array().items(Joi.string()).optional(),
  glazingTypes: Joi.string().valid(...Object.values(GlazingType)).messages({
    'any.only': `Glazing type must be one of: ${Object.values(GlazingType).join(',')}`,
    'string.base': 'Glazing type must be a string'
  }).optional(),

  additionalNotes: Joi.string().optional(),
  bills: Joi.array().items(Joi.string().uuid()).optional(),

  PropertySpecification: Joi.array().items(Joi.object())
});


export const commercialPropertySchema = Joi.object({
  totalArea: Joi.string().required(),
  areaUnit: Joi.string().valid(...Object.values(AreaUnit)).messages({
    'any.only': `areaUnit type must be one of: ${Object.values(LeaseTermUnit).join(',')}`,
    'string.base': 'areaUnit type must be a string'
  }).required(),
  businessRates: Joi.string().optional(),
  serviceCharge: Joi.number().optional(),

  leaseTermUnit: Joi.string().valid(...Object.values(LeaseTermUnit)).messages({
    'any.only': `LeaseTermUnit type must be one of: ${Object.values(LeaseTermUnit).join(',')}`,
    'string.base': 'LeaseTermUnit type must be a string'
  }).required(),
  minimumLeaseTerm: Joi.number().required(),
  maximumLeaseTerm: Joi.number().optional(),

  buildingClass: Joi.string().valid(...Object.values(BuildingClass)).messages({
    'any.only': `buildingClass type must be one of: ${Object.values(BuildingClass).join(',')}`,
    'string.base': 'buildingClass type must be a string'
  }).optional(),
  lastRefurbished: Joi.string().optional(),
  totalFloors: Joi.number().optional(),
  zoning: Joi.string().optional(),
  yearBuilt: Joi.number().optional(),
  totalRooms: Joi.number().required(),
  parkingSpaces: Joi.number().default(0),
  floorLevel: Joi.number().optional(),
  availableFrom: Joi.date().optional(),

  floorNumber: Joi.number().optional(),
  workstations: Joi.number().optional(),
  meetingRooms: Joi.number().optional(),
  officeLayout: Joi.string().optional(),

  highRiseFloors: Joi.number().optional(),
  floorAvailability: Joi.array().items(commercialPropertyFloorSchema).optional(),

  securityFeatures: Joi.array().items(Joi.string()),
  clearHeight: Joi.string().optional(),
  loadingDoorsCount: Joi.number().optional(),
  powerSupply: Joi.string().optional(),
  floorLoad: Joi.string().optional(),
  columnSpacing: Joi.string().optional(),
  hasYard: Joi.boolean().default(false),
  yardDepth: Joi.string().optional(),

  safetyFeatures: Joi.array().items(Joi.string()),
  customSafetyFeatures: Joi.array().items(Joi.string()).optional(),

  epcRating: Joi.string().allow('', null).optional(),

  energyEfficiencyRating: Joi.number().optional(),
  environmentalImpactRating: Joi.number().optional(),
  heatingTypes: Joi.array().items(Joi.string()),
  coolingTypes: Joi.array().items(Joi.string()),

  hasGreenCertification: Joi.boolean().default(false),
  greenCertificationType: Joi.string().optional(),
  greenCertificationLevel: Joi.string().optional(),

  totalUnits: Joi.number().optional(),
  unitConfigurations: Joi.array().items(unitConfigurationSchema).optional(),

  leaseTerm: Joi.string().optional(),
  leaseTermNegotiable: Joi.boolean().default(true),
  rentReviewPeriod: Joi.string().optional(),
  breakClause: Joi.string().optional(),
  rentFreeOffered: Joi.boolean().default(false),
  rentFreePeriod: Joi.string().optional(),

  suitableFor: Joi.array().items(Joi.string()).optional(),
  roomDetails: Joi.array().items(roomDetailSchema).optional(),
  sharedFacilities: sharedFacilitiesSchema.optional(),
  otherSharedFacilities: Joi.array().items(Joi.string()).optional(),
  houseRule: Joi.string().optional(),
  maxOccupant: Joi.number().optional(),
  isHMO: Joi.boolean().optional(),
  isShareHouse: Joi.boolean().optional(),
  isHMOLicenced: Joi.boolean().optional(),
  hmoLicenceNumber: Joi.string().optional(),
  hmoLicenceExpiryDate: Joi.date().optional(),
  totalOccupants: Joi.number().optional(),
  occupantsDetails: Joi.string().optional(),
});

export const IBasePropertyDTOSchema = Joi.object({
  count: Joi.number().integer().min(1).max(100).default(1)
    .description('Number of properties to create (will append numbers to name)'),
  uploadedFiles: Joi.array().items(Joi.object()).optional(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  propertySize: Joi.number().optional(),
  areaUnit: Joi.string().valid(...Object.values(AreaUnit)).messages({
    'any.only': `AreaUnit type must be one of: ${Object.values(AreaUnit).join(',')}`,
    'string.base': 'AreaUnit type must be a string'
  }).optional(),
  yearBuilt: Joi.number().optional(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  stateId: Joi.string().optional(),
  country: Joi.string().required(),
  zipcode: Joi.string().required(),
  address: Joi.string().required(),
  address2: Joi.string().optional(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional(),

  currency: Joi.string().valid(...Object.values(Currency)).optional(),
  marketValue: Joi.number().optional(),
  price: Joi.number().required(),
  securityDeposit: Joi.number().optional(),
  // initialDeposit: Joi.number().optional(),
  priceFrequency: Joi.string().valid(...Object.values(PriceFrequency)).messages({
    'any.only': `priceFrequency type must be one of: ${Object.values(PriceFrequency).join(',')}`,
    'string.base': 'priceFrequency type must be a string'
  }).optional(),
  rentalPeriod: Joi.string().required(),
  specificationType: Joi.string().valid(...Object.values(PropertySpecificationType)).messages({
    'any.required': 'specificationType type is required',
    'any.only': `specificationType type must be one of: ${Object.values(PropertySpecificationType).join(',')}`,
    'string.base': 'specification type must be a string'
  }).required(),

  availability: Joi.string().valid(...Object.values(AvailabilityStatus)).messages({
    'any.only': `availability type must be one of: ${Object.values(AvailabilityStatus).join(',')}`,
    'string.base': 'availability type must be a string'
  }).optional(),
  businessRateVerified: Joi.boolean().optional(),
  postalCodeVerified: Joi.boolean().optional(),
  landRegistryNumber: Joi.string().optional(),
  vatStatus: Joi.string().valid(...Object.values(VatStatus)).optional(),

  keyFeatures: Joi.array().items(Joi.string()).required(),
  customKeyFeatures: Joi.array().items(Joi.string()).optional(),
  // nearbyAmenities: Joi.array().items(Joi.string()).optional(),
  // customNearbyAmenities: Joi.array().items(Joi.string()).optional(),
  // amenityDistances: Joi.object().pattern(Joi.string(), Joi.string()).optional(),

  propertyDocument: Joi.array().items(propertyDocumentSchema).optional(),
  images: Joi.array().items(propertyMediaFilesSchema).optional(),
  videos: Joi.array().items(propertyMediaFilesSchema).optional(),
  virtualTours: Joi.array().items(propertyMediaFilesSchema).optional(),

  propertySubType: Joi.string().valid(...Object.values(propertyType)).messages({
    'any.required': 'Property type is required',
    'any.only': `Property type must be one of: ${propertyType.join(',')}`,
    'string.base': 'Property type must be a string'
  }).required(),
  otherTypeSpecific: Joi.alternatives().try(
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
  shortlet: Joi.alternatives().conditional('specificationType', {
    is: PropertySpecificationType.SHORTLET,
    then: shortletPropertySchema.required(),
    otherwise: Joi.forbidden()
  }),
});