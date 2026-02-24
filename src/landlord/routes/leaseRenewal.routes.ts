import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import { validateBody } from "../../middlewares/validation";
import landlordLeaseRenewalController from "../controllers/leaseRenewal.controller";
import { renewalSchema, responseSchema } from "../../validations/schemas/lease.schema";

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
    // Routes
    this.router.get("/", landlordLeaseRenewalController.getLeaseRenewals);
    this.router.get("/expiry-report", landlordLeaseRenewalController.getLeaseExpiryReport);
    this.router.post("/initiate", validateBody(renewalSchema), landlordLeaseRenewalController.initiateLeaseRenewal);
    this.router.post("/:proposalId/respond", validateBody(responseSchema), landlordLeaseRenewalController.respondToRenewalProposal);
    this.router.post("/check-reminders", landlordLeaseRenewalController.checkRenewalReminders);
  }
}

export default new LandlordLeaseRenewalRouter().router;
