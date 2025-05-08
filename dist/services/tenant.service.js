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
class TenantService {
    constructor() {
        this.getCurrentPropertyForTenant = (userId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.tenants.findFirst({
                where: {
                    userId: userId,
                    isCurrentLease: true,
                },
                include: {
                    property: true,
                },
            });
        });
        this.getUserInfoByTenantId = (tenantId) => __awaiter(this, void 0, void 0, function* () {
            const tenant = yield __1.prismaClient.tenants.findFirst({
                where: { id: tenantId },
                include: { user: true },
            });
            return (tenant === null || tenant === void 0 ? void 0 : tenant.user) || null;
        });
        this.getTenantById = (tenantId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.tenants.findFirst({
                where: { id: tenantId },
                include: { user: true },
            });
        });
        this.getTenantByTenantEmail = (tenantEmail) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.tenants.findFirst({
                where: { tenantWebUserEmail: tenantEmail },
                include: { user: true },
            });
        });
        // Fetch all tenants for a given property
        this.getTenantsForProperty = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            // Query the tenants table to get all tenants linked to the propertyId
            const tenants = yield __1.prismaClient.tenants.findMany({
                where: {
                    propertyId: propertyId,
                },
                include: {
                    user: true,
                },
            });
            return tenants;
        });
        // Get all tenants for a given property and categorize them into previous, current, and future
        this.getTenantsByLeaseStatus = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            // Get the current date to compare with lease dates
            const currentDate = new Date();
            // Fetch tenants for the given property
            const tenants = yield this.getTenantsForProperty(propertyId);
            // Categorize tenants into previous, current, and future
            const categorizedTenants = {
                current: [],
                previous: [],
                future: []
            };
            tenants.forEach((tenant) => {
                // Check if the tenant's lease is currently active
                if (tenant.leaseStartDate && tenant.leaseEndDate) {
                    const leaseStart = new Date(tenant.leaseStartDate);
                    const leaseEnd = new Date(tenant.leaseEndDate);
                    // Current tenant: lease is active
                    if (leaseStart <= currentDate && leaseEnd >= currentDate) {
                        categorizedTenants.current.push(tenant);
                    }
                    // Previous tenant: lease has ended
                    else if (leaseEnd < currentDate) {
                        categorizedTenants.previous.push(tenant);
                    }
                    // Future tenant: lease hasn't started yet
                    else if (leaseStart > currentDate) {
                        categorizedTenants.future.push(tenant);
                    }
                }
            });
            return categorizedTenants;
        });
    }
}
exports.default = new TenantService();
