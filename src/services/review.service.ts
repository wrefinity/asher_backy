import { prismaClient } from "..";
import { reviews } from "@prisma/client";
import { ICreateReview } from "../validations/interfaces/reviews.interface";

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
    // Aggregate reviews based on propertyId, apartmentId, tenantId, landlordId, or vendorId
    aggregateReviews = async (filter: { propertyId?: string, apartmentId?: string, tenantId?: string, landlordId?: string, vendorId?: string }) =>{

        const reviews = await prismaClient.reviews.findMany({
            where: {
                OR: [
                    { propertyId: filter.propertyId },
                    { apartmentId: filter.apartmentId },
                    { tenantId: filter.tenantId },
                    { landlordId: filter.landlordId },
                    { vendorId: filter.vendorId },
                ],
            },
            select: {
                id: true,
                rating: true,
                comment: true,
                createdAt: true,
                tenant: {
                    select: { id: true },
                },
                landlord: {
                    select: { id: true },
                },
                vendor: {
                    select: { id: true },
                },
                property: {
                    select: { id: true },
                },
                apartment: {
                    select: { id: true },
                },
                user: {
                    select: { id: true },
                },
            },
        });
        const aliasedReviews = reviews.map(review => ({
            ...review,
            reviewedBy: review.user,
        }));
        return aliasedReviews;
    }
}

export default new ReviewService();
