import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import AIController from "../controllers/ai.controller";
import { userRoles } from "@prisma/client";

class AIRoutes {
  public router: Router;
  protected authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // All AI routes require authentication
    this.router.use(this.authenticateService.authorize);

    // AI Ticket Analysis
    this.router.post("/analyze-ticket", AIController.analyzeTicket);

    // AI Smart Replies
    this.router.post("/smart-replies", AIController.generateSmartReplies);

    // AI Email Draft
    this.router.post("/email-draft", AIController.generateEmailDraft);

    // AI Property Description
    this.router.post("/property-description", AIController.generatePropertyDescription);

    // AI Document Template (Admin only)
    this.router.post(
      "/document-template",
      this.authenticateService.authorizeRole(userRoles.ADMIN),
      AIController.generateDocumentTemplate
    );
  }
}

export default new AIRoutes().router;
