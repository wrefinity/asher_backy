import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import DocumentRequestService from "../../services/documentRequest.service";
import errorService from "../../services/error.service";
import { PropertyDocumentService } from "../../services/propertyDocument.service";
import { uploadDocsCloudinary } from "../../middlewares/multerCloudinary";

class TenantDocumentRequestController {
  getDocumentRequests = async (req: CustomRequest, res: Response) => {
    try {
      const tenantId = req.user?.tenant?.id;

      if (!tenantId) {
        return res.status(403).json({ error: "Please login as a tenant" });
      }

      const documentRequests = await DocumentRequestService.getRequestsByTenant(tenantId);

      return res.status(200).json({
        documentRequests,
      });
    } catch (error) {
      errorService.handleError(error, res);
    }
  };

  fulfillDocumentRequest = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params; // document request ID (propertyDocument ID)
      const file = req.file as Express.Multer.File;
      const tenantId = req.user?.tenant?.id;

      if (!tenantId) {
        return res.status(403).json({ error: "Please login as a tenant" });
      }

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Get the document request
      const propertyDocumentService = new PropertyDocumentService();
      const documentRequest = await propertyDocumentService.findById(id);

      if (!documentRequest) {
        return res.status(404).json({ error: "Document request not found" });
      }

      // Verify this request belongs to the tenant
      if (documentRequest.applicationId) {
        // Check if the application belongs to this tenant
        const { prismaClient } = await import("../..");
        const tenant = await prismaClient.tenants.findFirst({
          where: { 
            id: tenantId,
            applicationId: documentRequest.applicationId,
          },
        });

        if (!tenant) {
          return res.status(403).json({ error: "Unauthorized: This document request does not belong to you" });
        }
      }

      // Check if it's actually a request (empty documentUrl)
      if (documentRequest.documentUrl.length > 0) {
        return res.status(400).json({ error: "This document request has already been fulfilled" });
      }

      // Upload the file
      const uploadResult: any = await uploadDocsCloudinary(file);

      if (!uploadResult.secure_url) {
        return res.status(500).json({ error: "Failed to upload document" });
      }

      // Update the document request with the uploaded URL
      const updatedDocument = await propertyDocumentService.update(id, {
        documentUrl: [uploadResult.secure_url],
        size: String(file.size),
        type: file.mimetype,
        isPublished: true, // Mark as fulfilled
      });

      return res.status(200).json({
        message: "Document uploaded successfully",
        documentRequest: updatedDocument,
      });
    } catch (error) {
      errorService.handleError(error, res);
    }
  };
}

export default new TenantDocumentRequestController();
