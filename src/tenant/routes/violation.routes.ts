import { Router } from "express";
import upload from "../../configs/multer";
import { uploadToCloudinary } from "../../middlewares/multerCloudinary";
import ViolationController from "../controllers/violation.controller";
import { validateBody } from "../../middlewares/validation";
import { ViolationResponseSchema } from "../../validations/schemas/violations";

class ViolationRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', upload.array('files'), uploadToCloudinary, validateBody(ViolationResponseSchema), ViolationController.createViolationResponse);
        this.router.get('/id', ViolationController.getViolationById);
        this.router.get('/tenant-violation', ViolationController.getByTenant);
        this.router.get('/tenant-violation-response', ViolationController.getTenantViolationResponses);
        this.router.get('/violation-responses/:violationId', ViolationController.getViolationResponsesById);

    }
}

export default new ViolationRouter().router;