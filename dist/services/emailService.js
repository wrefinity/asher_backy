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
const __1 = require("..");
const loggers_1 = __importDefault(require("../utils/loggers"));
const profileSelect = {
    select: {
        fullname: true,
        profileUrl: true,
    },
};
const userSelect = {
    select: {
        email: true,
        role: true,
        profile: profileSelect,
    },
};
class EmailService {
    constructor() {
        /**
         * Check if a user exists based on their email or tenantWebUserEmail
         * @param email - The email to check (can be user.email or tenant.tenantWebUserEmail)
         * @returns The user object if found, otherwise null
         */
        this.checkUserEmailExists = (email) => __awaiter(this, void 0, void 0, function* () {
            // Step 1: Check if the email exists in the users table
            const user = yield __1.prismaClient.users.findUnique({
                where: { email },
                include: { tenant: true }, // Include tenant details if the user is a tenant
            });
            if (user) {
                return { email: user.email, userId: user.id };
            }
            // Step 2: If not found in users table, check the tenantWebUserEmail in the tenants table
            const tenant = yield __1.prismaClient.tenants.findFirst({
                where: { tenantWebUserEmail: email },
                include: { user: true },
            });
            if (tenant) {
                return { email: tenant.tenantWebUserEmail, userId: tenant.user.id };
            }
            return null;
        });
        this.createEmail = (emailData) => __awaiter(this, void 0, void 0, function* () {
            const { senderId, receiverId } = emailData, rest = __rest(emailData
            // Create email record in the database
            , ["senderId", "receiverId"]);
            // Create email record in the database
            return yield __1.prismaClient.email.create({
                data: Object.assign(Object.assign({}, rest), { isDraft: false, isSent: true, sender: { connect: { id: senderId } }, receiver: { connect: { id: receiverId } } }),
            });
        });
        this.getUserEmails = (email, options) => __awaiter(this, void 0, void 0, function* () {
            const where = {};
            if (options.sent)
                where.senderEmail = email;
            if (options.recieved)
                where.receiverEmail = email;
            if (options.draft)
                where.isDraft = true;
            if (options.unread) {
                if (options.sent) {
                    where.isReadBySender = false;
                }
                else if (options.recieved) {
                    where.isReadByReceiver = false;
                }
                else {
                    where.OR = [
                        { senderEmail: email, isReadBySender: false },
                        { receiverEmail: email, isReadByReceiver: false }
                    ];
                }
            }
            ;
            try {
                return yield __1.prismaClient.email.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        sender: userSelect,
                        receiver: userSelect
                    }
                });
            }
            catch (error) {
                loggers_1.default.error(`Error getting email: ${error}`);
                throw new Error('Failed to get email');
            }
        });
    }
    getEmailById(emailId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.email.findUnique({
                    where: { id: emailId },
                    // include: {
                    //     sender: userSelect,
                    //     receiver: userSelect
                    // }
                });
            }
            catch (error) {
                loggers_1.default.error(`Error getting email: ${error}`);
                throw new Error('Failed to get email');
            }
        });
    }
    updateEmail(emailId, emailData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.email.update({
                    where: { id: emailId },
                    data: emailData
                });
            }
            catch (error) {
                loggers_1.default.error(`Error updating email: ${error}`);
                throw new Error('Failed to update email');
            }
        });
    }
    markEmailAsRead(emailId, isReciever) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const updateData = isReciever ? { isReadByReceiver: true } : { isReadBySender: true };
                return yield __1.prismaClient.email.update({
                    where: { id: emailId },
                    data: updateData
                });
            }
            catch (error) {
                loggers_1.default.error(`Error reading email: ${error}`);
                throw new Error('Failed to read email');
            }
        });
    }
    sendDraftEmail(emailId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.email.update({
                    where: { id: emailId },
                    data: {
                        isDraft: false,
                        isSent: true,
                        isReadByReceiver: false
                    }
                });
            }
            catch (error) {
                loggers_1.default.error(`Error reading email: ${error}`);
                throw new Error('Failed to read email');
            }
        });
    }
    deleteEmail(emailId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.email.delete({
                    where: { id: emailId },
                });
            }
            catch (error) {
                loggers_1.default.error(`Error deleting email: ${error}`);
                throw new Error('Failed to delete email');
            }
        });
    }
}
exports.default = new EmailService();
