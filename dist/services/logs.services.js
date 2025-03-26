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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const client_1 = require("@prisma/client");
const application_services_1 = __importDefault(require("./application.services"));
class LogService {
    constructor() {
        this.createLog = (data) => __awaiter(this, void 0, void 0, function* () {
            const logData = {
                events: data.events,
                type: data.type,
                status: data.status || undefined,
                viewAgain: data.viewAgain,
                considerRenting: data.considerRenting,
                transactionId: (data === null || data === void 0 ? void 0 : data.transactionId) || undefined,
                // createdById: data?.createdById || undefined,
                application: data.applicationId
                    ? { connect: { id: data.applicationId } }
                    : undefined,
                applicationInvites: data.applicationInvitedId
                    ? { connect: { id: data.applicationInvitedId } }
                    : undefined,
            };
            // Only include propertyId if it is defined
            if (data.propertyId) {
                logData.property = { connect: { id: data.propertyId } };
            }
            if (data.createdById) {
                logData.users = { connect: { id: data.createdById } };
            }
            const log = yield __1.prismaClient.log.create({
                data: logData,
            });
            if (log && data.response === client_1.InvitedResponse.FEEDBACK && data.applicationInvitedId) {
                yield application_services_1.default.updateInviteResponse(data.applicationInvitedId, data.response);
            }
            return log;
        });
        // Get all logs by types, status, etc.
        this.getLogs = (landlordId_1, type_1, ...args_1) => __awaiter(this, [landlordId_1, type_1, ...args_1], void 0, function* (landlordId, type, status = null) {
            return yield __1.prismaClient.log.findMany({
                where: Object.assign({ type, property: { landlordId } }, (status ? { status } : {}) // Apply status condition only if it's provided
                ),
                include: this.inclusion
            });
        });
        this.checkPropertyLogs = (createdById_1, type_1, propertyId_1, ...args_1) => __awaiter(this, [createdById_1, type_1, propertyId_1, ...args_1], void 0, function* (createdById, type, propertyId, applicationId = null) {
            return yield __1.prismaClient.log.findFirst({
                where: { type, propertyId, createdById, applicationId },
            });
        });
        this.getMilestone = (createdById_1, type_1, propertyId_1, ...args_1) => __awaiter(this, [createdById_1, type_1, propertyId_1, ...args_1], void 0, function* (createdById, type, propertyId, applicationId = null) {
            return yield __1.prismaClient.log.findMany({
                where: { type, propertyId, createdById, applicationId },
            });
        });
        this.getLogsByProperty = (propertyId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.log.findMany({
                where: {
                    propertyId: propertyId,
                },
                include: this.inclusion
            });
        });
        this.getLogsById = (logId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.log.findMany({
                where: {
                    id: logId,
                },
                include: this.inclusion
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
                include: this.inclusion
            });
        });
        this.getCommunicationLog = (propertyId, userId, landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.log.findMany({
                where: {
                    propertyId: propertyId,
                    createdById: userId,
                    property: {
                        landlordId
                    },
                    type: {
                        in: [client_1.LogType.EMAIL, client_1.LogType.MESSAGE]
                    }
                },
                include: this.inclusion
            });
        });
        this.getLandlordLogs = (landlordId_1, ...args_1) => __awaiter(this, [landlordId_1, ...args_1], void 0, function* (landlordId, type = null, status = null) {
            return yield __1.prismaClient.log.findMany({
                where: Object.assign(Object.assign(Object.assign({}, (type && { type })), (status && { status })), { property: {
                        landlordId
                    } }),
                include: this.inclusion,
                orderBy: {
                    createdAt: "desc"
                }
            });
        });
        this.updateLog = (id, updateData) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.log.update({
                where: { id },
                data: updateData,
                include: this.inclusion
            });
        });
        this.inclusion = {
            property: true,
            users: {
                select: { email: true, id: true, profile: true }
            },
            applicationInvites: true,
        };
    }
}
exports.default = new LogService();
