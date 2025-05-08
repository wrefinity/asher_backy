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
const client_1 = require("@prisma/client");
class ViolationService {
    constructor() {
        this.getTenantViolation = (landlordUserId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.violation.findMany({
                where: {
                    createdById: landlordUserId,
                    isDeleted: false
                }
            });
        });
        this.getViolationById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.violation.findUnique({ where: { id } });
        });
        this.getViolationTenantId = (tenantId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.violation.findMany({
                where: { tenantId }
            });
        });
        this.create = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.violation.create({
                data: {
                    description: data.description,
                    noticeType: data.noticeType,
                    deliveryMethod: data.deliveryMethod,
                    severityLevel: data.severityLevel || client_1.SeverityLevel.LOW,
                    actionTaken: data.actionTaken,
                    tenant: {
                        connect: {
                            id: data.tenantId
                        }
                    },
                    dueDate: data.dueDate,
                    property: {
                        connect: {
                            id: data.propertyId,
                        }
                    },
                    unit: {
                        connect: {
                            id: data.unitId
                        }
                    }
                },
            });
        });
    }
    deleteViolation(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.violation.update({
                where: { id },
                data: { isDeleted: true },
            });
        });
    }
}
exports.default = new ViolationService();
