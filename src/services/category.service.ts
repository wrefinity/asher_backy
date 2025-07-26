import { prismaClient } from "..";
import { CategoryIF } from "../validations/interfaces/categories.interface";
import { CategoryType, Prisma } from "@prisma/client";
class categoryService {
    protected inclusion;

    constructor() {
        this.inclusion = {
            subCategory: true
        }
    }
    createCategory = async (data: CategoryIF) => {
        return await prismaClient.category.create({
            data,
        });
    };
    getAllCategoriesWithoutFilters = async () => {
        return await prismaClient.category.findMany({
            include:{
                subCategory:true
            }
        });
    };

    async getCategories(value?: any) {
        const {
            page,
            limit,
            type,
            search,
            isDeleted,
            sortBy,
            sortOrder
        } = value;

        const where: Prisma.categoryWhereInput = {
            isDeleted
        };
        // Apply type filter
        if (type) {
            where.subCategory = {
                some: {
                    type,
                    isDeleted: false
                }
            };
        }
        // Apply search filter
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { labels: { hasSome: [search] } }
            ];
        }

        // Get total count for pagination
        const total = await prismaClient.category.count({ where });

        // Get paginated results
        const categories = await prismaClient.category.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: {
                [sortBy]: sortOrder
            },
            include: {
                subCategory: {
                    where: { isDeleted: false },
                    orderBy: {
                        name: 'asc'
                    }
                }
            }
        });

        return {
            data: categories,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1
            }
        };
    }

    getCategoryById = async (id: string) => {
        return await prismaClient.category.findUnique({
            where: { id, isDeleted: false },
            include: this.inclusion
        });
    };

    // Get all categories based on their subcategory type
    getAllCategoriesTypes = async (type: CategoryType): Promise<CategoryIF[]> => {
        // Validate if the provided type is a valid CategoryType
        if (!Object.values(CategoryType).includes(type)) {
            throw new Error("Invalid subcategory type.");
        }

        // Fetch categories where the subcategory has the specific type and is not deleted
        return await prismaClient.category.findMany({
            where: {
                isDeleted: false, // Only fetch non-deleted categories
                subCategory: {
                    some: {
                        type, // Filter by subcategory type
                        isDeleted: false, // Only include non-deleted subcategories
                    },
                },
            },
            include: {
                subCategory: {
                    where: {
                        type, // Filter subcategories by type
                        isDeleted: false, // Only include non-deleted subcategories
                    },
                },
            },
        });
    }

    updateCategory = async (id, data) => {
        return await prismaClient.category.update({
            where: { id, isDeleted: false },
            data,
            include: this.inclusion
        });
    };

    deleteCategory = async (id) => {
        return await prismaClient.category.update({
            where: { id },
            data: {
                isDeleted: true
            }
        });
    };
}


export default new categoryService()
