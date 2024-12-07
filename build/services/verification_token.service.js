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
exports.createVerificationToken = createVerificationToken;
exports.validateVerificationToken = validateVerificationToken;
exports.deleteVerificationToken = deleteVerificationToken;
exports.getTokensByUserId = getTokensByUserId;
const __1 = require("..");
const loggers_1 = __importDefault(require("../utils/loggers"));
const DEFAULT_EXPIRATION_DAYS = 1; // Default expiration in days
function createVerificationToken(userId, tokenGenerateFunc) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Generate a unique token
            const token = tokenGenerateFunc();
            // Calculate expiration time
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + DEFAULT_EXPIRATION_DAYS);
            // Save verification token in database with expiration time
            const verificationToken = yield __1.prismaClient.verificationToken.create({
                data: {
                    token,
                    userId,
                    expiresAt: expirationDate,
                },
            });
            return verificationToken.token;
        }
        catch (error) {
            throw new Error("Failed to create verification token");
        }
    });
}
function validateVerificationToken(token, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const verificationToken = yield __1.prismaClient.verificationToken.findFirst({
                where: {
                    userId,
                    token,
                    expiresAt: {
                        gte: new Date(),
                    },
                },
            });
            return !!verificationToken; // Return true if token exists and is valid
        }
        catch (error) {
            loggers_1.default.info(`Error validating verification token: - ${error}`);
            throw new Error('Failed to validate verification token');
        }
    });
}
function deleteVerificationToken(tokenId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield __1.prismaClient.verificationToken.delete({
            where: { id: tokenId },
        });
    });
}
function getTokensByUserId(userId, token) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tokens = yield __1.prismaClient.verificationToken.findFirst({
                where: {
                    userId,
                    token,
                },
            });
            if (tokens) {
                return tokens;
            }
            else {
                throw new Error(`No verification tokens found for userId: ${userId}`);
            }
        }
        catch (error) {
            console.error(error);
            throw new Error('Error retrieving verification tokens');
        }
    });
}
