import { Router } from "express";
import upload from "../../configs/multer";
import { uploadToCloudinaryGeneric } from "../../middlewares/multerCloudinary";
import VendorVerificationController from "../controllers/verification.controller";

class VendorVerificationRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post(
      "/resubmit",
      upload.array('files'),
      uploadToCloudinaryGeneric,
      VendorVerificationController.resubmit
    );
    // Disputes (Part 6 of VENDOR_APP_FLOW_SPEC.md) - vendor -> Asher admin.
    this.router.post("/disputes", VendorVerificationController.raiseDispute);
    // Terms & conditions acceptance (Session 1 / Session 2 sheets).
    this.router.post("/terms", VendorVerificationController.acceptTerms);
  }
}

export default new VendorVerificationRoutes().router;
