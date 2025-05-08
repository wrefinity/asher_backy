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
const propertyServices_1 = __importDefault(require("../services/propertyServices"));
const landlord_service_1 = require("../landlord/services/landlord.service");
const vendor_services_1 = __importDefault(require("../vendor/services/vendor.services"));
const tenant_service_1 = __importDefault(require("../services/tenant.service"));
class ReviewController {
    constructor() {
        this.createReview = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { error, value } = review_schema_1.createReviewSchema.validate(req.body);
                if (error)
                    return res.status(400).json({ error: error.details[0].message });
                const { tenantId, vendorId, landlordId, propertyId } = value;
                // Check if the property exists
                if (propertyId) {
                    const propertyExists = yield propertyServices_1.default.getPropertiesById(propertyId);
                    if (!propertyExists) {
                        throw new Error(`Property with ID ${propertyId} does not exist.`);
                    }
                }
                // Check if the landlord exists
                if (landlordId) {
                    const landlordExist = yield this.landlordService.getLandlordById(landlordId);
                    if (!landlordExist) {
                        throw new Error(`landlord with ID ${landlordId} does not exist.`);
                    }
                }
                // Check if the vendor exists
                if (vendorId) {
                    const vendorExist = yield vendor_services_1.default.getVendorById(vendorId);
                    if (!vendorExist) {
                        throw new Error(`Vendor with ID ${vendorId} does not exist.`);
                    }
                }
                // Check if the tenant exists
                if (tenantId) {
                    const tenantExist = yield tenant_service_1.default.getTenantById(tenantId);
                    if (!tenantExist) {
                        throw new Error(`Tenant with ID ${tenantId} does not exist.`);
                    }
                }
                // Check which entity is being reviewed
                if (!tenantId && !vendorId && !landlordId && !propertyId) {
                    return res.status(400).json({ error: "Please provide either tenantId, vendorId, landlordId, propertyId" });
                }
                // Ensure only one of the IDs is provided
                const ids = [tenantId, vendorId, landlordId, propertyId].filter(id => id !== undefined);
                if (ids.length > 1)
                    return res.status(400).json({ error: "You can only review one entity (tenant, vendor, landlord, propertyId or ) at a time." });
                const reviewById = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id;
                const review = yield review_service_1.default.createReview(Object.assign(Object.assign({}, value), { reviewById }));
                return res.status(201).json(review);
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
        this.getUserReviews = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const landlordId = (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.landlords) === null || _c === void 0 ? void 0 : _c.id;
                const vendorId = (_e = (_d = req.user) === null || _d === void 0 ? void 0 : _d.vendors) === null || _e === void 0 ? void 0 : _e.id;
                const tenantId = (_g = (_f = req.user) === null || _f === void 0 ? void 0 : _f.tenant) === null || _g === void 0 ? void 0 : _g.id;
                if (!userId)
                    throw new Error("User not found.");
                let reviews;
                // Determine the user role and fetch reviews accordingly
                if (landlordId) {
                    reviews = yield review_service_1.default.getReviewsByLandlordId(landlordId);
                }
                else if (vendorId) {
                    reviews = yield review_service_1.default.getReviewsByVendorId(vendorId);
                }
                else if (tenantId) {
                    reviews = yield review_service_1.default.getReviewsByTenantId(tenantId);
                }
                else {
                    reviews = yield review_service_1.default.getReviewsByUserId(userId);
                }
                // If no reviews found, return an empty array
                if (!reviews || reviews.length === 0) {
                    return res.status(200).json({
                        success: true,
                        message: "No reviews found for the user.",
                        data: [],
                    });
                }
                // Return success response with reviews
                return res.status(200).json({
                    success: true,
                    message: "Reviews fetched successfully.",
                    data: reviews,
                });
            }
            catch (error) {
                return res.status(500).json({ error: error.message });
            }
        });
        this.getCurrentUserReviews = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { tenant, landlords, vendors, id } = req.user;
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
                if (id) {
                    queryCondition.OR.push({ reviewById: id });
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
        this.landlordService = new landlord_service_1.LandlordService();
    }
}
exports.default = new ReviewController();
