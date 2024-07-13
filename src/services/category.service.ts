import { prismaClient } from "..";

class categoryService {

    createCategory = async (data) => {
        return await prismaClient.category.create({
            data,
        });
    };

    getAllCategories = async () => {
        return await prismaClient.category.findMany();
    };

    getCategoryById = async (id:string) => {
        return await prismaClient.category.findUnique({
            where: { id },
        });
    };

    updateCategory = async (id, data) => {
        return await prismaClient.category.update({
            where: { id },
            data,
        });
    };

    deleteCategory = async (id) => {
        return await prismaClient.category.delete({
            where: { id },
        });
    };
}


export default new categoryService()
