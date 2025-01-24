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
const review_service_1 = __importDefault(require("../services/review.service"));
const review_schema_1 = require("../validations/schemas/review.schema");
class ReviewController {
    constructor() {
        this.createReview = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { error, value } = review_schema_1.createReviewSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const { tenantId, vendorId, landlordId, propertyId, apartmentId } = value;
                // Check which entity is being reviewed
                if (!tenantId && !vendorId && !landlordId && !propertyId && !apartmentId) {
                    return res.status(400).json({ error: "Please provide either tenantId, vendorId, landlordId, propertyId, or apartmentId" });
                }
                // Ensure only one of the IDs is provided
                const ids = [tenantId, vendorId, landlordId, propertyId, apartmentId].filter(id => id !== undefined);
                if (ids.length > 1)
                    return res.status(400).json({ error: "You can only review one entity (tenant, vendor, landlord, propertyId or apartmentId) at a time." });
                const reviewById = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id;
                const review = yield review_service_1.default.createReview(Object.assign(Object.assign({}, value), { reviewById }));
                return res.status(201).json(review);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
        this.getCurrentUserReviews = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { tenant, landlords, vendors } = req.user;
                ;
                // Build a query condition based on the user's role
                let queryCondition = {
                    OR: [],
                };
                if (tenant === null || tenant === void 0 ? void 0 : tenant.id) {
                    queryCondition.OR.push({ tenantId: tenant.id });
                }
                if (landlords === null || landlords === void 0 ? void 0 : landlords.id) {
                    queryCondition.OR.push({ landlordId: landlords.id });
                }
                if (vendors === null || vendors === void 0 ? void 0 : vendors.id) {
                    queryCondition.OR.push({ vendorId: vendors.id });
                }
                if (!queryCondition.OR.length) {
                    throw new Error("User does not have an associated tenant, landlord, or vendor role");
                }
                const reviews = yield review_service_1.default.aggregateReviews(queryCondition);
                res.status(200).json({ reviews });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        this.getReviewById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const review = yield review_service_1.default.getReviewById(req.params.id);
                if (review) {
                    return res.status(200).json(review);
                }
                else {
                    return res.status(404).json({ message: "Review not found" });
                }
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
        this.getAllReviews = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const reviews = yield review_service_1.default.getAllReviews();
                return res.status(200).json(reviews);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
        this.updateReview = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { error, value } = review_schema_1.updateReviewSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const review = yield review_service_1.default.updateReview(req.params.id, value);
                return res.status(200).json(review);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
        this.deleteReview = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const review = yield review_service_1.default.deleteReview(req.params.id);
                return res.status(200).json({ review });
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
        this.getReviewsByProperty = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const propertyId = req.params.propertyId;
                const reviews = yield review_service_1.default.aggregateReviews({ propertyId });
                const { year } = req.query;
                let propsRating;
                if (year) {
                    propsRating = yield review_service_1.default.getPropertyRatings(propertyId, Number(year));
                }
                return res.status(200).json({ reviews, propsRating });
            }
            catch (error) {
                return res.status(500).json({ message: "Failed to get reviews by property", error });
            }
        });
    }
}
exports.default = new ReviewController();
