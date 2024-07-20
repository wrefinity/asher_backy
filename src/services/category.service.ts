import { prismaClient } from "..";

class categoryService {
    protected inclusion;

    constructor(){
        this.inclusion ={
            subCategory:true
        }
    }
    createCategory = async (data) => {
        return await prismaClient.category.create({
            data,
        });
    };

    getAllCategories = async () => {
        return await prismaClient.category.findMany({
            where:{isDeleted:false},
            include:this.inclusion
        });
    };

    getCategoryById = async (id:string) => {
        return await prismaClient.category.findUnique({
            where: { id, isDeleted:false},
            include:this.inclusion
        });
    };

    updateCategory = async (id, data) => {
        return await prismaClient.category.update({
            where: { id, isDeleted:false },
            data,
            include:this.inclusion
        });
    };

    deleteCategory = async (id) => {
        return await prismaClient.category.update({
            where: { id },
            data:{
                isDeleted:false
            }
        });
    };
}


export default new categoryService()
