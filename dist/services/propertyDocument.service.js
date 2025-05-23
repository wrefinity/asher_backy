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
exports.PropertyDocumentService = void 0;
const __1 = require("..");
class PropertyDocumentService {
    constructor() {
        this.create = (data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.create({ data });
        });
        this.findAll = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.findMany({
                where: {
                    propertyId
                },
                include: {
                    users: true,
                    properties: true,
                }
            });
        });
        this.findById = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.findUnique({
                where: { id },
                include: {
                    users: true,
                    properties: true,
                }
            });
        });
        this.update = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.update({
                where: { id },
                data: data,
            });
        });
        this.delete = (id) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.delete({
                where: { id },
                include: {
                    users: true,
                    properties: true,
                }
            });
        });
        this.getDocumentBaseOnLandlordAndStatus = (landlordId, docType) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.findFirst({
                where: {
                    docType,
                    users: {
                        landlords: {
                            id: landlordId,
                        },
                    },
                },
                include: {
                    users: true,
                    properties: true,
                },
            });
        });
        this.getManyDocumentBaseOnLandlord = (landlordId, docType) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.findMany({
                where: {
                    docType,
                    users: {
                        landlords: {
                            id: landlordId,
                        },
                    },
                },
                include: {
                    users: true,
                    properties: true,
                },
            });
        });
        this.getManyDocumentBaseOnTenant = (currentUserId, docType) => __awaiter(this, void 0, void 0, function* () {
            // Fetch documents linked to the tenant's application or uploaded by them
            return yield __1.prismaClient.propertyDocument.findMany({
                where: {
                    uploadedBy: currentUserId
                },
                include: {
                    application: true,
                    users: true,
                },
            });
        });
        this.getDocumentLandlordAndStatuses = (landlordId, docType) => __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.propertyDocument.findMany({
                where: Object.assign(Object.assign({}, (docType !== undefined && { docType })), { users: {
                        landlords: {
                            id: landlordId,
                        },
                    } }),
                include: {
                    users: {
                        select: {
                            email: true,
                            id: true,
                            profile: true,
                        }
                    },
                    properties: true,
                    application: true
                },
            });
        });
    }
}
exports.PropertyDocumentService = PropertyDocumentService;
