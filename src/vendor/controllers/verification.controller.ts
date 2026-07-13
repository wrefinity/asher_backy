import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { resubmitVendorVerification } from "../../services/vendorVerification.service";
import { prismaClient } from "../..";

class VendorVerificationController {
  // Vendor raises a dispute (Part 6 of VENDOR_APP_FLOW_SPEC.md): always to
  // Asher admin, never to the other party; tags the disputed job so admin
  // pulls its evidence directly.
  raiseDispute = async (req: CustomRequest, res: Response) => {
    try {
      const vendorId = req.user?.vendors?.id;
      const { subject, description, maintenanceId } = req.body;

      if (!subject?.trim() || !description?.trim()) {
        return res.status(400).json({ success: false, message: "subject and description are required" });
      }

      if (maintenanceId) {
        const job = await prismaClient.maintenance.findFirst({
          where: { id: maintenanceId, vendorId },
          select: { id: true },
        });
        if (!job) {
          return res.status(404).json({ success: false, message: "That job was not found on your account" });
        }
      }

      const ticket = await prismaClient.supportTicket.create({
        data: {
          ticketCode: `DSP-${Date.now().toString(36).toUpperCase()}`,
          type: "DISPUTE",
          subject: subject.trim(),
          description: description.trim(),
          raisedByVendorId: vendorId,
          maintenanceId: maintenanceId || null,
        },
      });

      return res.status(201).json({ success: true, data: ticket, message: "Dispute raised - the Asher team will review it" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message ?? "Failed to raise dispute" });
    }
  };
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
