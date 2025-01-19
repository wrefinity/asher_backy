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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const __1 = require("..");
const transfer_services_1 = __importDefault(require("./transfer.services"));
class MaintenanceService {
    constructor() {
        this.getAllMaintenances = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.maintenance.findMany({
                where: {
                    isDeleted: false,
                },
                include: this.inclusion,
            });
        });
        this.getSpecificVendorMaintenanceJobs = (categoryId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.maintenance.findMany({
                where: {
                    isDeleted: false,
                    categoryId
                },
                include: this.inclusion,
            });
        });
        this.getMaintenanceById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.maintenance.findUnique({
                where: { id },
                include: this.inclusion,
            });
        });
        this.rescheduleMaintenance = (data) => __awaiter(this, void 0, void 0, function* () {
            const { maintenanceId, newScheduleDate } = data;
            const maintenance = yield this.getMaintenanceById(maintenanceId);
            if (!maintenance) {
                throw new Error('Maintenance request not found');
            }
            // Check if reScheduleMax is greater than zero before proceeding
            if (maintenance.reScheduleMax <= 0) {
                throw new Error('Maximum reschedules reached, cannot reschedule further');
            }
            // Add to reschedule history
            yield __1.prismaClient.maintenanceRescheduleHistory.create({
                data: {
                    maintenanceId,
                    oldDate: maintenance.scheduleDate,
                    newDate: newScheduleDate,
                },
            });
            // Update maintenance with new schedule date and increment counter
            return yield __1.prismaClient.maintenance.update({
                where: { id: maintenanceId },
                data: {
                    scheduleDate: newScheduleDate,
                    reScheduleDate: newScheduleDate,
                    reScheduleMax: { decrement: maintenance.reScheduleMax > 0 ? 1 : 0 },
                },
            });
        });
        this.createMaintenance = (maintenanceData) => __awaiter(this, void 0, void 0, function* () {
            const { subcategoryIds, tenantId, landlordId, serviceId, categoryId, propertyId } = maintenanceData, rest = __rest(maintenanceData, ["subcategoryIds", "tenantId", "landlordId", "serviceId", "categoryId", "propertyId"]);
            if (subcategoryIds) {
                // Verify that all subcategory IDs exist
                const existingSubcategories = yield __1.prismaClient.subCategory.findMany({
                    where: {
                        id: { in: subcategoryIds }
                    },
                    select: { id: true }
                });
                const existingSubcategoryIds = existingSubcategories.map(subCategory => subCategory.id);
                if (existingSubcategoryIds.length !== subcategoryIds.length) {
                    throw new Error('One or more subcategories do not exist');
                }
            }
            const createData = Object.assign(Object.assign({}, rest), { paymentStatus: "PENDING", landlordDecision: "PENDING", subcategories: subcategoryIds ? {
                    connect: subcategoryIds.map(id => ({ id })),
                } : undefined, category: {
                    connect: { id: categoryId },
                }, services: serviceId
                    ? {
                        connect: { id: serviceId },
                    }
                    : undefined, tenant: tenantId
                    ? {
                        connect: { id: tenantId },
                    }
                    : undefined, landlord: landlordId
                    ? {
                        connect: { id: landlordId },
                    }
                    : undefined, property: propertyId
                    ? {
                        connect: { id: propertyId },
                    }
                    : undefined });
            return yield __1.prismaClient.maintenance.create({
                data: createData,
                include: this.inclusion,
            });
        });
        this.createMaintenanceChat = (maintenanceId, senderId, receiverId, initialMessage) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if a chat room already exists for this maintenance request
                let chatRoom = yield __1.prismaClient.chatRoom.findFirst({
                    where: {
                        AND: [
                            { user1Id: senderId },
                            { user2Id: receiverId },
                        ],
                    },
                });
                // If no chat room exists, create one
                if (!chatRoom) {
                    chatRoom = yield __1.prismaClient.chatRoom.create({
                        data: {
                            user1Id: senderId,
                            user2Id: receiverId,
                        },
                    });
                }
                // Associate the chat room with the maintenance request
                yield __1.prismaClient.maintenance.update({
                    where: { id: maintenanceId },
                    data: { chatRoomId: chatRoom.id },
                });
                // Add the initial message to the chat room
                const message = yield __1.prismaClient.message.create({
                    data: {
                        content: initialMessage,
                        senderId: senderId,
                        receiverId: receiverId,
                        chatRoomId: chatRoom.id,
                        chatType: client_1.chatType.MAINTENANCE,
                    },
                });
                console.log("Chat room created and message sent.");
                return { chatRoom, message };
            }
            catch (error) {
                console.error("Error creating maintenance chat:", error.message);
                throw error;
            }
        });
        this.getMaintenanceChat = (maintenanceId) => __awaiter(this, void 0, void 0, function* () {
            const chatRoom = yield __1.prismaClient.chatRoom.findUnique({
                where: { maintenanceId },
                include: {
                    messages: {
                        where: { chatType: 'MAINTENANCE' },
                        orderBy: { createdAt: 'asc' }
                    }
                }
            });
            return (chatRoom === null || chatRoom === void 0 ? void 0 : chatRoom.messages) || [];
        });
        this.updateMaintenance = (id, maintenanceData) => __awaiter(this, void 0, void 0, function* () {
            const { subcategoryIds } = maintenanceData, rest = __rest(maintenanceData, ["subcategoryIds"]);
            const updateData = Object.assign(Object.assign({}, rest), { subcategories: subcategoryIds ? {
                    set: subcategoryIds.map(id => ({ id })),
                } : undefined });
            return yield __1.prismaClient.maintenance.update({
                where: { id },
                data: updateData,
                include: this.inclusion,
            });
        });
        this.deleteMaintenance = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.maintenance.update({
                where: { id },
                data: { isDeleted: true },
                include: this.inclusion,
            });
        });
        this.isVendorAssigned = (maintenanceId) => __awaiter(this, void 0, void 0, function* () {
            const maintenance = yield __1.prismaClient.maintenance.findUnique({
                where: { id: maintenanceId },
                select: { vendorId: true },
            });
            return (maintenance === null || maintenance === void 0 ? void 0 : maintenance.vendorId) !== null;
        });
        this.checkWhitelist = (landlordId_1, categoryId_1, subcategoryId_1, propertyId_1, apartmentId_1, ...args_1) => __awaiter(this, [landlordId_1, categoryId_1, subcategoryId_1, propertyId_1, apartmentId_1, ...args_1], void 0, function* (landlordId, categoryId, subcategoryId, propertyId, apartmentId, isActive = true) {
            return yield __1.prismaClient.maintenanceWhitelist.findFirst({
                where: {
                    landlordId,
                    categoryId,
                    isActive,
                    subcategoryId: subcategoryId ? subcategoryId : undefined,
                    propertyId: propertyId ? propertyId : undefined,
                    apartmentId: apartmentId ? apartmentId : undefined,
                },
            });
        });
        this.processPayment = (maintenanceId, amount, userId, receiverId, currency) => __awaiter(this, void 0, void 0, function* () {
            // Deduct amount from user's wallet -> Also add transaction type to track expenses
            yield transfer_services_1.default.transferFunds(userId, { receiverId, amount, reference: client_1.TransactionReference.MAINTENANCE_FEE, description: `Payment for maintenance #${maintenanceId}` }, currency);
            // Update maintenance record to reflect payment
            return yield __1.prismaClient.maintenance.update({
                where: { id: maintenanceId },
                data: {
                    paymentStatus: client_1.TransactionStatus.COMPLETED,
                    amount
                }
            });
        });
        this.inclusion = {
            tenant: true,
            landlord: true,
            vendor: true,
            property: true,
            apartment: true,
            category: true,
            subcategories: true,
            services: true,
        };
    }
}
exports.default = new MaintenanceService();
