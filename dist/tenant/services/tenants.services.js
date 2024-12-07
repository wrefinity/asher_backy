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
        this.getPreviousTenantsForLandlord = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            // Get previous tenants
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
        this.inclusion = {
            user: true,
            property: true,
            history: true,
            apartments: true,
            tenantSupportTicket: true,
            PropertyTransactions: true,
        };
    }
}
exports.default = new TenantService();
