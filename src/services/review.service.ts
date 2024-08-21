import { prismaClient } from "..";
import { reviews } from "@prisma/client";
import { ICreateReview, IGetReviewsByProperty } from "../validations/interfaces/reviews.interface";

class ReviewService {
    createReview = async (data: ICreateReview): Promise<reviews> => {
        // Prepare data for Prisma, only including non-null fields
        const prismaData: any = {
            rating: data?.rating,
            comment: data?.comment,
            vendorId: data?.vendorId,
            tenantId: data?.tenantId,
            landlordId: data?.landlordId,
            reviewById: data?.reviewById,
        };

        if (data?.propertyId) {
            prismaData.propertyId = data?.propertyId;
        }

        if (data.apartmentId) {
            prismaData.apartmentId = data?.apartmentId;
        }

        return await prismaClient.reviews.create({
            data: prismaData,
        });
    }

    getReviewById = async (id: string): Promise<reviews | null> => {
        return await prismaClient.reviews.findUnique({
            where: { id },
        });
    }

    getAllReviews = async (): Promise<reviews[]> => {
        return await prismaClient.reviews.findMany();
    }

    updateReview = async (id: string, data: Partial<reviews>) => {
        return await prismaClient.reviews.update({
            where: { id },
            data,
        });
    }

    deleteReview = async (id: string) => {
        return await prismaClient.reviews.update({
            where: { id },
            data: { isDeleted: true }
        });
    }
    getReviewsByProperty = async (data: IGetReviewsByProperty): Promise<reviews[]> => {
        return await prismaClient.reviews.findMany({
            where: { propertyId: data.propertyId, isDeleted: false }
        });
    }
}

export default new ReviewService();
