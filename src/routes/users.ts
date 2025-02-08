import { Router } from "express";
import UserController from "../controllers/users.controller";


class UserRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get("/:userId", UserController.getUserById.bind(UserController));
    }
}


export default new UserRoutes().router;

