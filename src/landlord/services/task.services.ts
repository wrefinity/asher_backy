import { StatusType } from "@prisma/client";
import { prismaClient } from "../..";

class TaskService {
    async createTask(taskData: any) {
        //NOTE: Check the property ID if it exist before inserting into the table
        return await prismaClient.taskManagement.create({
            data: taskData,
        })
    };

    updateTask = async (taskId: string, taskData: any) =>{
        const updatedData: any = { ...taskData }
        if (taskData.status === StatusType.COMPLETED) {
            updatedData.completed = true;
        }
        return await prismaClient.taskManagement.update({
            where: { id: taskId },
            data: updatedData,
        })
    }

    deleteTask = async (taskId: string) =>{
        return await prismaClient.taskManagement.update({
            where: { id: taskId },
            data: {isDeleted:true}
        })
    }

    async getAllTasksByProperty(propertyId: string) {
        return await prismaClient.taskManagement.findMany({
            where: { propertyId, isDeleted:false },
        })
    }

    async getTaskById(taskId: string) {
        return await prismaClient.taskManagement.findUnique({
            where: { id: taskId },
        })
    }

    getAllTask = async (propertyId)=>{
        return await prismaClient.taskManagement.findMany({
            where:{
                propertyId,
                isDeleted:true,
            },
            include: {
                property: true,
            }
        })
    }


}

export default new TaskService()