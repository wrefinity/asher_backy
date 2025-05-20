"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const __1 = require("..");
const client_2 = require("@prisma/client");
const client_3 = require("@prisma/client");
class PropertyService {
    constructor() {
        this.getProperties = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findMany({
                where: { isDeleted: false },
                include: Object.assign({}, this.propsInclusion)
            });
        });
        this.getLandlordProperties = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findMany({
                where: { isDeleted: false, landlordId },
                include: Object.assign({}, this.propsInclusion)
            });
        });
        this.getPropertyOnUserPreference = (userPreferenceTypes, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findMany({
                where: {
                    availability: client_3.AvailabilityStatus.VACANT,
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
        });
        this.getPropertiesById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findUnique({
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
        });
        this.updateProperty = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.update({
                where: { id },
                data
            });
        });
        this.deleteProperty = (landlordId, id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.update({
                where: { id, landlordId },
                data: { isDeleted: true },
                include: Object.assign({}, this.propsInclusion)
            });
        });
        this.updateAvailabiltyStatus = (landlordId, id, availability) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.update({
                where: { id, landlordId },
                data: { availability }
            });
        });
        // Function to aggregate properties by state for the current landlord
        this.aggregatePropertiesByState = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            try {
                const groupedProperties = yield __1.prismaClient.properties.groupBy({
                    by: ['stateId'],
                    where: {
                        landlordId,
                        isDeleted: false,
                    },
                });
                const propertiesByState = {};
                for (const group of groupedProperties) {
                    const stateId = group.stateId;
                    if (!stateId)
                        continue;
                    const state = yield __1.prismaClient.state.findUnique({
                        where: { id: stateId },
                    });
                    if (!state)
                        continue;
                    const rawProperties = yield __1.prismaClient.properties.findMany({
                        where: {
                            stateId,
                            landlordId,
                            isDeleted: false,
                        },
                        include: this.propsInclusion,
                    });
                    const flattenedProperties = rawProperties.map(property => {
                        var _a, _b, _c;
                        // Narrow the type of specification
                        const specifications = property.specification;
                        const activeSpec = specifications.find(spec => spec.isActive);
                        const specificDetails = ((_c = (_b = (_a = activeSpec === null || activeSpec === void 0 ? void 0 : activeSpec.residential) !== null && _a !== void 0 ? _a : activeSpec === null || activeSpec === void 0 ? void 0 : activeSpec.commercial) !== null && _b !== void 0 ? _b : activeSpec === null || activeSpec === void 0 ? void 0 : activeSpec.shortlet) !== null && _c !== void 0 ? _c : {});
                        return Object.assign(Object.assign(Object.assign({}, property), activeSpec), specificDetails);
                    });
                    propertiesByState[state.name.toLowerCase()] = flattenedProperties;
                }
                return propertiesByState;
            }
            catch (error) {
                console.error('Error in aggregatePropertiesByState:', error);
                throw error;
            }
        });
        // Function to aggregate properties by state for the current landlord
        this.getPropertiesByLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            const unGroundProps = yield __1.prismaClient.properties.findMany({
                where: {
                    landlordId,
                },
                include: this.propsInclusion,
            });
            const fullDetailsList = unGroundProps.map(property => {
                var _a, _b, _c;
                // Narrow the type of specification
                const specifications = property.specification;
                const activeSpec = specifications.find(spec => spec.isActive);
                const specificDetails = ((_c = (_b = (_a = activeSpec === null || activeSpec === void 0 ? void 0 : activeSpec.residential) !== null && _a !== void 0 ? _a : activeSpec === null || activeSpec === void 0 ? void 0 : activeSpec.commercial) !== null && _b !== void 0 ? _b : activeSpec === null || activeSpec === void 0 ? void 0 : activeSpec.shortlet) !== null && _c !== void 0 ? _c : {});
                return Object.assign(Object.assign(Object.assign({}, property), activeSpec), specificDetails);
            });
            return fullDetailsList;
        });
        // Function to aggregate properties by state for the current landlord
        this.getPropertiesByState = () => __awaiter(this, void 0, void 0, function* () {
            try {
                // Group properties by state for the current landlord
                const groupedProperties = yield __1.prismaClient.properties.groupBy({
                    by: ['stateId'], // Group by stateId instead of state name
                    where: {
                        // landlordId: landlordId, 
                        isDeleted: false, // Exclude deleted properties
                    },
                });
                // Object to store the grouped properties by state
                const propertiesByState = {};
                // Loop through each state group and fetch properties with apartments for that state
                for (const group of groupedProperties) {
                    const stateId = group.stateId;
                    if (!stateId)
                        continue; // Skip if stateId is null or undefined
                    // Fetch the state details
                    const state = yield __1.prismaClient.state.findUnique({
                        where: { id: stateId },
                    });
                    if (!state)
                        continue; // Skip if state is not found
                    // Fetch properties belonging to the current state and landlord, including apartments
                    const properties = yield __1.prismaClient.properties.findMany({
                        where: {
                            stateId: stateId,
                            // landlordId: landlordId,
                            isDeleted: false, // Exclude deleted properties
                        },
                        include: Object.assign({}, this.propsInclusion),
                    });
                    // Store the properties in the result object under the respective state name
                    propertiesByState[state.name.toLowerCase()] = properties;
                }
                return propertiesByState;
            }
            catch (error) {
                console.error('Error in getPropertiesByState:', error);
                throw error; // or handle it as per your application's needs
            }
        });
        this.checkLandlordPropertyExist = (landlordId, propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findFirst({
                where: {
                    landlordId,
                    id: propertyId
                },
                include: {
                    state: true
                }
            });
        });
        this.getPropertyExpenses = (landlordId, propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.maintenance.findMany({
                where: {
                    landlordId,
                    propertyId,
                }
            });
        });
        this.getPropertyGlobalFees = (landlordId, settingType) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertySettings.findFirst({
                where: {
                    landlordId,
                    settingType
                }
            });
        });
        // property listings
        this.getActiveOrInactivePropsListing = (landlordId_1, ...args_1) => __awaiter(this, [landlordId_1, ...args_1], void 0, function* (landlordId, isActive = true, availability = client_3.AvailabilityStatus.VACANT) {
            return yield __1.prismaClient.propertyListingHistory.findMany({
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
                        include: Object.assign({}, this.propsInclusion)
                    },
                }
            });
        });
        this.countListedProperties = (...args_1) => __awaiter(this, [...args_1], void 0, function* (filters = {}, availability = true) {
            const { landlordId, property, minSize, maxSize, isShortlet, dueDate, yearBuilt, zipcode, amenities, mustHaves } = filters;
            const { type, state, country, specificationType, isActive, rentalFee, maxBedRoom, minBedRoom, maxBathRoom, minBathRoom, maxRentalFee, minRentalFee, marketValue, noKitchen, minGarage, maxGarage } = property || {};
            return yield __1.prismaClient.propertyListingHistory.count({
                where: Object.assign(Object.assign(Object.assign({}, (isActive !== undefined && { isActive })), (isActive !== undefined && { onListing: isActive })), { property: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (landlordId && { landlordId })), (type && {
                        type: {
                            in: Array.isArray(type) ? type : [type]
                        }
                    })), (specificationType && { specificationType })), (state && {
                        state: {
                            is: {
                                name: {
                                    equals: state.toLowerCase().trim(),
                                    mode: 'insensitive'
                                }
                            }
                        }
                    })), (availability && { availability: client_3.AvailabilityStatus.VACANT })), (country && { country })), (marketValue && { marketValue: Number(marketValue) })), (rentalFee && { price: Number(rentalFee) })), (minRentalFee || maxRentalFee
                        ? {
                            price: {
                                gte: minRentalFee !== null && minRentalFee !== void 0 ? minRentalFee : undefined,
                                lte: maxRentalFee !== null && maxRentalFee !== void 0 ? maxRentalFee : undefined,
                            },
                        }
                        : {})), (zipcode && { zipcode })), (yearBuilt && { yearBuilt: new Date(yearBuilt.toString()) })), (minSize || maxSize
                        ? {
                            propertysize: {
                                gte: minSize !== null && minSize !== void 0 ? minSize : undefined,
                                lte: maxSize !== null && maxSize !== void 0 ? maxSize : undefined,
                            },
                        }
                        : {})), (amenities && amenities.length > 0 ? { amenities: { hasSome: amenities } } : {})), (mustHaves && mustHaves.length > 0
                        ? {
                            OR: mustHaves.map(mh => ({
                                amenities: {
                                    has: mh
                                }
                            }))
                        }
                        : {})) }),
            });
        });
        this.getAllListedProperties = (...args_1) => __awaiter(this, [...args_1], void 0, function* (filters = {}, skip = 0, take = 10, availability = true) {
            const { landlordId, property, minSize, maxSize, isShortlet, dueDate, yearBuilt, zipcode, amenities, mustHaves } = filters;
            const { type, state, country, specificationType, isActive, rentalFee, maxBedRoom, minBedRoom, maxBathRoom, minBathRoom, maxRentalFee, minRentalFee, marketValue, noKitchen, minGarage, maxGarage } = property || {};
            return yield __1.prismaClient.propertyListingHistory.findMany({
                where: Object.assign(Object.assign(Object.assign({}, (isActive !== undefined && { isActive })), (isActive !== undefined && { onListing: isActive })), { property: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (landlordId && { landlordId })), (availability && { availability: client_3.AvailabilityStatus.VACANT })), (specificationType && { specificationType })), (state && {
                        state: {
                            is: {
                                name: state
                            }
                        }
                    })), (country && { country })), (marketValue && { marketValue: Number(marketValue) })), (rentalFee && { price: Number(rentalFee) })), (minRentalFee || maxRentalFee
                        ? {
                            price: {
                                gte: minRentalFee !== null && minRentalFee !== void 0 ? minRentalFee : undefined,
                                lte: maxRentalFee !== null && maxRentalFee !== void 0 ? maxRentalFee : undefined,
                            },
                        }
                        : {})), (zipcode && { zipcode })), (dueDate && { dueDate: new Date(dueDate.toString()) })), (yearBuilt && { yearBuilt: new Date(yearBuilt.toString()) })), (minSize || maxSize
                        ? {
                            propertysize: {
                                gte: minSize !== null && minSize !== void 0 ? minSize : undefined,
                                lte: maxSize !== null && maxSize !== void 0 ? maxSize : undefined,
                            },
                        }
                        : {})), (amenities && amenities.length > 0 ? { amenities: { hasSome: amenities } } : {})), (mustHaves && mustHaves.length > 0
                        ? {
                            OR: mustHaves.map(mh => ({
                                amenities: {
                                    has: mh
                                }
                            }))
                        }
                        : {})) }),
                include: {
                    property: {
                        include: {
                            state: true,
                            application: true,
                            reviews: true,
                            UserLikedProperty: true,
                            landlord: this.landlordInclusion,
                            specification: this.specificationInclusion,
                        },
                    },
                },
                skip,
                take,
            });
        });
        this.createPropertyListing = (data) => __awaiter(this, void 0, void 0, function* () {
            const propListed = yield this.getPropsListedById(data.propertyId);
            if (propListed)
                throw new Error(`The props with ID ${data.propertyId} have been listed`);
            return yield __1.prismaClient.propertyListingHistory.create({
                data,
            });
        });
        this.deletePropertyListing = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            const lastListed = yield this.getPropsListedById(propertyId);
            if (!lastListed) {
                throw new Error(`No listing history found for property ID ${propertyId}`);
            }
            return yield __1.prismaClient.propertyListingHistory.update({
                where: { id: lastListed.id },
                data: {
                    onListing: false,
                    isActive: false,
                },
            });
        });
        this.delistPropertyListing = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            const lastListed = yield this.getPropsListedById(propertyId);
            if (!lastListed) {
                throw new Error(`No listing history found for property ID ${propertyId}`);
            }
            return yield __1.prismaClient.propertyListingHistory.update({
                where: { id: lastListed.id },
                data: {
                    onListing: false,
                },
            });
        });
        this.getPropsListedById = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            const propsListed = yield __1.prismaClient.propertyListingHistory.findFirst({
                where: {
                    propertyId
                },
                include: {
                    property: {
                        include: Object.assign({}, this.propsInclusion)
                    }
                },
                orderBy: { createdAt: "desc" }
            });
            return propsListed;
        });
        // to update property listings
        this.updatePropertyListing = (data, propertyId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const propsListed = yield this.getPropsListedById(propertyId);
            if (!propsListed)
                throw new Error(`The props with ID ${propertyId} have not been listed`);
            if (((_a = propsListed === null || propsListed === void 0 ? void 0 : propsListed.property) === null || _a === void 0 ? void 0 : _a.landlordId) !== landlordId) {
                throw new Error("only landlord that created this props listing can update props listing");
            }
            return yield __1.prismaClient.propertyListingHistory.update({
                where: { propertyId },
                data,
            });
        });
        // to update property to listing and not listing 
        this.updateListingStatus = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            const propsListed = yield this.getPropsListedById(propertyId);
            if (!propsListed)
                throw new Error(`The props with ID ${propertyId} have not been listed`);
            return yield __1.prismaClient.propertyListingHistory.update({
                where: { propertyId },
                data: { onListing: false },
            });
        });
        // to update property to listing and not listing
        this.getPropertyById = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findFirst({
                where: { id: propertyId },
                include: Object.assign({}, this.propsInclusion)
            });
        });
        this.getPropertiesWithoutTenants = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            // Fetch all properties where there are no tenants associated
            const properties = yield __1.prismaClient.properties.findMany({
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
        });
        this.getPropertiesAttachedToTenants = (tenantId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findFirst({
                where: {
                    tenants: {
                        some: { id: tenantId },
                    },
                }
            });
        });
        this.getUniquePropertiesBaseLandlordNameState = (landlordId, name, stateId, city) => __awaiter(this, void 0, void 0, function* () {
            const properties = yield __1.prismaClient.properties.findMany({
                where: {
                    landlordId,
                    name: { mode: "insensitive", equals: name },
                    stateId,
                    city: { mode: "insensitive", equals: city }
                }
            });
            // Return true if at least one record exists, otherwise false
            return properties.length > 0;
        });
        // property liking 
        this.getLikeHistories = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.userLikedProperty.findMany({
                where: {
                    userId,
                },
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
                    property: this.propsInclusion
                },
            });
        });
        this.getLikeHistory = (userId, propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.userLikedProperty.findUnique({
                where: {
                    userId_propertyId: {
                        userId,
                        propertyId,
                    },
                },
            });
        });
        this.createLikeHistory = (userId, propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.userLikedProperty.create({
                data: {
                    userId,
                    propertyId,
                },
            });
        });
        this.updatePropertySpecification = (tx, propertyId, specType, specId) => __awaiter(this, void 0, void 0, function* () {
            return tx.properties.update({
                where: { id: propertyId },
                data: {
                    specificationType: specType,
                    specification: {
                        create: Object.assign(Object.assign(Object.assign({ specificationType: specType, isActive: true }, (specType === client_1.PropertySpecificationType.COMMERCIAL && { commercial: { connect: { id: specId } } })), (specType === client_1.PropertySpecificationType.RESIDENTIAL && { residential: { connect: { id: specId } } })), (specType === client_1.PropertySpecificationType.SHORTLET && { shortlet: { connect: { id: specId } } }))
                    }
                },
                include: {
                    specification: {
                        where: { isActive: true },
                        include: {
                            commercial: specType === client_1.PropertySpecificationType.COMMERCIAL,
                            residential: specType === client_1.PropertySpecificationType.RESIDENTIAL,
                            shortlet: specType === client_1.PropertySpecificationType.SHORTLET
                        }
                    }
                }
            });
        });
        this.getPropertySpecificationHistory = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertySpecification.findMany({
                where: { propertyId },
                orderBy: { createdAt: 'desc' },
                include: {
                    commercial: true,
                    residential: true,
                    shortlet: true
                }
            });
        });
        this.getActiveSpecification = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertySpecification.findFirst({
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
        });
        this.specificationInclusion = {
            include: {
                residential: {
                    include: {
                        unitConfigurations: true,
                        sharedFacilities: true,
                        bills: true,
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
        };
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
        };
        this.propsInclusion = {
            propertyListingHistory: true,
            state: true,
            images: true,
            videos: true,
            virtualTours: true,
            propertyDocument: true,
            application: true,
            reviews: true,
            UserLikedProperty: true,
            landlord: this.landlordInclusion,
            specification: this.specificationInclusion
        };
    }
    createProperties(data, specification, uploadedFiles, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { shortlet, specificationType, residential, commercial } = specification;
            return __1.prismaClient.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const { agencyId, landlordId, stateId, keyFeatures } = data, rest = __rest(data, ["agencyId", "landlordId", "stateId", "keyFeatures"]);
                if (!landlordId || !stateId) {
                    throw new Error("Missing required fields: landlordId or stateId.");
                }
                if (!specificationType) {
                    throw new Error("Specification type is required.");
                }
                // Separate media by type
                const images = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'MediaTable' && (file === null || file === void 0 ? void 0 : file.type) === client_2.MediaType.IMAGE);
                const videos = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'MediaTable' && (file === null || file === void 0 ? void 0 : file.type) === client_2.MediaType.VIDEO);
                const virtualTours = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'MediaTable' && (file === null || file === void 0 ? void 0 : file.type) === client_2.MediaType.VIRTUAL_TOUR);
                const documents = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'DocTable');
                // Create the main property
                const property = yield tx.properties.create({
                    data: Object.assign(Object.assign({}, rest), { keyFeatures: { set: keyFeatures }, specificationType, landlord: { connect: { id: landlordId } }, agency: agencyId ? { connect: { id: agencyId } } : undefined, state: { connect: { id: stateId } }, images: {
                            create: images === null || images === void 0 ? void 0 : images.map(img => ({
                                type: img.type,
                                size: img.size,
                                fileType: img.fileType,
                                url: img.url,
                                isPrimary: img.isPrimary,
                                caption: img.caption,
                            }))
                        }, videos: {
                            create: videos === null || videos === void 0 ? void 0 : videos.map(vid => ({
                                type: vid.type,
                                size: vid.size,
                                fileType: vid.fileType,
                                url: vid.url,
                                isPrimary: vid.isPrimary,
                                caption: vid.caption,
                            }))
                        }, virtualTours: {
                            create: virtualTours === null || virtualTours === void 0 ? void 0 : virtualTours.map(vt => ({
                                type: vt.type,
                                size: vt.size,
                                fileType: vt.fileType,
                                url: vt.url,
                                isPrimary: vt.isPrimary,
                                caption: vt.caption,
                            }))
                        }, propertyDocument: {
                            create: documents === null || documents === void 0 ? void 0 : documents.map(doc => ({
                                documentName: doc === null || doc === void 0 ? void 0 : doc.documentName,
                                documentUrl: doc === null || doc === void 0 ? void 0 : doc.documentUrl,
                                size: doc === null || doc === void 0 ? void 0 : doc.size,
                                type: doc === null || doc === void 0 ? void 0 : doc.type,
                                idType: doc === null || doc === void 0 ? void 0 : doc.idType,
                                docType: doc === null || doc === void 0 ? void 0 : doc.docType,
                                users: {
                                    connect: { id: userId }
                                }
                            }))
                        } })
                });
                if (!property) {
                    throw new Error(`Failed to create property`);
                }
                // Step 2: Create associated specification
                switch (specificationType) {
                    case client_1.PropertySpecificationType.RESIDENTIAL:
                        yield this.createResidentialProperty(property.id, residential, tx, specification);
                        break;
                    case client_1.PropertySpecificationType.COMMERCIAL:
                        yield this.createCommercialProperty(property.id, commercial, tx, specification);
                        break;
                    case client_1.PropertySpecificationType.SHORTLET:
                        yield this.createShortletProperty(property.id, shortlet, tx, specification);
                        break;
                    default:
                        throw new Error(`Unknown specification type: ${specificationType}`);
                }
                // Step 3: Create Listing History
                // await tx.propertyListingHistory.create({
                //     data: {
                //         propertyId: property.id,
                //         onListing: true,
                //         type: 'LISTING_WEBSITE'
                //     }
                // });
                // Step 4: Return full property with related entities
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
            }), {
                maxWait: 30000, // Maximum time to wait for transaction to start (10 seconds)
                timeout: 30000 // Maximum time for transaction to complete (10 seconds)
            });
        });
    }
    createResidentialProperty(propertyId, data, tx, specification) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const { outdoorsSpacesFeature, safetyFeatures, bills, buildingAmenityFeatures, roomDetails, PropertySpecification, sharedFacilities, unitConfigurations } = data, rest = __rest(data, ["outdoorsSpacesFeature", "safetyFeatures", "bills", "buildingAmenityFeatures", "roomDetails", "PropertySpecification", "sharedFacilities", "unitConfigurations"]);
            // Verify property exists
            const property = yield tx.properties.findUnique({
                where: { id: propertyId }
            });
            if (!property)
                throw new Error(`Property ${propertyId} not found`);
            // Proceed with creation
            const residential = yield tx.residentialProperty.create({
                data: Object.assign(Object.assign({}, rest), { outdoorsSpacesFeatures: outdoorsSpacesFeature ? { set: outdoorsSpacesFeature } : undefined, buildingAmenityFeatures: buildingAmenityFeatures ? { set: buildingAmenityFeatures } : undefined, safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined, bills: {
                        connect: (bills === null || bills === void 0 ? void 0 : bills.length) ? bills === null || bills === void 0 ? void 0 : bills.map((id) => ({ id })) : undefined,
                    }, roomDetails: {
                        create: (roomDetails === null || roomDetails === void 0 ? void 0 : roomDetails.map((room) => ({
                            roomName: room.roomName,
                            roomSize: room.roomSize,
                            ensuite: room.ensuite,
                            price: room.price,
                        }))) || [],
                    }, sharedFacilities: {
                        create: {
                            kitchen: (_a = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.kitchen) !== null && _a !== void 0 ? _a : false,
                            bathroom: (_b = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.bathroom) !== null && _b !== void 0 ? _b : false,
                            livingRoom: (_c = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.livingRoom) !== null && _c !== void 0 ? _c : false,
                            garden: (_d = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.garden) !== null && _d !== void 0 ? _d : false,
                            garage: (_e = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.garage) !== null && _e !== void 0 ? _e : false,
                            laundry: (_f = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.laundry) !== null && _f !== void 0 ? _f : false,
                            parking: (_g = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.parking) !== null && _g !== void 0 ? _g : false,
                            other: (sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.other) || "",
                        },
                    }, unitConfigurations: {
                        create: (unitConfigurations === null || unitConfigurations === void 0 ? void 0 : unitConfigurations.map((unit) => ({
                            unitType: unit.unitType,
                            unitNumber: unit.unitNumber,
                            floorNumber: unit.floorNumber,
                            count: unit.count,
                            bedrooms: unit.bedrooms,
                            bathrooms: unit.bathrooms,
                            price: unit.price,
                            area: unit.area,
                            description: unit.description,
                            availability: unit.availability,
                        }))) || [],
                    } }),
            });
            return yield tx.propertySpecification.create({
                data: {
                    property: {
                        connect: { id: property.id }
                    },
                    specificationType: client_1.PropertySpecificationType.RESIDENTIAL,
                    residential: { connect: { id: residential.id } },
                    propertySubType: specification.propertySubType,
                    otherTypeSpecific: specification === null || specification === void 0 ? void 0 : specification.otherTypeSpecific
                }
            });
        });
    }
    createCommercialProperty(propertyId, data, tx, specification) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const { safetyFeatures = [], coolingTypes = [], heatingTypes = [], customSafetyFeatures = [], securityFeatures = [], otherSharedFacilities = [], floorAvailability, roomDetails, unitConfigurations, suitableFor, PropertySpecification, sharedFacilities } = data, rest = __rest(data, ["safetyFeatures", "coolingTypes", "heatingTypes", "customSafetyFeatures", "securityFeatures", "otherSharedFacilities", "floorAvailability", "roomDetails", "unitConfigurations", "suitableFor", "PropertySpecification", "sharedFacilities"]);
            const property = yield tx.properties.findUnique({
                where: { id: propertyId }
            });
            if (!property)
                throw new Error(`Property ${propertyId} not found`);
            // Proceed with creation
            const commercial = yield tx.commercialProperty.create({
                data: Object.assign(Object.assign({}, rest), { 
                    // property: { connect: { id: propertyId } }, // Ensure connection to parent property
                    // All array fields with set operations
                    securityFeatures: securityFeatures ? { set: securityFeatures } : undefined, safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined, customSafetyFeatures: customSafetyFeatures ? { set: customSafetyFeatures } : undefined, coolingTypes: coolingTypes ? { set: coolingTypes } : undefined, heatingTypes: heatingTypes ? { set: heatingTypes } : undefined, otherSharedFacilities: otherSharedFacilities ? { set: otherSharedFacilities } : undefined, 
                    // Required fields from your model
                    leaseTermUnit: rest.leaseTermUnit || "YEARS", minimumLeaseTerm: rest.minimumLeaseTerm || 12, 
                    // Nested creates
                    floorAvailability: {
                        create: (floorAvailability === null || floorAvailability === void 0 ? void 0 : floorAvailability.map((floor) => ({
                            floorNumber: floor.floorNumber,
                            area: floor.area,
                            price: floor.price,
                            available: floor.available,
                            partialFloor: floor.partialFloor,
                            description: floor.description,
                            amenities: (floor === null || floor === void 0 ? void 0 : floor.amenities) ? { set: securityFeatures } : undefined,
                        }))) || []
                    }, roomDetails: {
                        create: (roomDetails === null || roomDetails === void 0 ? void 0 : roomDetails.map((room) => ({
                            roomName: room.roomName,
                            roomSize: room.roomSize,
                            ensuite: room.ensuite,
                            price: room.price,
                        }))) || []
                    }, sharedFacilities: {
                        create: {
                            kitchen: (_a = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.kitchen) !== null && _a !== void 0 ? _a : false,
                            bathroom: (_b = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.bathroom) !== null && _b !== void 0 ? _b : false,
                            livingRoom: (_c = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.livingRoom) !== null && _c !== void 0 ? _c : false,
                            garden: (_d = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.garden) !== null && _d !== void 0 ? _d : false,
                            garage: (_e = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.garage) !== null && _e !== void 0 ? _e : false,
                            laundry: (_f = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.laundry) !== null && _f !== void 0 ? _f : false,
                            parking: (_g = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.parking) !== null && _g !== void 0 ? _g : false,
                            other: (sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.other) || "",
                        }
                    }, suitableFor: {
                        create: (suitableFor === null || suitableFor === void 0 ? void 0 : suitableFor.map((name) => ({ name }))) || []
                    }, unitConfigurations: {
                        create: (unitConfigurations === null || unitConfigurations === void 0 ? void 0 : unitConfigurations.map((unit) => ({
                            unitType: unit.unitType,
                            unitNumber: unit.unitNumber,
                            floorNumber: unit.floorNumber,
                            count: unit.count,
                            bedrooms: unit.bedrooms,
                            bathrooms: unit.bathrooms,
                            price: unit.price,
                            area: unit.area,
                            description: unit.description,
                            availability: unit.availability,
                        }))) || []
                    } })
            });
            return commercial;
        });
    }
    createShortletProperty(propertyId, data, tx, specification) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            const { safetyFeatures, buildingAmenityFeatures, outdoorsSpacesFeatures, hostLanguages, additionalRules, unavailableDates, seasonalPricing, PropertySpecification, sharedFacilities, roomDetails } = data, rest = __rest(data, ["safetyFeatures", "buildingAmenityFeatures", "outdoorsSpacesFeatures", "hostLanguages", "additionalRules", "unavailableDates", "seasonalPricing", "PropertySpecification", "sharedFacilities", "roomDetails"]);
            // Step 1: Verify property exists
            const property = yield tx.properties.findUnique({
                where: { id: propertyId }
            });
            if (!property)
                throw new Error(`Property ${propertyId} not found`);
            // Proceed with creation
            const shortlet = yield tx.shortletProperty.create({
                data: Object.assign(Object.assign({}, rest), { safetyFeatures: safetyFeatures ? { set: safetyFeatures } : undefined, outdoorsSpacesFeatures: outdoorsSpacesFeatures ? { set: outdoorsSpacesFeatures } : undefined, buildingAmenityFeatures: buildingAmenityFeatures ? { set: buildingAmenityFeatures } : undefined, roomDetails: {
                        create: (roomDetails === null || roomDetails === void 0 ? void 0 : roomDetails.map((room) => ({
                            roomName: room.roomName,
                            roomSize: room.roomSize,
                            ensuite: room.ensuite,
                            price: room.price,
                        }))) || [],
                    }, seasonalPricing: {
                        create: (seasonalPricing === null || seasonalPricing === void 0 ? void 0 : seasonalPricing.map((season) => ({
                            seasonName: season.seasonName,
                            startDate: season.startDate,
                            endDate: season.endDate,
                            price: season.price,
                        }))) || [],
                    }, unavailableDates: {
                        create: (unavailableDates === null || unavailableDates === void 0 ? void 0 : unavailableDates.map((dt) => ({
                            date: dt
                        }))) || [],
                    }, additionalRules: {
                        create: (additionalRules === null || additionalRules === void 0 ? void 0 : additionalRules.map((r) => ({
                            rule: r
                        }))) || [],
                    }, hostLanguages: {
                        create: (hostLanguages === null || hostLanguages === void 0 ? void 0 : hostLanguages.map((lang) => ({
                            language: lang
                        }))) || [],
                    }, sharedFacilities: {
                        create: {
                            kitchen: (_a = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.kitchen) !== null && _a !== void 0 ? _a : false,
                            bathroom: (_b = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.bathroom) !== null && _b !== void 0 ? _b : false,
                            livingRoom: (_c = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.livingRoom) !== null && _c !== void 0 ? _c : false,
                            garden: (_d = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.garden) !== null && _d !== void 0 ? _d : false,
                            garage: (_e = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.garage) !== null && _e !== void 0 ? _e : false,
                            laundry: (_f = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.laundry) !== null && _f !== void 0 ? _f : false,
                            parking: (_g = sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.parking) !== null && _g !== void 0 ? _g : false,
                            other: (sharedFacilities === null || sharedFacilities === void 0 ? void 0 : sharedFacilities.other) || "",
                        },
                    } }),
            });
            return yield tx.propertySpecification.create({
                data: {
                    property: {
                        connect: { id: property.id }
                    },
                    specificationType: client_1.PropertySpecificationType.SHORTLET,
                    shortlet: { connect: { id: shortlet.id } },
                    propertySubType: specification.propertySubType,
                    otherTypeSpecific: specification === null || specification === void 0 ? void 0 : specification.otherTypeSpecific
                }
            });
        });
    }
    switchPropertyType(data, specification, propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b, _c, _d;
                // Verify property exists and get current active specification
                const property = yield tx.properties.findUnique({
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
                if ((_a = property.specification) === null || _a === void 0 ? void 0 : _a.length) {
                    yield tx.propertySpecification.updateMany({
                        where: { propertyId: property === null || property === void 0 ? void 0 : property.id },
                        //   where: { id: property.specification[0].id },
                        data: { isActive: false }
                    });
                }
                // Create or reuse specification based on target type
                switch (data.specificationType) {
                    case client_1.PropertySpecificationType.COMMERCIAL:
                        return this.handleCommercialSwitch(tx, specification.commercial, propertyId, (_b = property.specification) === null || _b === void 0 ? void 0 : _b[0]);
                    case client_1.PropertySpecificationType.RESIDENTIAL:
                        return this.handleResidentialSwitch(tx, specification.residential, propertyId, (_c = property.specification) === null || _c === void 0 ? void 0 : _c[0]);
                    case client_1.PropertySpecificationType.SHORTLET:
                        return this.handleShortletSwitch(tx, specification.shortlet, propertyId, (_d = property.specification) === null || _d === void 0 ? void 0 : _d[0]);
                    default:
                        throw new Error("Invalid property type");
                }
            }));
        });
    }
    handleCommercialSwitch(tx, request, propertyId, currentSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            const commercialData = __rest(request, []);
            // Reuse existing commercial spec if available, otherwise create new
            const commercial = (currentSpec === null || currentSpec === void 0 ? void 0 : currentSpec.commercial)
                ? yield tx.commercialProperty.create({
                    data: Object.assign(Object.assign(Object.assign(Object.assign({}, currentSpec.commercial), { id: undefined }), commercialData), { securityFeatures: { set: currentSpec.commercial.securityFeatures || commercialData.securityFeatures } })
                })
                : yield tx.commercialProperty.create({
                    data: Object.assign(Object.assign({}, commercialData), { securityFeatures: { set: commercialData.securityFeatures || [] } })
                });
            return this.updatePropertySpecification(tx, propertyId, "COMMERCIAL", commercial.id);
        });
    }
    handleResidentialSwitch(tx, request, propertyId, currentSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            const residentialData = __rest(request, []);
            const residential = (currentSpec === null || currentSpec === void 0 ? void 0 : currentSpec.residential)
                ? yield tx.residentialProperty.create({
                    data: Object.assign(Object.assign(Object.assign(Object.assign({}, currentSpec.residential), { id: undefined }), residentialData), { safetyFeatures: { set: residentialData.safetyFeatures || currentSpec.residential.safetyFeatures } })
                })
                : yield tx.residentialProperty.create({
                    data: Object.assign(Object.assign({}, residentialData), { safetyFeatures: { set: residentialData.safetyFeatures || [] } })
                });
            return this.updatePropertySpecification(tx, propertyId, client_1.PropertySpecificationType.RESIDENTIAL, residential.id);
        });
    }
    handleShortletSwitch(tx, request, propertyId, currentSpec) {
        return __awaiter(this, void 0, void 0, function* () {
            const shortletData = __rest(request, []);
            const shortlet = (currentSpec === null || currentSpec === void 0 ? void 0 : currentSpec.shortlet)
                ? yield tx.shortletProperty.create({
                    data: Object.assign(Object.assign(Object.assign(Object.assign({}, currentSpec.shortlet), { id: undefined }), shortletData), { safetyFeatures: { set: shortletData.safetyFeatures || currentSpec.shortlet.safetyFeatures } })
                })
                : yield tx.shortletProperty.create({
                    data: Object.assign(Object.assign({}, shortletData), { safetyFeatures: { set: shortletData.safetyFeatures || [] } })
                });
            return this.updatePropertySpecification(tx, propertyId, client_1.PropertySpecificationType.SHORTLET, shortlet.id);
        });
    }
    createBooking(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { shortletId } = data, rest = __rest(data, ["shortletId"]);
            return yield __1.prismaClient.booking.create({
                data: Object.assign(Object.assign({}, rest), { property: {
                        connect: { id: shortletId }
                    } }),
            });
        });
    }
    createSeasonalPricing(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { propertyId } = data, rest = __rest(data, ["propertyId"]);
            return yield __1.prismaClient.seasonalPricing.create({
                data: Object.assign(Object.assign({}, rest), { property: {
                        connect: { id: propertyId }
                    } }),
            });
        });
    }
    createUnavailableDate(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { shortletId } = data, rest = __rest(data, ["shortletId"]);
            return yield __1.prismaClient.unavailableDate.create({
                data: Object.assign(Object.assign({}, rest), { shortlet: {
                        connect: { id: shortletId }
                    } })
            });
        });
    }
    createAdditionalRule(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { shortletId } = data, rest = __rest(data, ["shortletId"]);
            return yield __1.prismaClient.additionalRule.create({
                data: Object.assign(Object.assign({}, rest), { shortlet: {
                        connect: { id: shortletId }
                    } }),
            });
        });
    }
    createHostLanguage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { shortletId } = data, rest = __rest(data, ["shortletId"]);
            return yield __1.prismaClient.hostLanguage.create({
                data: Object.assign(Object.assign({}, rest), { shortlet: {
                        connect: { id: shortletId }
                    } }),
            });
        });
    }
}
exports.default = new PropertyService();
