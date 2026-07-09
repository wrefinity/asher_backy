import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { resubmitVendorVerification } from "../../services/vendorVerification.service";

class VendorVerificationController {
  // Restart onboarding from scratch after a REJECTED verification (Part 1 of
  // VENDOR_APP_FLOW_SPEC.md) - replaces documents and resets to PENDING,
  // reusing the same authenticated account rather than re-registering.
  resubmit = async (req: CustomRequest, res: Response) => {
    try {
      const vendorId = req.user.vendors.id;
      // uploadToCloudinaryGeneric middleware already pairs uploaded files
      // with req.body.documentTypes into { url, type }[] here.
      const documents = req.body.uploadedDocuments || [];

      const vendor = await resubmitVendorVerification(vendorId, documents);

      return res.status(200).json({
        success: true,
        message: 'Verification resubmitted for review',
        data: vendor,
      });
    } catch (error: any) {
      const status = error?.statusCode ?? 500;
      return res.status(status).json({
        success: false,
        message: error?.message ?? 'Failed to resubmit verification',
      });
    }
  };
}

export default new VendorVerificationController();
