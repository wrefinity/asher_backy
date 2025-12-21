import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import DocumentRequestService from "../../services/documentRequest.service";
import errorService from "../../services/error.service";
import propertyServices from "../../services/propertyServices";
import TenantService from "../../services/tenant.service";
import { PropertyDocumentService } from "../../services/propertyDocument.service";
import { uploadDocsCloudinary } from "../../middlewares/multerCloudinary";

class DocumentRequestController {
  createDocumentRequest = async (req: CustomRequest, res: Response) => {
    try {
      const { documentName, documentCategory, type, dueDate } = req.body;
      const landlordId = req.user?.landlords?.id;
      const requestedBy = req.user?.id;

      if (!landlordId) {
        return res.status(403).json({ error: "Please login as a landlord" });
      }

      // Get tenantId from params or body
      const tenantId = req.params.tenantId || req.body.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }

      // Get propertyId from body or from tenant
      let propertyId = req.body.propertyId;
      if (!propertyId) {
        // Fetch propertyId from tenant
        const tenant = await TenantService.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ error: "Tenant not found" });
        }
        propertyId = tenant.propertyId;
      }

      // Verify property belongs to landlord
      const property = await propertyServices.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      if (property.landlordId !== landlordId) {
        return res.status(403).json({ error: "Unauthorized: Property does not belong to landlord" });
      }

      // Verify tenant belongs to property and landlord
      const tenant = await TenantService.getTenantById(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      if (tenant.propertyId !== propertyId || tenant.landlordId !== landlordId) {
        return res.status(403).json({ error: "Unauthorized: Tenant does not belong to this property" });
      }

      const documentRequest = await DocumentRequestService.createRequest({
        documentName,
        documentCategory,
        type,
        dueDate: new Date(dueDate),
        tenantId,
        propertyId,
        landlordId,
        requestedBy,
      });

      return res.status(201).json({
        message: "Document request created successfully",
        documentRequest,
      });
    } catch (error) {
      errorService.handleError(error, res);
    }
  };

  getDocumentRequests = async (req: CustomRequest, res: Response) => {
    try {
      const landlordId = req.user?.landlords?.id;
      const tenantId = req.params.tenantId;

      if (!landlordId && !tenantId) {
        return res.status(403).json({ error: "Please login as a landlord or provide tenant ID" });
      }

      let documentRequests;
      if (tenantId) {
        // Get requests for specific tenant
        const tenant = await TenantService.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ error: "Tenant not found" });
        }

        // Verify landlord owns this tenant
        if (landlordId && tenant.landlordId !== landlordId) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        documentRequests = await DocumentRequestService.getRequestsByTenant(tenantId);
      } else if (landlordId) {
        // Get all requests for landlord
        documentRequests = await DocumentRequestService.getRequestsByLandlord(landlordId);
      }

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

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Get the document request
      const propertyDocumentService = new PropertyDocumentService();
      const documentRequest = await propertyDocumentService.findById(id);

      if (!documentRequest) {
        return res.status(404).json({ error: "Document request not found" });
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

export default new DocumentRequestController();
