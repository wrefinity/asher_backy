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
class ReviewService {
    constructor() {
        this.getPropertyRatings = (propertyId, year) => __awaiter(this, void 0, void 0, function* () {
            const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
            const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
            const result = yield __1.prismaClient.reviews.aggregate({
                where: {
                    propertyId,
                    createdAt: {
                        gte: startOfYear, // Greater than or equal to the start of the year
                        lte: endOfYear, // Less than or equal to the end of the year
                    },
                    isDeleted: false, // Ensure only non-deleted reviews are included
                },
                _avg: {
                    rating: true, // Calculate the average rating
                },
                _count: {
                    id: true, // Count the total number of reviews
                },
            });
            return {
                averageRating: result._avg.rating || 0,
                totalReviews: result._count.id || 0,
            };
        });
        this.createReview = (data) => __awaiter(this, void 0, void 0, function* () {
            // Prepare data for Prisma, only including non-null fields
            const prismaData = {
                rating: data === null || data === void 0 ? void 0 : data.rating,
                comment: data === null || data === void 0 ? void 0 : data.comment,
                vendorId: data === null || data === void 0 ? void 0 : data.vendorId,
                tenantId: data === null || data === void 0 ? void 0 : data.tenantId,
                landlordId: data === null || data === void 0 ? void 0 : data.landlordId,
                reviewById: data === null || data === void 0 ? void 0 : data.reviewById,
            };
            if (data === null || data === void 0 ? void 0 : data.propertyId) {
                prismaData.propertyId = data === null || data === void 0 ? void 0 : data.propertyId;
            }
            return yield __1.prismaClient.reviews.create({
                data: prismaData,
            });
        });
        this.getReviewById = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.reviews.findUnique({
                where: { id, isDeleted: false },
            });
        });
        this.getAllReviews = () => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.reviews.findMany({
                where: { isDeleted: false }
            });
        });
        this.updateReview = (id, data) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.reviews.update({
                where: { id },
                data,
            });
        });
        this.deleteReview = (id) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.reviews.update({
                where: { id },
                data: { isDeleted: true }
            });
        });
        // Aggregate reviews based on propertyId , tenantId, landlordId, or vendorId
        this.aggregateReviews = (filter) => __awaiter(this, void 0, void 0, function* () {
            const reviews = yield __1.prismaClient.reviews.findMany({
                where: {
                    OR: [
                        { propertyId: filter.propertyId },
                        { tenantId: filter.tenantId },
                        { landlordId: filter.landlordId },
                        { vendorId: filter.vendorId },
                    ],
                },
                include: {
                    landlord: true,
                    tenant: true,
                    vendor: true,
                    property: true,
                    user: {
                        include: {
                            profile: true
                        }
                    }
                }
                // select: {
                //     id: true,
                //     rating: true,
                //     comment: true,
                //     createdAt: true,
                //     tenant: {
                //         select: { id: true },
                //     },
                //     landlord: {
                //         select: { id: true },
                //     },
                //     vendor: {
                //         select: { id: true },
                //     },
                //     property: {
                //         select: { id: true },
                //     },
                //     apartment: {
                //         select: { id: true },
                //     },
                //     user: {
                //         select: { id: true },
                //     },
                // },
            });
            const aliasedReviews = reviews.map(review => (Object.assign(Object.assign({}, review), { reviewedBy: review.user })));
            return aliasedReviews;
        });
        this.getReviewsByLandlordId = (landlordId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.reviews.findMany({
                where: {
                    landlordId,
                    isDeleted: false
                }
            });
        });
        this.getReviewsByVendorId = (vendorId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.reviews.findMany({
                where: {
                    vendorId,
                    isDeleted: false
                }
            });
        });
        this.getReviewsByTenantId = (vendorId) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.reviews.findMany({
                where: {
                    vendorId,
                    isDeleted: false
                }
            });
        });
        this.getReviewsByUserId = (reviewById) => __awaiter(this, void 0, void 0, function* () {
            return yield __1.prismaClient.reviews.findMany({
                where: {
                    reviewById,
                    isDeleted: false
                }
            });
        });
    }
}
exports.default = new ReviewService();
