import { Request, Response } from "express";
import ReviewService from "../services/review.service";
import { CustomRequest } from "../utils/types";
import { createReviewSchema, updateReviewSchema } from "../validations/schemas/review.schema";
import propertyServices from "../services/propertyServices";
import { LandlordService } from "../landlord/services/landlord.service";
import vendorServices from "../vendor/services/vendor.services";
import tenantService from "../services/tenant.service";


class ReviewController {
    private landlordService: LandlordService;

    constructor() {
        this.landlordService = new LandlordService();
    }
    createReview = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = createReviewSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const { tenantId, vendorId, landlordId, propertyId } = value;

            // Check if the property exists
            if (propertyId) {
                const propertyExists = await propertyServices.getPropertiesById(propertyId);

                if (!propertyExists) {
                    throw new Error(`Property with ID ${propertyId} does not exist.`);
                }
            }
            // Check if the landlord exists
            if (landlordId) {
                const landlordExist = await this.landlordService.getLandlordById(landlordId);

                if (!landlordExist) {
                    throw new Error(`landlord with ID ${landlordId} does not exist.`);
                }
            }
            // Check if the vendor exists
            if (vendorId) {
                const vendorExist = await vendorServices.getVendorById(vendorId);

                if (!vendorExist) {
                    throw new Error(`Vendor with ID ${vendorId} does not exist.`);
                }
            }
            // Check if the tenant exists
            if (tenantId) {
                const tenantExist = await tenantService.getTenantById(tenantId);

                if (!tenantExist) {
                    throw new Error(`Tenant with ID ${tenantId} does not exist.`);
                }
            }
            // Check which entity is being reviewed
            if (!tenantId && !vendorId && !landlordId && !propertyId ) {
                return res.status(400).json({ error: "Please provide either tenantId, vendorId, landlordId, propertyId" });
            }
            // Ensure only one of the IDs is provided
            const ids = [tenantId, vendorId, landlordId, propertyId].filter(id => id !== undefined);
            if (ids.length > 1) return res.status(400).json({ error: "You can only review one entity (tenant, vendor, landlord, propertyId or ) at a time." });
            const reviewById = req?.user?.id;
            const review = await ReviewService.createReview({ ...value, reviewById });

            return res.status(201).json(review);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    getUserReviews = async (req: CustomRequest, res: Response) => {
        try {
            const userId = req.user?.id;
            const landlordId = req.user?.landlords?.id;
            const vendorId = req.user?.vendors?.id;
            const tenantId = req.user?.tenant?.id;

            if (!userId) throw new Error("User not found.");

            let reviews;
            // Determine the user role and fetch reviews accordingly
            if (landlordId) {
                reviews = await ReviewService.getReviewsByLandlordId(landlordId);
            } else if (vendorId) {
                reviews = await ReviewService.getReviewsByVendorId(vendorId);
            } else if (tenantId) {
                reviews = await ReviewService.getReviewsByTenantId(tenantId);
            } else {
                reviews = await ReviewService.getReviewsByUserId(userId);
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
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    };


    getCurrentUserReviews = async (req: CustomRequest, res: Response) => {
        try {
            const { tenant, landlords, vendors, id } = req.user;;

            // Build a query condition based on the user's role
            let queryCondition: any = {
                OR: [],
            };

            if (tenant?.id) {
                queryCondition.OR.push({ tenantId: tenant.id });
            }

            if (landlords?.id) {
                queryCondition.OR.push({ landlordId: landlords.id });
            }

            if (vendors?.id) {
                queryCondition.OR.push({ vendorId: vendors.id });
            }
            if (id) {
                queryCondition.OR.push({ reviewById: id });
            }
            if (!queryCondition.OR.length) {
                throw new Error("User does not have an associated tenant, landlord, or vendor role");
            }
            const reviews = await ReviewService.aggregateReviews(queryCondition);
            res.status(200).json({ reviews });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    };

    getReviewById = async (req: CustomRequest, res: Response) => {
        try {
            const review = await ReviewService.getReviewById(req.params.id);
            if (review) {
                return res.status(200).json(review);
            } else {
                return res.status(404).json({ message: "Review not found" });
            }
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    getAllReviews = async (req: Request, res: Response) => {
        try {
            const reviews = await ReviewService.getAllReviews();
            return res.status(200).json(reviews);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    updateReview = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = updateReviewSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const review = await ReviewService.updateReview(req.params.id, value);
            return res.status(200).json(review);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    deleteReview = async (req: CustomRequest, res: Response) => {
        try {
            const review = await ReviewService.deleteReview(req.params.id);
            return res.status(200).json({ review });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    getReviewsByProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const reviews = await ReviewService.aggregateReviews({ propertyId });

            const { year } = req.query;
            let propsRating;
            if (year) {
                propsRating = await ReviewService.getPropertyRatings(propertyId, Number(year));
            }

            return res.status(200).json({ reviews, propsRating });
        } catch (error) {
            return res.status(500).json({ message: "Failed to get reviews by property", error });
        }
    }

    getReviewsByTenant = async (req: CustomRequest, res: Response) => {
        try {
            const tenantId = req.params.tenantId;
            if (!tenantId) {
                return res.status(400).json({ error: "Tenant ID is required" });
            }

            const reviews = await ReviewService.getReviewsByTenantId(tenantId);
            
            const averageRating = reviews.length > 0
                ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
                : 0;

            return res.status(200).json({
                success: true,
                data: reviews,
                averageRating: averageRating,
                totalReviews: reviews.length
            });
        } catch (error) {
            return res.status(500).json({ error: error.message || "Failed to get reviews by tenant" });
        }
    }

}

export default new ReviewController();