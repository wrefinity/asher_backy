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
class ServiceService {
    constructor() {
        this.createService = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.create({
                data,
                include: this.inclusion
            });
        });
        this.getService = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.findUnique({
                where: { id },
                include: this.inclusion,
            });
        });
        this.getVendorService = (vendorId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.findFirst({
                where: { vendorId },
                include: this.inclusion,
            });
        });
        this.getSpecificVendorService = (vendorId, categoryId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.findFirst({
                where: { vendorId, categoryId },
                include: this.inclusion,
            });
        });
        this.incrementJobCount = (serviceId, vendorId) => __awaiter(this, void 0, void 0, function* () {
            yield __1.prismaClient.services.update({
                where: { id: serviceId, vendorId },
                data: {
                    currentJobs: {
                        increment: 1,
                    },
                },
            });
        });
        this.decrementJobCount = (serviceId, vendorId) => __awaiter(this, void 0, void 0, function* () {
            yield __1.prismaClient.services.update({
                where: { id: serviceId, vendorId },
                data: {
                    currentJobs: {
                        decrement: 1,
                    },
                },
            });
        });
        this.updateService = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.update({
                where: { id },
                data,
                include: this.inclusion
            });
        });
        this.deleteService = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.update({
                where: { id },
                data: { isDeleted: true },
                include: this.inclusion
            });
        });
        this.getAllServices = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.findMany({
                where: { isDeleted: false },
                include: this.inclusion
            });
        });
        this.getServicesByCategory = (categoryId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.findMany({ where: { categoryId }, include: this.inclusion });
        });
        this.getServicesByCategoryAndSubcategories = (categoryId, subcategoryIds) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.services.findMany({
                where: {
                    categoryId,
                    subcategoryId: {
                        in: subcategoryIds
                    }
                },
                include: this.inclusion
            });
        });
        this.applyOffer = (categoryId, subcategoryIds, plan) => __awaiter(this, void 0, void 0, function* () {
            const services = yield this.getServicesByCategoryAndSubcategories(categoryId, subcategoryIds);
            console.log(services);
            return services.filter(service => {
                switch (plan) {
                    case 'standard':
                        return service.standardPriceRange;
                    case 'medium':
                        return service.mediumPriceRange;
                    case 'premium':
                        return service.premiumPriceRange;
                    default:
                        return false;
                }
            });
        });
        this.isVendorAllocated = (vendorId) => __awaiter(this, void 0, void 0, function* () {
            const count = yield __1.prismaClient.services.count({
                where: { vendorId },
            });
            return count > 0;
        });
        this.inclusion = {
            vendor: {
                select: {
                    id: true,
                }
            },
            category: true,
            subcategory: true,
        };
    }
}
exports.default = new ServiceService();
