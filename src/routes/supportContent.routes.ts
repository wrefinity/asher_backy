import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import SupportContentController from "../controllers/supportContent.controller";
import { userRoles } from "@prisma/client";

class SupportContentRouter {
  public router: Router;
  protected authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Public routes (for frontend - only published content)
    this.router.get("/faqs", SupportContentController.getFAQs);
    this.router.get("/faqs/:id", SupportContentController.getFAQById);
    this.router.get("/help-articles", SupportContentController.getHelpArticles);
    this.router.get(
      "/help-articles/:id",
      SupportContentController.getHelpArticleById
    );
    this.router.get(
      "/video-tutorials",
      SupportContentController.getVideoTutorials
    );
    this.router.get(
      "/video-tutorials/:id",
      SupportContentController.getVideoTutorialById
    );

    // View tracking routes (public - no auth required)
    this.router.post("/faqs/:id/view", SupportContentController.trackFAQView);
    this.router.post("/help-articles/:id/view", SupportContentController.trackHelpArticleView);
    this.router.post("/video-tutorials/:id/view", SupportContentController.trackVideoTutorialView);

    // Admin routes (require authentication and ADMIN role)
    this.router.use(
      this.authenticateService.authorize,
      this.authenticateService.authorizeRole(userRoles.ADMIN)
    );

    // FAQ Admin Routes
    this.router.post("/faqs", SupportContentController.createFAQ);
    this.router.patch("/faqs/:id", SupportContentController.updateFAQ);
    this.router.delete("/faqs/:id", SupportContentController.deleteFAQ);

    // Help Article Admin Routes
    this.router.post(
      "/help-articles",
      SupportContentController.createHelpArticle
    );
    this.router.patch(
      "/help-articles/:id",
      SupportContentController.updateHelpArticle
    );
    this.router.delete(
      "/help-articles/:id",
      SupportContentController.deleteHelpArticle
    );

    // Video Tutorial Admin Routes
    this.router.post(
      "/video-tutorials",
      SupportContentController.createVideoTutorial
    );
    this.router.patch(
      "/video-tutorials/:id",
      SupportContentController.updateVideoTutorial
    );
    this.router.delete(
      "/video-tutorials/:id",
      SupportContentController.deleteVideoTutorial
    );
  }
}

export default new SupportContentRouter().router;

