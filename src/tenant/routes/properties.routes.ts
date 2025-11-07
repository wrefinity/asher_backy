import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import propertyController from "../controllers/properties.controller";
import { validateBody } from "../../middlewares/validation";
import { createPropertyEnquirySchema, propertySearchSchema } from "../../validations/schemas/properties.schema";

class PropertyRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes() {
        this.router.post("/search", validateBody(propertySearchSchema), propertyController.searchProperties);
        this.router.post("/enquire", validateBody(createPropertyEnquirySchema), propertyController.createPropertyEnquiry);

    }
}

export default new PropertyRouter().router;