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
const client_1 = require("@prisma/client");
const __1 = require("../..");
const emailService_1 = __importDefault(require("../../services/emailService"));
const user_services_1 = __importDefault(require("../../services/user.services"));
class BroadcastService {
    constructor() { }
    getBroadcastsByLandlord(landlordId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.broadcast.findMany({
                where: { landlordId },
                orderBy: { createdAt: 'desc' },
            });
        });
    }
    getBroadcastById(id, landlordId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.broadcast.findUnique({
                where: { id, landlordId },
            });
        });
    }
    getBroadcastByCategory(category, landlordId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.broadcast.findMany({
                where: { category, landlordId },
            });
        });
    }
    sendBroadcast(broadcastData, landlordId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { type, category, subject, recipients, message } = broadcastData;
            const broadcast = yield __1.prismaClient.broadcast.create({
                data: {
                    landlordId,
                    type,
                    category,
                    subject,
                    message,
                    recipients,
                },
            });
            try {
                if (type === client_1.BroadcastType.EMAIL) {
                    const batchSize = 100; // Number of emails to send in a batch
                    for (let i = 0; i < recipients.length; i += batchSize) {
                        const batch = recipients.slice(i, i + batchSize);
                        yield this.sendBatchEmails(batch, subject, message, broadcastData.senderEmail);
                    }
                }
                else if (type === client_1.BroadcastType.CHAT) {
                    // Handle chat messaging
                }
                return { message: 'Broadcast initiated successfully!', broadcastId: broadcast.id };
            }
            catch (error) {
                throw new Error(`Failed to send broadcast: ${error.message}`);
            }
        });
    }
    sendBatchEmails(batch, subject, message, senderEmail) {
        return __awaiter(this, void 0, void 0, function* () {
            const emailPromises = batch.map(recipientId => {
                return user_services_1.default.findUserByEmail(recipientId).then(recipient => {
                    if (recipient) {
                        return emailService_1.default.createEmail({
                            senderEmail,
                            recieverEmail: recipient.email,
                            subject,
                            message,
                            isDraft: false,
                            isSent: true,
                        });
                    }
                });
            });
            yield Promise.all(emailPromises); // Send all emails in parallel
        });
    }
}
exports.default = new BroadcastService();
