import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import taskController from "../controllers/task.controller";

class TaskRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.post('/', taskController.createTask)
        this.router.get('/', taskController.getAllTasks)
        this.router.get('/:taskId', taskController.getTaskById)
        this.router.patch('/:taskId', taskController.updateTask)
        this.router.delete('/:taskId', taskController.deleteTask)
        this.router.get('/property/:propertyId', taskController.getAllTasksByProperty)

    }
}

export default new TaskRouter().router;