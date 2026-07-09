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
  }
}

export default new VendorVerificationRoutes().router;
