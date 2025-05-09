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
class InspectionService {
    constructor() {
        this.createInspection = (data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.inspection.create({
                data: {
                    propertyId: data.propertyId,
                    tenantId: data.tenantId,
                    score: data.score,
                    notes: data.notes,
                },
                include: {
                    property: true,
                    tenant: true,
                },
            });
        });
        this.getInspectionsByProperty = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.inspection.findMany({
                where: { propertyId },
                include: { tenant: true },
            });
        });
        this.getInspectionById = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.inspection.findUnique({
                where: { id },
                include: { property: true, tenant: true },
            });
        });
        this.updateInspection = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.inspection.update({
                where: { id },
                data: {
                    score: data.score,
                    notes: data.notes,
                },
                include: {
                    property: true,
                    tenant: true,
                },
            });
        });
        this.deleteInspection = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.inspection.delete({
                where: { id },
            });
        });
    }
}
exports.default = new InspectionService();
