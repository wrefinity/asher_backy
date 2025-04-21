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
// PropertyL
const client_3 = require("@prisma/client");
class PropertyService {
    constructor() {
        this.createProperty = (propertyData) => __awaiter(this, void 0, void 0, function* () {
            const created = yield __1.prismaClient.properties.create({
                data: Object.assign({}, propertyData)
            });
            if (created) {
                this.createPropertyListing({
                    propertyId: created === null || created === void 0 ? void 0 : created.id,
                    isShortlet: created.specificationType == client_1.PropertySpecificationType.SHORTLET ? true : false,
                    payApplicationFee: true,
                    type: client_1.ListingType.LISTING_WEBSITE
                });
            }
            return created;
        });
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
        this.getPropertiesById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findUnique({
                where: { id },
                include: {
                    apartments: true,
                    state: true,
                    applicant: true,
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
                // Group properties by stateId for the current landlord
                const groupedProperties = yield __1.prismaClient.properties.groupBy({
                    by: ['stateId'], // Group by stateId instead of state name
                    where: {
                        landlordId, // Filter by the current landlordId
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
                            landlordId: landlordId,
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
                console.error('Error in aggregatePropertiesByState:', error);
                throw error; // or handle it as per your application's needs
            }
        });
        // Function to aggregate properties by state for the current landlord
        this.getPropertiesByLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            // Group properties by state for the current landlord
            const unGroundProps = yield __1.prismaClient.properties.findMany({
                where: {
                    landlordId,
                },
                include: Object.assign({}, this.propsInclusion)
            });
            return unGroundProps;
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
        this.showCaseRentals = (propertyId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.update({
                where: {
                    landlordId,
                    id: propertyId,
                },
                data: {
                    showCase: true
                }
            });
        });
        this.getShowCasedRentals = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.findMany({
                where: {
                    landlordId,
                    // showCase: true
                }
            });
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
            return yield __1.prismaClient.propApartmentSettings.findFirst({
                where: {
                    landlordId,
                    settingType
                }
            });
        });
        // property listings
        this.getActiveOrInactivePropsListing = (landlordId_1, ...args_1) => __awaiter(this, [landlordId_1, ...args_1], void 0, function* (landlordId, isActive = true, availability = client_3.PropsApartmentStatus.VACANT) {
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
                    apartment: true,
                }
            });
        });
        this.countListedProperties = (...args_1) => __awaiter(this, [...args_1], void 0, function* (filters = {}, availability = true) {
            const { landlordId, property, minSize, maxSize, isShortlet, dueDate, yearBuilt, zipcode, amenities, mustHaves } = filters;
            const { type, state, country, specificationType, isActive, rentalFee, maxBedRoom, minBedRoom, maxBathRoom, minBathRoom, maxRentalFee, minRentalFee, marketValue, noKitchen, minGarage, maxGarage } = property || {};
            return yield __1.prismaClient.propertyListingHistory.count({
                where: Object.assign(Object.assign(Object.assign({}, (isActive !== undefined && { isActive })), (isActive !== undefined && { onListing: isActive })), { property: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (landlordId && { landlordId })), (type && {
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
                    })), (availability && { availability: client_3.PropsApartmentStatus.VACANT })), (country && { country })), (marketValue && { marketValue: Number(marketValue) })), (rentalFee && { rentalFee: Number(rentalFee) })), (minRentalFee || maxRentalFee
                        ? {
                            rentalFee: {
                                gte: minRentalFee !== null && minRentalFee !== void 0 ? minRentalFee : undefined,
                                lte: maxRentalFee !== null && maxRentalFee !== void 0 ? maxRentalFee : undefined,
                            },
                        }
                        : {})), (maxBedRoom || minBedRoom
                        ? {
                            noBedRoom: {
                                gte: minBedRoom !== null && minBedRoom !== void 0 ? minBedRoom : undefined,
                                lte: maxBedRoom !== null && maxBedRoom !== void 0 ? maxBedRoom : undefined,
                            },
                        }
                        : {})), (maxBathRoom || minBathRoom
                        ? {
                            noBathRoom: {
                                gte: minBathRoom !== null && minBathRoom !== void 0 ? minBathRoom : undefined,
                                lte: maxBathRoom !== null && maxBathRoom !== void 0 ? maxBathRoom : undefined,
                            },
                        }
                        : {})), (minGarage || maxGarage
                        ? {
                            noGarage: {
                                gte: minGarage !== null && minGarage !== void 0 ? minGarage : undefined,
                                lte: maxGarage !== null && maxGarage !== void 0 ? maxGarage : undefined,
                            },
                        }
                        : {})), (noKitchen && { noKitchen: Number(noKitchen) })), (zipcode && { zipcode })), (isShortlet !== undefined && { isShortlet })), (dueDate && { dueDate: new Date(dueDate.toString()) })), (yearBuilt && { yearBuilt: new Date(yearBuilt.toString()) })), (minSize || maxSize
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
                where: Object.assign(Object.assign(Object.assign({}, (isActive !== undefined && { isActive })), (isActive !== undefined && { onListing: isActive })), { property: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (landlordId && { landlordId })), (type && {
                        type: {
                            in: Array.isArray(type) ? type : [type]
                        }
                    })), (availability && { availability: client_3.PropsApartmentStatus.VACANT })), (specificationType && { specificationType })), (state && {
                        state: {
                            is: {
                                name: state
                            }
                        }
                    })), (country && { country })), (marketValue && { marketValue: Number(marketValue) })), (rentalFee && { rentalFee: Number(rentalFee) })), (minRentalFee || maxRentalFee
                        ? {
                            rentalFee: {
                                gte: minRentalFee !== null && minRentalFee !== void 0 ? minRentalFee : undefined,
                                lte: maxRentalFee !== null && maxRentalFee !== void 0 ? maxRentalFee : undefined,
                            },
                        }
                        : {})), (maxBedRoom || minBedRoom
                        ? {
                            noBedRoom: {
                                gte: minBedRoom !== null && minBedRoom !== void 0 ? minBedRoom : undefined,
                                lte: maxBedRoom !== null && maxBedRoom !== void 0 ? maxBedRoom : undefined,
                            },
                        }
                        : {})), (maxBathRoom || minBathRoom
                        ? {
                            noBathRoom: {
                                gte: minBathRoom !== null && minBathRoom !== void 0 ? minBathRoom : undefined,
                                lte: maxBathRoom !== null && maxBathRoom !== void 0 ? maxBathRoom : undefined,
                            },
                        }
                        : {})), (minGarage || maxGarage
                        ? {
                            noGarage: {
                                gte: minGarage !== null && minGarage !== void 0 ? minGarage : undefined,
                                lte: maxGarage !== null && maxGarage !== void 0 ? maxGarage : undefined,
                            },
                        }
                        : {})), (noKitchen && { noKitchen: Number(noKitchen) })), (zipcode && { zipcode })), (isShortlet !== undefined && { isShortlet })), (dueDate && { dueDate: new Date(dueDate.toString()) })), (yearBuilt && { yearBuilt: new Date(yearBuilt.toString()) })), (minSize || maxSize
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
                            apartments: true,
                            state: true,
                            applicant: true,
                            reviews: true,
                            UserLikedProperty: true,
                            landlord: this.landlordInclusion,
                        },
                    },
                    apartment: true,
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
                    },
                    apartment: true,
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
                    property: true
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
            apartments: true,
            state: true,
            applicant: true,
            reviews: true,
            UserLikedProperty: true,
            landlord: this.landlordInclusion
        };
    }
    createPropertyFeature(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertyFeatures.createMany({
                data,
                skipDuplicates: true
            });
        });
    }
    getPropertyFeature() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.propertyFeatures.findMany();
        });
    }
    getPropertyFeaturesByIds(featureIds) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!featureIds || featureIds.length === 0) {
                return [];
            }
            const existingFeatures = yield __1.prismaClient.propertyFeatures.findMany({
                where: {
                    id: { in: featureIds },
                },
                select: { id: true },
            });
            const existingFeatureIds = existingFeatures.map((f) => f.id);
            const missingFeatureIds = featureIds.filter((id) => !existingFeatureIds.includes(id));
            if (missingFeatureIds.length > 0) {
                throw new Error(`The following feature IDs do not exist: ${missingFeatureIds.join(", ")}`);
            }
            return existingFeatureIds;
        });
    }
    ensurePropertyIsNotLinked(propertyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [residential, commercial, shortlet] = yield Promise.all([
                __1.prismaClient.residentialProperty.findUnique({ where: { propertyId } }),
                __1.prismaClient.commercialProperty.findUnique({ where: { propertyId } }),
                __1.prismaClient.shortletProperty.findUnique({ where: { propertyId } }),
            ]);
            if (residential) {
                throw new Error(`Property with ID ${propertyId} is already linked to a residential property.`);
            }
            if (commercial) {
                throw new Error(`Property with ID ${propertyId} is already linked to a commercial property.`);
            }
            if (shortlet) {
                throw new Error(`Property with ID ${propertyId} is already linked to a shortlet property.`);
            }
        });
    }
    createProperties(data, uploadedFiles, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const { specificationType, agencyId, landlordId, stateId, shortlet, residential, commercial } = data, rest = __rest(data, ["specificationType", "agencyId", "landlordId", "stateId", "shortlet", "residential", "commercial"]);
                // Separate media by type
                const images = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'MediaTable' && (file === null || file === void 0 ? void 0 : file.type) === client_2.MediaType.IMAGE);
                const videos = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'MediaTable' && (file === null || file === void 0 ? void 0 : file.type) === client_2.MediaType.VIDEO);
                const virtualTours = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'MediaTable' && (file === null || file === void 0 ? void 0 : file.type) === client_2.MediaType.VIRTUAL_TOUR);
                const documents = uploadedFiles === null || uploadedFiles === void 0 ? void 0 : uploadedFiles.filter(file => (file === null || file === void 0 ? void 0 : file.identifier) === 'DocTable');
                // Step 1: Create the main property
                const property = yield tx.properties.create({
                    data: Object.assign(Object.assign({}, rest), { specificationType, landlord: { connect: { id: landlordId } }, agency: agencyId ? { connect: { id: agencyId } } : undefined, state: { connect: { id: stateId } }, image: {
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
                console.log("=====================================================");
                console.log("Property created:", property);
                console.log("=====================================================");
                // Step 2: Create associated specification
                switch (specificationType) {
                    case client_1.PropertySpecificationType.RESIDENTIAL:
                        yield this.createResidentialProperty(property.id, residential, tx);
                        break;
                    case client_1.PropertySpecificationType.COMMERCIAL:
                        yield this.createCommercialProperty(property.id, commercial, tx);
                        break;
                    case client_1.PropertySpecificationType.SHORTLET:
                        yield this.createShortletProperty(property.id, shortlet, tx);
                        break;
                    default:
                        throw new Error(`Unknown specification type: ${specificationType}`);
                }
                // Step 3: Create Listing History
                yield tx.propertyListingHistory.create({
                    data: {
                        propertyId: property.id,
                        onListing: true,
                        type: 'LISTING_WEBSITE'
                    }
                });
                // Step 4: Return full property with related entities
                return tx.properties.findUnique({
                    where: { id: property.id },
                    include: {
                        residential: true,
                        commercial: true,
                        shortlet: true,
                        image: true,
                        videos: true,
                        virtualTours: true,
                        propertyDocument: true,
                        sharedFacilities: true
                    }
                });
            }), {
                maxWait: 30000, // Maximum time to wait for transaction to start (10 seconds)
                timeout: 30000 // Maximum time for transaction to complete (10 seconds)
            });
        });
    }
    createResidentialProperty(propertyId, data, tx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { keyFeatures: featureIds } = data, rest = __rest(data, ["keyFeatures"]);
            // Step 1: Verify property exists
            const property = yield tx.properties.findUnique({
                where: { id: propertyId }
            });
            if (!property)
                throw new Error(`Property ${propertyId} not found`);
            // Step 2: Check if the key features exist
            const keyFeatures = yield this.getPropertyFeaturesByIds(featureIds);
            if (keyFeatures.length !== featureIds.length) {
                throw new Error(`Some key features do not exist.`);
            }
            // Step 3: Ensure property is not already linked
            yield this.ensurePropertyIsNotLinked(propertyId);
            // Step 4: Proceed with creation
            return yield tx.residentialProperty.create({
                data: Object.assign(Object.assign({}, rest), { property: {
                        connect: { id: propertyId },
                    }, keyFeatures: {
                        connect: keyFeatures.map((id) => ({ id })),
                    } }),
            });
        });
    }
    createCommercialProperty(propertyId, data, tx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { keyFeatures: featureIds, securityFeatures: featureIdx } = data, rest = __rest(data, ["keyFeatures", "securityFeatures"]);
            // Step 1: Verify property exists
            const property = yield tx.properties.findUnique({
                where: { id: propertyId }
            });
            if (!property)
                throw new Error(`Property ${propertyId} not found`);
            // Step 2: Check if the key features exist
            const keyFeatures = yield this.getPropertyFeaturesByIds(featureIds);
            if (keyFeatures.length !== featureIds.length) {
                throw new Error(`Some key features do not exist.`);
            }
            const secFeatures = yield this.getPropertyFeaturesByIds(featureIdx);
            if (secFeatures.length !== featureIdx.length) {
                throw new Error(`Some security features do not exist.`);
            }
            // Step 3: Ensure property is not already linked
            yield this.ensurePropertyIsNotLinked(propertyId);
            // Step 4: Proceed with creation
            return yield tx.commercialProperty.create({
                data: Object.assign(Object.assign({}, rest), { property: {
                        connect: { id: propertyId },
                    }, keyFeatures: {
                        connect: keyFeatures.map((id) => ({ id })),
                    }, securityFeatures: {
                        connect: secFeatures.map((id) => ({ id })),
                    } }),
            });
        });
    }
    createShortletProperty(propertyId, data, tx) {
        return __awaiter(this, void 0, void 0, function* () {
            const { safetyFeatures: featureIds } = data, rest = __rest(data, ["safetyFeatures"]);
            // Step 1: Verify property exists
            const property = yield tx.properties.findUnique({
                where: { id: propertyId }
            });
            if (!property)
                throw new Error(`Property ${propertyId} not found`);
            // Step 2: Check if the key features exist
            const keyFeatures = yield this.getPropertyFeaturesByIds(featureIds);
            if (keyFeatures.length !== featureIds.length) {
                throw new Error(`Some key features do not exist.`);
            }
            // Step 3: Ensure property is not already linked
            yield this.ensurePropertyIsNotLinked(propertyId);
            // Step 4: Proceed with creation
            return yield tx.shortletProperty.create({
                data: Object.assign(Object.assign({}, rest), { property: {
                        connect: { id: propertyId },
                    }, safetyFeatures: {
                        connect: keyFeatures.map((id) => ({ id })),
                    } }),
            });
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
