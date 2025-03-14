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
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class PropertyService {
    constructor() {
        this.createProperty = (propertyData) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.properties.create({
                data: Object.assign({}, propertyData)
            });
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
                    showCase: true
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
        this.getActiveOrInactivePropsListing = (landlordId_1, ...args_1) => __awaiter(this, [landlordId_1, ...args_1], void 0, function* (landlordId, isActive = true) {
            return yield __1.prismaClient.propertyListingHistory.findMany({
                where: {
                    isActive,
                    property: {
                        landlordId
                    }
                },
                include: {
                    property: Object.assign({}, this.propsInclusion),
                    apartment: true,
                }
            });
        });
        this.countListedProperties = (...args_1) => __awaiter(this, [...args_1], void 0, function* (filters = {}) {
            const { landlordId, property, minSize, maxSize, isShortlet, dueDate, yearBuilt, zipcode, amenities, mustHaves } = filters;
            const { type, state, country, specificationType, isActive, rentalFee, maxBedRoom, minBedRoom, maxBathRoom, minBathRoom, maxRentalFee, minRentalFee, marketValue, noKitchen, minGarage, maxGarage } = property || {};
            return yield __1.prismaClient.propertyListingHistory.count({
                where: Object.assign(Object.assign(Object.assign({}, (isActive !== undefined && { isActive })), (isActive !== undefined && { onListing: isActive })), { property: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (landlordId && { landlordId })), (type && { type })), (specificationType && { specificationType })), (state && {
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
            });
        });
        this.getAllListedProperties = (...args_1) => __awaiter(this, [...args_1], void 0, function* (filters = {}, skip = 0, take = 10) {
            const { landlordId, property, minSize, maxSize, isShortlet, dueDate, yearBuilt, zipcode, amenities, mustHaves } = filters;
            const { type, state, country, specificationType, isActive, rentalFee, maxBedRoom, minBedRoom, maxBathRoom, minBathRoom, maxRentalFee, minRentalFee, marketValue, noKitchen, minGarage, maxGarage } = property || {};
            // console.log("=================")
            // console.log(property)
            // console.log(filters)
            // console.log("=================")
            return yield __1.prismaClient.propertyListingHistory.findMany({
                where: Object.assign(Object.assign(Object.assign({}, (isActive !== undefined && { isActive })), (isActive !== undefined && { onListing: isActive })), { property: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (landlordId && { landlordId })), (type && { type })), (specificationType && { specificationType })), (state && {
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
        this.getPropsListedById = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            const propsListed = yield __1.prismaClient.propertyListingHistory.findFirst({
                where: {
                    propertyId
                },
                include: {
                    property: Object.assign({}, this.propsInclusion),
                    apartment: true,
                }
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
}
exports.default = new PropertyService();
