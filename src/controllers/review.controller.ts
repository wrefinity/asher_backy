import { Request, Response } from "express";
import ReviewService from "../services/review.service";
import { CustomRequest } from "../utils/types";
import {IGetReviewsByProperty } from "../validations/interfaces/reviews.interface";


class ReviewController {
    createReview = async (req: CustomRequest, res: Response)=> {
        try {
            const reviewById = req?.user?.id;
            const review = await ReviewService.createReview({...req.body, reviewById});
            res.status(201).json(review);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    getReviewById = async (req: CustomRequest, res: Response)=>{
        try {
            const review = await ReviewService.getReviewById(req.params.id);
            if (review) {
                res.status(200).json(review);
            } else {
                res.status(404).json({ message: "Review not found" });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    getAllReviews = async (req: Request, res: Response) =>{
        try {
            const reviews = await ReviewService.getAllReviews();
            res.status(200).json(reviews);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    updateReview = async (req: CustomRequest, res: Response)=> {
        try {
            const review = await ReviewService.updateReview(req.params.id, req.body);
            res.status(200).json(review);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    deleteReview = async (req: CustomRequest, res: Response)=> {
        try {
            await ReviewService.deleteReview(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getReviewsByProperty(req: CustomRequest, res: Response): Promise<void> {
        try {
            const data: IGetReviewsByProperty = { propertyId: req.params.propertyId };
            const reviews = await ReviewService.getReviewsByProperty(data);
            res.status(200).json(reviews);
        } catch (error) {
            res.status(500).json({ message: "Failed to get reviews by property", error });
        }
    }
}

export default new ReviewController();
