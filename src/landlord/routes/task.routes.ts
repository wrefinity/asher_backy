import { Router } from "express";
import taskController from "../controllers/task.controller";

class TaskRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', taskController.createTask)
        this.router.get('/:propertyId', taskController.getAllTasks)
        this.router.get('/task/:taskId', taskController.getTaskById)
        this.router.patch('/:taskId', taskController.updateTask)
        this.router.delete('/:taskId', taskController.deleteTask)
        this.router.get('/property/:propertyId', taskController.getAllTasksByProperty)

    }
}

export default new TaskRouter().router;