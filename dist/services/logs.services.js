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
class LogService {
    constructor() {
        this.createLog = (data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.log.create({
                data: {
                    events: data.events,
                    propertyId: data.propertyId,
                    type: data.type,
                    transactionId: data.transactionId,
                    createdById: data.createdById,
                },
            });
        });
        this.getLogsByProperty = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.log.findMany({
                where: {
                    propertyId: propertyId,
                },
                include: {
                    property: true,
                }
            });
        });
        // for milestone on maintenances
        this.getLandlordTenantsLogsByProperty = (propertyId, userId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.log.findMany({
                where: {
                    propertyId: propertyId,
                    property: {
                        landlordId
                    },
                    createdById: userId
                },
                include: {
                    property: true,
                    users: true
                }
            });
        });
        this.inclusion = {
            property: true
        };
    }
}
exports.default = new LogService();
