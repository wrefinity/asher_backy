import { prismaClient } from "..";
import { reviews } from "@prisma/client";
import { ICreateReview } from "../validations/interfaces/reviews.interface";

class ReviewService {


    getPropertyRatings = async (propertyId: string, year: number) => {
        const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);

        const result = await prismaClient.reviews.aggregate({
            where: {
                propertyId,
                createdAt: {
                    gte: startOfYear, // Greater than or equal to the start of the year
                    lte: endOfYear,   // Less than or equal to the end of the year
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
    }



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
            where: { id, isDeleted: false },
        });
    }

    getAllReviews = async (): Promise<reviews[]> => {
        return await prismaClient.reviews.findMany({
            where: { isDeleted: false }
        });
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
    aggregateReviews = async (filter: { propertyId?: string, apartmentId?: string, tenantId?: string, landlordId?: string, vendorId?: string }) => {

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
            include: {
                landlord: true,
                tenant: true,
                vendor: true,
                property: true,
                apartment: true,
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
        const aliasedReviews = reviews.map(review => ({
            ...review,
            reviewedBy: review.user,
        }));
        return aliasedReviews;
    }

    getReviewsByLandlordId = async (landlordId: string): Promise<reviews[]> => {
        return await prismaClient.reviews.findMany({
            where: {
                landlordId, 
                isDeleted: false
            }
        });
    }
    getReviewsByVendorId = async (vendorId: string): Promise<reviews[]> => {
        return await prismaClient.reviews.findMany({
            where: {
                vendorId, 
                isDeleted: false
            }
        });
    }
    getReviewsByTenantId = async (vendorId: string): Promise<reviews[]> => {
        return await prismaClient.reviews.findMany({
            where: {
                vendorId, 
                isDeleted: false
            }
        });
    }
    getReviewsByUserId = async (reviewById: string): Promise<reviews[]> => {
        return await prismaClient.reviews.findMany({
            where: {
                reviewById,
                isDeleted: false
            }
        });
    }
}

export default new ReviewService();
