import { Router } from "express";
import TodoController from '../controllers/todo.controller';
import { Authorize } from "../middlewares/authorize";


class TodoRoutes {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize()
        this.initializeRoutes();
    }

    private initializeRoutes(): void {

        this.router.post(
            '/',
            this.authenticateService.authorize,
            TodoController.createTodo
        );

        this.router.get('/', this.authenticateService.authorize, TodoController.getUserTodos);
        this.router.get('/:id', this.authenticateService.authorize, TodoController.getTodo);
        this.router.patch(
            '/:id',
            this.authenticateService.authorize,
            TodoController.updateTodo
        );
        this.router.delete('/:id', this.authenticateService.authorize, TodoController.deleteTodo);

    }
}

export default new TodoRoutes().router;
