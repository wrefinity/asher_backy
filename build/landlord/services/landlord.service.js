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
exports.LandlordService = void 0;
const index_1 = require("../../index");
class LandlordService {
    constructor() {
        // Update an existing landlord
        this.updateLandlord = (id, data) => __awaiter(this, void 0, void 0, function* () {
            const landlord = yield index_1.prismaClient.landlords.update({
                where: { id },
                data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, ((data === null || data === void 0 ? void 0 : data.userId) && { user: { connect: { id: data.userId } } })), ((data === null || data === void 0 ? void 0 : data.properties) && {
                    property: {
                        connect: data.properties.connect,
                        disconnect: data.properties.disconnect,
                    },
                })), ((data === null || data === void 0 ? void 0 : data.tenants) && {
                    tenants: {
                        connect: data.tenants.connect,
                        disconnect: data.tenants.disconnect,
                    },
                })), (data.lnadlordSupportTicket && {
                    lnadlordSupportTicket: {
                        connect: data.lnadlordSupportTicket.connect,
                        disconnect: data.lnadlordSupportTicket.disconnect,
                    },
                })), (data.transactions && {
                    transactions: {
                        connect: data.transactions.connect,
                        disconnect: data.transactions.disconnect,
                    },
                })), (data.reviews && {
                    reviews: {
                        connect: data.reviews.connect,
                        disconnect: data.reviews.disconnect,
                    },
                })), { 
                    // Handle other fields like isDeleted
                    isDeleted: data.isDeleted || undefined }),
            });
            return landlord;
        });
        // Delete a landlord
        this.deleteLandlord = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield index_1.prismaClient.landlords.update({
                where: { id },
                data: { isDeleted: true }
            });
        });
        // Get all landlords
        this.getAllLandlords = () => __awaiter(this, void 0, void 0, function* () {
            return yield index_1.prismaClient.landlords.findMany({
                include: {
                    user: true,
                    property: true,
                },
                where: {
                    isDeleted: false
                }
            });
        });
        // Get a single landlord by ID
        this.getLandlordById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield index_1.prismaClient.landlords.findUnique({
                where: { id },
                include: {
                    user: true,
                    property: true,
                },
            });
        });
        // Get current tenants
        this.getCurrentTenants = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            const currentTenants = yield index_1.prismaClient.tenants.findMany({
                where: {
                    isCurrentLease: true,
                    landlordId: landlordId,
                    leaseEndDate: {
                        gte: new Date()
                    }
                },
                include: {
                    user: true,
                    landlord: true,
                    property: true,
                }
            });
            return currentTenants;
        });
        // Get previous tenants
        this.getPreviousTenants = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            const previousTenants = yield index_1.prismaClient.tenants.findMany({
                where: {
                    OR: [
                        { landlordId: landlordId },
                        { isCurrentLease: false },
                        { leaseEndDate: { lt: new Date() } }
                    ]
                },
                include: {
                    user: true,
                    landlord: true,
                    property: true
                }
            });
            return previousTenants;
        });
    }
    // Get current vendors working on a property that belongs to a landlord
    getCurrentVendorsByLandlord(landlordId) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentVendors = yield index_1.prismaClient.vendors.findMany({
                where: {
                    services: {
                        some: {
                            maintenance: {
                                some: {
                                    property: {
                                        landlordId: landlordId,
                                    },
                                    isDeleted: false,
                                    // scheduleDate: {
                                    //     gte: new Date(), // Ensure the job is scheduled for the current or future date
                                    // },
                                    status: 'ASSIGNED', // Filter where maintenance status is ASSIGNED
                                },
                            },
                        },
                    },
                },
                include: {
                    services: {
                        include: {
                            maintenance: {
                                include: {
                                    property: true,
                                },
                            },
                        },
                    },
                },
            });
            return currentVendors;
        });
    }
    // Get current vendors working on a property that belongs to a landlord
    getCompletedJobsLandlord(landlordId) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentVendors = yield index_1.prismaClient.vendors.findMany({
                where: {
                    services: {
                        some: {
                            maintenance: {
                                some: {
                                    property: {
                                        landlordId: landlordId,
                                    },
                                    isDeleted: false,
                                    status: 'COMPLETED',
                                },
                            },
                        },
                    },
                },
                include: {
                    services: {
                        include: {
                            maintenance: {
                                include: {
                                    property: true,
                                },
                            },
                        },
                    },
                },
            });
            return currentVendors;
        });
    }
}
exports.LandlordService = LandlordService;
