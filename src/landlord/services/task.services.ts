import { StatusType } from "@prisma/client";
import { prismaClient } from "../..";

class TaskService {
    createTask = async (taskData: any) =>{
        //NOTE: Check the property ID if it exist before inserting into the table
        return await prismaClient.taskManagement.create({
            data: taskData,
        })
    };

    updateTask = async (taskId: string, taskData: any) => {
        // Check if task exists
        const existingTask = await this.getTaskById(taskId)
    
        if (!existingTask) {
            throw new Error(`Task with ID ${taskId} not found`);
        }
        // Prepare update data
        const updatedData: any = { ...taskData };
        if (taskData.status === StatusType.COMPLETED) {
            updatedData.completed = true;
        }
        // Update the task
        return await prismaClient.taskManagement.update({
            where: { id: taskId },
            data: updatedData,
        });
    };
    

    deleteTask = async (taskId: string) =>{
        return await prismaClient.taskManagement.update({
            where: { id: taskId },
            data: {isDeleted:true}
        })
    }

    getAllTasksByProperty = async (propertyId: string) =>{
        return await prismaClient.taskManagement.findMany({
            where: { propertyId, isDeleted:false },
        })
    }

    getTaskById = async (taskId: string) => {
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