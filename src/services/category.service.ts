import { prismaClient } from "..";
import { CategoryIF } from "../validations/interfaces/categories.interface";
import { CategoryType } from "@prisma/client";
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

    getAllCategories = async () => {
        return await prismaClient.category.findMany({
            where: {
                isDeleted: false,
            },
            include: {
                subCategory: {
                    where: {
                        isDeleted: false,
                    },
                },
            },
        });
    };

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
