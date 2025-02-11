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
const __1 = require("../..");
class TenantService {
    constructor() {
        this.getTenantWithUserAndProfile = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.tenants.findFirst({
                where: { id },
                include: {
                    user: {
                        include: {
                            profile: true,
                            nextOfKin: true,
                            applicantion: {
                                include: {
                                    employmentInfo: true,
                                    emergencyInfo: true,
                                    guarantorInformation: true,
                                    referee: true
                                }
                            },
                        },
                    },
                    landlord: true,
                    property: true,
                    apartments: true
                },
            });
        });
        this.getPreviousTenantsForLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            // Get previous tenants
            // TODO: get grace period and add the grace period to the 
            // lease end date, then check if cyrrent is greater than it
            return yield __1.prismaClient.tenants.findMany({
                where: {
                    landlordId: landlordId,
                    isCurrentLease: false,
                    landlord: {
                        isDeleted: false,
                    },
                },
                include: this.inclusion
            });
        });
        this.getCurrenntTenantsForLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            // Get current tenants
            return yield __1.prismaClient.tenants.findMany({
                where: {
                    landlordId: landlordId,
                    isCurrentLease: true,
                    landlord: {
                        isDeleted: false,
                    },
                },
                include: this.inclusion
            });
        });
        this.getAllTenants = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.tenants.findMany({
                where: {
                    landlordId: landlordId,
                    landlord: {
                        isDeleted: false,
                    },
                },
                include: this.inclusion,
            });
        });
        this.getTenantByUserIdAndLandlordId = (userId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            // Query the tenant based on the userId
            const tenant = yield __1.prismaClient.tenants.findFirst({
                where: {
                    userId: userId, // Filtering by userId
                    property: {
                        landlordId,
                    }
                },
                include: {
                    property: true, // Include related property data
                },
            });
            return tenant;
        });
        this.inclusion = {
            user: {
                include: {
                    profile: true,
                    nextOfKin: true,
                    residentialInformation: true,
                    applicantion: {
                        include: {
                            employmentInfo: true,
                            emergencyInfo: true,
                            guarantorInformation: true,
                            referee: true
                        }
                    },
                },
            },
            property: true,
            history: true,
            landlord: true,
            apartments: true,
            tenantSupportTicket: true,
            // PropertyTransactions: true,
        };
    }
}
exports.default = new TenantService();
