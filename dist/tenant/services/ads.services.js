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
const __1 = require("../..");
const transfer_services_1 = __importDefault(require("../../services/transfer.services"));
class AdService {
    constructor() {
        this.profileSelect = {
            select: {
                id: true,
                fullname: true,
                profileUrl: true,
            }
        };
        this.userSelect = {
            select: {
                id: true,
                role: true,
                profile: this.profileSelect,
            }
        };
    }
    createAd(adData, userId, currency) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = yield __1.prismaClient.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                const ads = yield prisma.ads.create({
                    data: Object.assign(Object.assign({}, adData), { userId }),
                });
                //TODO: make ads payment
                //if creating ads is a success we create the payment
                const payment = yield transfer_services_1.default.makeAdsPayments(parseFloat(adData.amountPaid), userId, currency);
                // then we update the ads table
                const updatedAds = yield prisma.ads.update({
                    where: { id: ads.id },
                    data: { referenceId: payment.transactionRecord.id },
                });
                return { ads: updatedAds, payment };
            }));
            return transaction.ads;
        });
    }
    getAllListedAds() {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.ads.findMany({
                where: {
                    isListed: true,
                }
            });
        });
    }
    getAllAds() {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.ads.findMany({});
        });
    }
    listAds(adId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.ads.update({
                where: { id: adId },
                data: { isListed: true },
            });
        });
    }
    deleteAd(adId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.ads.delete({
                where: { id: adId },
            });
        });
    }
    getAdsByLocation(location, isListed) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentDate = new Date();
            return __1.prismaClient.ads.findMany({
                where: {
                    locations: {
                        has: location
                    },
                    isListed,
                    startedDate: { lte: currentDate },
                    // endDate: { gte: currentDate },
                }
            });
        });
    }
    increamentAdStats(adId, statType) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.ads.update({
                where: { id: adId },
                data: {
                    [statType]: { increment: 1 }
                },
            });
        });
    }
    getAdsByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.ads.findMany({
                where: { userId }
            });
        });
    }
    getAdById(adId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.ads.findUnique({
                where: { id: adId },
                include: {
                    user: this.userSelect,
                }
            });
        });
    }
    getAdStats(adId) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.ads.findUnique({
                where: { id: adId },
                select: {
                    views: true,
                    reach: true,
                    clicks: true,
                }
            });
        });
    }
    updateAd(adId, adData) {
        return __awaiter(this, void 0, void 0, function* () {
            return __1.prismaClient.ads.update({
                where: { id: adId },
                data: adData,
            });
        });
    }
}
exports.default = new AdService();
