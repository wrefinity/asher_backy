import { StatusType } from "@prisma/client";
import { prismaClient } from "../..";

class TaskService {
    async createTask(taskData: any) {
        //NOTE: Check the property ID if it exist before inserting into the table
        return await prismaClient.taskManagement.create({
            data: taskData,
        })
    };

    async updateTask(taskId: string, taskData: any) {
        const updatedData: any = { ...taskData }
        if (taskData.status === StatusType.COMPLETED) {
            updatedData.completed = true;
        }
        return await prismaClient.taskManagement.update({
            where: { id: taskId },
            data: updatedData,
        })
    }

    async deleteTask(taskId: string) {
        return await prismaClient.taskManagement.delete({
            where: { id: taskId },
        })
    }

    async getAllTasksByProperty(propertyId: string) {
        return await prismaClient.taskManagement.findMany({
            where: { propertyId },
        })
    }

    async getTaskById(taskId: string) {
        return await prismaClient.taskManagement.findUnique({
            where: { id: taskId },
        })
    }

    async getAllTask() {
        return await prismaClient.taskManagement.findMany({
            include: {
                property: true,
            }
        })
    }


}

export default new TaskService()