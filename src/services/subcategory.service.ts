import { prismaClient } from "..";
import { CategoryType } from "@prisma/client";


interface SubCategoryIF {
    id?: string;
    name: string;
    categoryId: string;
    image: string[];
    description?: string;
    labels: string[];
    type: CategoryType;
    isDeleted?: boolean;
}
class SubCategoryService {
    createSubCategory = async (data: SubCategoryIF) => {
        const { categoryId, ...rest } = data;

        const existingSubCategory = await this.checkSubCategoryExist(data.name, data.type);

        if (existingSubCategory) {
            throw new Error("A subCategory with the same name and type already exists.");
        }
        // If no duplicate exists, create the new subCategory
        return await prismaClient.subCategory.create({
            data: {
                ...rest,
                category: {
                    connect: {
                        id: categoryId,
                    },
                },
            },
        });
    }

    // check for subCategory existance 
    // base on name and type
    checkSubCategoryExist = async (name: string, type: CategoryType) => {
        // Check if a subCategory with the same name and type already exists
        return await prismaClient.subCategory.findFirst({
            where: {
                name: name,
                type: type,
            },
        });
    }

    // Other CRUD operations
    getAllSubCategories = async () => {
        return await prismaClient.subCategory.findMany({
            where: { isDeleted: false }
        });
    }
    // get all subcategories by type
    getAllSubCategoriesTypes = async (type: CategoryType, categoryId: string): Promise<SubCategoryIF[]> => {
        return await prismaClient.subCategory.findMany({
            where: {
                type,
                categoryId,
                isDeleted: false
            }
        });
    }

    getSubCategoryById = async (id: string): Promise<SubCategoryIF> => {
        return await prismaClient.subCategory.findUnique({
            where: { id },
        });
    }

    updateSubCategory = async (id, data: Partial<SubCategoryIF>) => {
        return await prismaClient.subCategory.update({
            where: { id },
            data,
        });
    }

    deleteSubCategory = async (id) => {
        return await prismaClient.subCategory.update({
            where: { id },
            data: { isDeleted: true },
        });
    }
}


export default new SubCategoryService();