import errorService from "../../services/error.service";
import { taskSchema, taskUpdateSchema } from "../validations/schema/taskSchema";
import { Request, Response } from 'express';
import taskServices from "../services/task.services";
import { CustomRequest } from "../../utils/types";

class TaskController {
    createTask = async (req: Request, res: Response) => {
        const { error, value  } = await taskSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const task = await taskServices.createTask(value);
            return res.status(201).json(task);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getAllTasks = async (req: Request, res: Response) =>{
        try {
            const propertyId = req.params.propertyId;
            const tasks = await taskServices.getAllTask(propertyId);
            return res.status(200).json(tasks);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getTaskById = async (req: CustomRequest, res: Response) => {
        try {
            const {taskId} = req.params;
            const task = await taskServices.getTaskById(taskId);
            if (!task) return res.status(404).json({ message: "Task not found" });
            return res.status(200).json(task);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    updateTask = async (req: CustomRequest, res: Response)=>{
        const { error, value  } = await taskUpdateSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const updatedTask = await taskServices.updateTask(req.params.taskId, value);
            if (!updatedTask) return res.status(404).json({ message: "Task not found" });
            return res.status(200).json(updatedTask);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    deleteTask = async (req: CustomRequest, res: Response) =>{
        try {
            const deletedTask = await taskServices.deleteTask(req.params.taskId);
            if (!deletedTask) return res.status(404).json({ message: "Task not found" });
            return res.status(200).json(deletedTask);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    getAllTasksByProperty = async (req: CustomRequest, res: Response) => {
        try {
            const { propertyId } = req.params;
            const tasks = await taskServices.getAllTasksByProperty(propertyId);
            if (tasks.length === 0) return res.status(404).json({ message: "No tasks found" });
            return res.status(200).json(tasks);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }


}

export default new TaskController();