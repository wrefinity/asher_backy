import { Router } from "express";
import ViolationController from "../controllers/violation.controller";
import { validateBody } from "../../middlewares/validation";
import { ViolationSchema } from "../../validations/schemas/violations";

class ViolationRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Dashboard Analytics
        this.router.post('/', validateBody(ViolationSchema), ViolationController.createViolation    );
        this.router.delete('/:id', ViolationController.deleteViolation);
        this.router.get('/:id', ViolationController.getViolationById);
 
    }
}

export default new ViolationRouter().router;
