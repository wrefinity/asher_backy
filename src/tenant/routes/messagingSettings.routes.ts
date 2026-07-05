import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import TenantMessagingSettingsController from "../controllers/messagingSettings.controller";

class TenantMessagingSettingsRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get("/", TenantMessagingSettingsController.getSettings);
    this.router.patch("/visibility", TenantMessagingSettingsController.updateVisibility);
    this.router.post("/share", TenantMessagingSettingsController.shareContact);
    this.router.delete("/share/:peerUserId", TenantMessagingSettingsController.removeShare);
  }
}

export default new TenantMessagingSettingsRouter().router;
