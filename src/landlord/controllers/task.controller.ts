import errorService from "../../services/error.service";
import { taskSchema } from "../schema/taskSchema";
import { Request, Response } from 'express';
import taskServices from "../services/task.services";

class TaskController {
    async createTask(req: Request, res: Response) {
        const { value, error } = await taskSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const task = await taskServices.createTask(value);
            return res.status(201).json(task);

        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getAllTasks(req: Request, res: Response) {
        try {
            const tasks = await taskServices.getAllTask();
            return res.status(200).json(tasks);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getTaskById(req: Request, res: Response) {
        try {
            const {taskId} = req.params;
            const task = await taskServices.getTaskById(taskId);
            if (!task) return res.status(404).json({ message: "Task not found" });
            return res.status(200).json(task);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async updateTask(req: Request, res: Response) {
        // const { value, error } = await taskSchema.validate(req.body);
        // if (error) return res.status(400).json({ message: error.details[0].message });
        try {
            const updatedTask = await taskServices.updateTask(req.params.id, req.body);
            if (!updatedTask) return res.status(404).json({ message: "Task not found" });
            return res.status(200).json(updatedTask);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async deleteTask(req: Request, res: Response) {
        try {
            const deletedTask = await taskServices.deleteTask(req.params.id);
            if (!deletedTask) return res.status(404).json({ message: "Task not found" });
            return res.status(200).json(deletedTask);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getAllTasksByProperty(req: Request, res: Response) {
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