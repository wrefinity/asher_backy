import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import { validateBody } from "../../middlewares/validation";
import Joi from "joi";
import * as leaseExtensionController from "../controllers/leaseExtension.controller";

class TenantLeaseExtensionRouter {
  public router: Router;
  private authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.authenticateService.authorize);

    const requestSchema = Joi.object({
      period: Joi.number().integer().positive().required(),
      unit: Joi.string().valid("WEEKS", "MONTHS", "YEARS").required(),
      message: Joi.string().allow("").optional(),
    });

    this.router.post("/request", validateBody(requestSchema), leaseExtensionController.requestLeaseExtension);
    this.router.get("/requests", leaseExtensionController.getLeaseExtensionRequests);
  }
}

export default new TenantLeaseExtensionRouter().router;
