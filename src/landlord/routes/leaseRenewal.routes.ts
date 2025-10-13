import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import { validateBody } from "../../middlewares/validation";
import Joi from "joi";
import landlordLeaseRenewalController from "../controllers/leaseRenewal.controller";

class LandlordLeaseRenewalRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.authenticateService.authorize);

    const renewalSchema = Joi.object({
      tenantId: Joi.string().required(),
      propertyId: Joi.string().required(),
      currentRent: Joi.number().positive().required(),
      proposedRent: Joi.number().positive().required(),
      renewalTerms: Joi.object({
        duration: Joi.string().valid('WEEKLY', 'MONTHLY', 'ANNUAL').required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().required()
      }).required(),
      message: Joi.string().optional()
    });

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

    // Routes
    this.router.get("/", landlordLeaseRenewalController.getLeaseRenewals);
    this.router.get("/expiry-report", landlordLeaseRenewalController.getLeaseExpiryReport);
    this.router.post("/initiate", validateBody(renewalSchema), landlordLeaseRenewalController.initiateLeaseRenewal);
    this.router.post("/:proposalId/respond", validateBody(responseSchema), landlordLeaseRenewalController.respondToRenewalProposal);
    this.router.post("/check-reminders", landlordLeaseRenewalController.checkRenewalReminders);
  }
}

export default new LandlordLeaseRenewalRouter().router;
