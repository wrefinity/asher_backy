import { prismaClient } from "..";


class SubCategoryService {
    createSubCategory = async (data) => {
        return await prismaClient.subCategory.create({
            data,
        });
    }

    // Other CRUD operations
    getAllSubCategories = async () => {
        return await prismaClient.subCategory.findMany({
            where:{isDeleted:false}
        });
    }

    getSubCategoryById = async (id:string) => {
        return await prismaClient.subCategory.findUnique({
            where: { id },
        });
    }

    updateSubCategory = async (id, data) => {
        return await prismaClient.subCategory.update({
            where: { id },
            data,
        });
    }

    deleteSubCategory = async (id) => {
        return await prismaClient.subCategory.delete({
            where: { id },
        });
    }
}


export default new SubCategoryService();