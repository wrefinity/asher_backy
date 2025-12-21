import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import TenantDocumentRequestController from "../controllers/documentRequest.controller";
import upload from "../../configs/multer";

class TenantDocumentRequestRouter {
  public router: Router;
  authenticateService: Authorize;

  constructor() {
    this.router = Router();
    this.authenticateService = new Authorize();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use(this.authenticateService.authorize);
    this.router.get("/", TenantDocumentRequestController.getDocumentRequests);
    this.router.post("/:id/fulfill", upload.single('file'), TenantDocumentRequestController.fulfillDocumentRequest);
  }
}

export default new TenantDocumentRequestRouter().router;
