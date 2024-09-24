import { Request, Response } from "express";
import ReviewService from "../services/review.service";
import { CustomRequest } from "../utils/types";
import { createReviewSchema } from "../validations/schemas/review.schema";


class ReviewController {
    createReview = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = createReviewSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const { tenantId, vendorId, landlordId, propertyId, apartmentId } = value;
            // Check which entity is being reviewed
            if (!tenantId && !vendorId && !landlordId && !propertyId && !apartmentId) {
                return res.status(400).json({ error: "Please provide either tenantId, vendorId, landlordId, propertyId, or apartmentId" });
            }
            // Ensure only one of the IDs is provided
            const ids = [tenantId, vendorId, landlordId, propertyId, apartmentId].filter(id => id !== undefined);
            if (ids.length > 1) return res.status(400).json({ error: "You can only review one entity (tenant, vendor, landlord, propertyId or apartmentId) at a time." });
            const reviewById = req?.user?.id;
            const review = await ReviewService.createReview({ ...value, reviewById });

            return res.status(201).json(review);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    getCurrentUserReviews = async (req: CustomRequest, res: Response) => {
        try {
            const { tenants, landlords, vendor } = req.user;;

            // Build a query condition based on the user's role
            let queryCondition: any = {
                OR: [],
            };

            if (tenants?.id) {
                queryCondition.OR.push({ tenantId: tenants.id });
            }

            if (landlords?.id) {
                queryCondition.OR.push({ landlordId: landlords.id });
            }

            if (vendor?.id) {
                queryCondition.OR.push({ vendorId: vendor.id });
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
            const review = await ReviewService.updateReview(req.params.id, req.body);
            return res.status(200).json(review);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    deleteReview = async (req: CustomRequest, res: Response) => {
        try {
            await ReviewService.deleteReview(req.params.id);
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    getReviewsByProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const reviews = await ReviewService.aggregateReviews({ propertyId });
            return res.status(200).json(reviews);
        } catch (error) {
            return res.status(500).json({ message: "Failed to get reviews by property", error });
        }
    }

}

export default new ReviewController();