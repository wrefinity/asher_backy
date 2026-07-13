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
  }
}

export default new VendorVerificationRoutes().router;
