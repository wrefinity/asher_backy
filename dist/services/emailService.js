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
const loggers_1 = __importDefault(require("../utils/loggers"));
const user_services_1 = __importDefault(require("./user.services"));
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
    createEmail(emailData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const recieverEmail = yield user_services_1.default.findUserByEmail(emailData.recieverEmail);
                if (!recieverEmail) {
                    throw new Error('Reciever email is invalid');
                }
                emailData.isDraft = (_a = emailData.isDraft) !== null && _a !== void 0 ? _a : true;
                emailData.isSent = (emailData.isDraft === true) ? false : true;
                emailData.isReadBySender = true;
                emailData.isReadByReciever = false;
                delete (emailData.cloudinaryUrls);
                return yield __1.prismaClient.email.create({
                    data: emailData,
                });
            }
            catch (error) {
                loggers_1.default.error(`Error creating email: ${error}`);
                throw new Error('Failed to create email');
            }
        });
    }
    getEmailById(emailId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield __1.prismaClient.email.findUnique({
                    where: { id: emailId },
                    include: {
                        sender: userSelect,
                        reciver: userSelect
                    }
                });
            }
            catch (error) {
                loggers_1.default.error(`Error getting email: ${error}`);
                throw new Error('Failed to get email');
            }
        });
    }
    getUserEmails(email, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const where = {};
            if (options.sent)
                where.senderEmail = email;
            if (options.recieved)
                where.recieverEmail = email;
            if (options.draft)
                where.isDraft = true;
            if (options.unread) {
                if (options.sent) {
                    where.isReadBySender = false;
                }
                else if (options.recieved) {
                    where.isReadByReciever = false;
                }
                else {
                    where.OR = [
                        { senderEmail: email, isReadBySender: false },
                        { receiverEmail: email, isReadByReciever: false }
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
                        reciver: userSelect
                    }
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
                const updateData = isReciever ? { isReadByReciever: true } : { isReadBySender: true };
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
                        isReadByReciever: false
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
