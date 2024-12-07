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
const index_1 = require("../../index");
const client_1 = require("@prisma/client");
class LandlordMaintenanceService {
    constructor() {
        this.getRequestedMaintenanceByLandlord = (landlordId, status) => __awaiter(this, void 0, void 0, function* () {
            const maintenanceRequests = yield index_1.prismaClient.maintenance.findMany({
                where: Object.assign({ landlordId: landlordId, property: {
                        landlordId: landlordId,
                    }, isDeleted: false }, (status && { status: status })),
                include: Object.assign({ landlord: true }, this.inclusion),
            });
            return maintenanceRequests;
        });
        // get all maintenances on current landlord properties base on status
        this.getLandlordPropertiesMaintenance = (landlordId, status) => __awaiter(this, void 0, void 0, function* () {
            return yield index_1.prismaClient.maintenance.findMany({
                where: Object.assign(Object.assign({ property: {
                        landlordId: landlordId,
                    } }, (status && { status: status })), { isDeleted: false }),
                include: Object.assign({ landlord: true, tenant: true }, this.inclusion),
            });
        });
        // # get maintenances based on a property 
        this.getPropertyMaintenances = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            const maintenaces = yield index_1.prismaClient.maintenance.findMany({
                where: {
                    propertyId,
                    isDeleted: false,
                },
                include: Object.assign({ landlord: true }, this.inclusion),
            });
            return maintenaces;
        });
        this.getTenantMaintenance = (landlordId, tenantId) => __awaiter(this, void 0, void 0, function* () {
            return yield index_1.prismaClient.maintenance.findMany({
                where: {
                    tenantId,
                    property: {
                        landlordId: landlordId,
                    },
                    isDeleted: false,
                },
                include: Object.assign({ tenant: true }, this.inclusion),
            });
        });
        this.getRequestedMaintenanceByTenants = (landlordId, status) => __awaiter(this, void 0, void 0, function* () {
            return yield index_1.prismaClient.maintenance.findMany({
                where: Object.assign({ tenantId: {
                        not: null,
                    }, landlordDecision: client_1.maintenanceDecisionStatus.PENDING, property: {
                        landlordId: landlordId,
                    }, isDeleted: false }, (status && { status: status })),
                include: Object.assign({ tenant: true }, this.inclusion),
            });
        });
        this.changeLandlordPropertiesMaintenanceDecisionState = (landlordId, maintenanceId, status) => __awaiter(this, void 0, void 0, function* () {
            return yield index_1.prismaClient.maintenance.update({
                where: {
                    id: maintenanceId,
                    property: {
                        landlordId
                    }
                },
                data: Object.assign(Object.assign({}, (status && { status: status })), { isDeleted: false }),
                include: Object.assign({ landlord: true, tenant: true }, this.inclusion),
            });
        });
        // changeLandlordPropertiesMaintenanceDecisionState = async (landlordId: string, status?: maintenanceDecisionStatus) => {
        //   return await prismaClient.maintenance.findMany({
        //     where: {
        //       property: {
        //         landlordId: landlordId,
        //       },
        //       ...(status && { landlordDecision: status as any }),
        //       isDeleted: false,
        //     },
        //     include: {
        //       landlord: true,
        //       tenant: true,
        //       ...this.inclusion,
        //     },
        //   });
        // }
        this.createWhitelist = (data, landlordId) => __awaiter(this, void 0, void 0, function* () {
            try {
                const whitelistEntry = yield index_1.prismaClient.maintenanceWhitelist.create({
                    data: {
                        categoryId: data.categoryId,
                        subcategoryId: data.subcategoryId,
                        propertyId: data.propertyId,
                        apartmentId: data.apartmentId || null,
                        landlordId: landlordId,
                    },
                });
                return whitelistEntry;
            }
            catch (error) {
                throw new Error(`Error creating whitelist entry: ${error.message}`);
            }
        });
        // Fetch the whitelist for a landlord
        this.getWhitelistByLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            try {
                const whitelist = yield index_1.prismaClient.maintenanceWhitelist.findMany({
                    where: {
                        landlordId: landlordId,
                    },
                    include: {
                        category: true,
                        subcategory: true,
                        property: true,
                        apartment: true,
                    },
                });
                return whitelist;
            }
            catch (error) {
                throw new Error(`Error fetching whitelist: ${error.message}`);
            }
        });
        // Update an existing whitelist entry
        this.updateWhitelist = (whitelistId, data) => __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedWhitelist = yield index_1.prismaClient.maintenanceWhitelist.update({
                    where: { id: whitelistId },
                    data: {
                        categoryId: data.categoryId,
                        subcategoryId: data.subcategoryId,
                        propertyId: data.propertyId,
                        apartmentId: data.apartmentId,
                    },
                });
                return updatedWhitelist;
            }
            catch (error) {
                throw new Error(`Error updating whitelist: ${error.message}`);
            }
        });
        this.deleteMaintenance = (maintenanceId) => __awaiter(this, void 0, void 0, function* () {
            return yield index_1.prismaClient.maintenance.update({
                where: {
                    id: maintenanceId
                },
                data: {
                    isDeleted: true
                }
            });
        });
        this.inclusion = {
            vendor: true,
            property: true,
            apartment: true,
            category: true,
        };
    }
}
exports.default = new LandlordMaintenanceService();
