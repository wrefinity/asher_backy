import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import { validateBody } from "../../middlewares/validation";
import Joi from "joi";
import tenantLeaseRenewalController from "../controllers/leaseRenewal.controller";

class TenantLeaseRenewalRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.authenticateService.authorize);

    const responseSchema = Joi.object({
      response: Joi.string().valid('ACCEPTED', 'REJECTED', 'COUNTER_OFFER').required(),
      counterOffer: Joi.object({
        proposedRent: Joi.number().positive().optional(),
        renewalTerms: Joi.object().optional(),
        message: Joi.string().optional()
      }).when('response', {
        is: 'COUNTER_OFFER',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    });

    const requestSchema = Joi.object({
      proposedRent: Joi.number().positive().required(),
      renewalTerms: Joi.object({
        duration: Joi.string().valid('WEEKLY', 'MONTHLY', 'ANNUAL').required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().required()
      }).required(),
      message: Joi.string().optional()
    });

    // Routes
    this.router.get("/", tenantLeaseRenewalController.getLeaseRenewals);
    this.router.get("/current-lease", tenantLeaseRenewalController.getCurrentLeaseInfo);
    this.router.post("/request", validateBody(requestSchema), tenantLeaseRenewalController.requestLeaseRenewal);
    this.router.post("/:proposalId/respond", validateBody(responseSchema), tenantLeaseRenewalController.respondToRenewalProposal);
  }
}

export default new TenantLeaseRenewalRouter().router;
