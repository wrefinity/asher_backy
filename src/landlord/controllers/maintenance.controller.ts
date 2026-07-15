import { Response } from "express"
import { CustomRequest } from "../../utils/types"
import MaintenanceService from "../services/maintenance.service"
import GeneralMaitnenanceservice from "../../services/maintenance.service"
import { maintenanceStatus, maintenanceDecisionStatus } from '@prisma/client';
import ErrorService from "../../services/error.service";
import CateoryService from "../../services/category.service"
import SubCateoryService from "../../services/subcategory.service"
import PropertyService from "../../services/propertyServices"
import { maintenanceWhitelistSchema, updateWhitelistSchema } from "../validations/schema/maintenance";
import { quoteService } from "../../services/quote.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";

class MaintenanceControls {
    // <========= whitelisting section ========>
    createWhitelist = async (req: CustomRequest, res: Response) => {
        try {
           
            const { error, value } = maintenanceWhitelistSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ error: "Unauthorized" });

            const categoryExist = await CateoryService.getCategoryById(value.categoryId)
            if (!categoryExist) return res.status(400).json({ message: "category doesnt exist" })
            const subCategoryExist = await SubCateoryService.getSubCategoryById(value.subcategoryId)
            if (!subCategoryExist) return res.status(400).json({ message: "sub category doesnt exist" })
            // Check if the property exists if propertyId is provided
            if (value.propertyId) {
                const propertyExist = await PropertyService.getPropertiesById(value.propertyId);
                if (!propertyExist) {
                    return res.status(400).json({ message: "Property doesn't exist" });
                }
            }
            const newWhitelist = await MaintenanceService.createWhitelist(value, landlordId);
            return res.status(201).json({ message: "Whitelist created successfully", data: newWhitelist });
        } catch (err) {
            console.log(err)
            return res.status(500).json({ error: err.message });
        }
    }

    // Get maintenance whitelist for a landlord
    getWhitelistByLandlord = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ error: "Unauthorized" });

            const whitelist = await MaintenanceService.getWhitelistByLandlord(landlordId);
            
            return res.status(200).json({ data: whitelist });
        } catch (err) {
            ErrorService.handleError(err, res)
        }
    }
    getMaintenanceWithWhiteListed = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ error: "Unauthorized" });

            const whitelist = await MaintenanceService.getMaintenanceCategoriesWithWhitelistStatus(landlordId);
            return res.status(200).json({ data: whitelist });
        } catch (err) {
            ErrorService.handleError(err, res)
        }
    }
    toggleMaintenanceWhiteList = async (req: CustomRequest, res: Response) => {
        try {
            // get the maintenance whitelist id 
            const { subCategoryId } = req.params;
            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ error: "Unauthorized" });

            const whitelist = await MaintenanceService.toggleWhitelistStatus(subCategoryId, landlordId);
            return res.status(200).json({ data: whitelist });
        } catch (err) {
            ErrorService.handleError(err, res)
        }
    }
    // Update a maintenance whitelist entry
    cancelMaintenance = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ error: "Unauthorized" });

            const maintenanceId = req.params.maintenanceId;
            const vendorId = req.params.vendorId;
            const cancelReason = req.body.cancelReason;

            if(!cancelReason){
                return  res.status(400).json({ message: "Please provide a reason for cancellation" });
            }
            const canceledMaintenance = await GeneralMaitnenanceservice.cancelMaintenance(maintenanceId, cancelReason, vendorId);
            return res.status(200).json({ message: "Maintenance request canceled successfully", data: canceledMaintenance });
        }   catch (err) {       
            ErrorService.handleError(err, res)
        }
    }
    updateWhitelist = async (req: CustomRequest, res: Response) => {
        try {
            const { error } = updateWhitelistSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const whitelistId = req.params.whitelistId;
            const updatedWhitelist = await MaintenanceService.updateWhitelist(whitelistId, req.body);

            return res.status(200).json({ message: "Whitelist updated successfully", data: updatedWhitelist });
        } catch (err) {
            ErrorService.handleError(err, res)
        }
    }

    getPropertyMaintenance = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const maintenances = await MaintenanceService.getPropertyMaintenances(propertyId);
            if (!maintenances) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json(maintenances)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getTenantsMaintenances = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const tenantId = req.params.tenantId;
            const maintenances = await MaintenanceService.getTenantMaintenance(landlordId, tenantId);
            return res.status(200).json({ maintenances })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getCurrentLandlordMaintenances = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const [pendingMaintenace, assignedMaintenace, completedMaintenace] = await Promise.all([
                MaintenanceService.getLandlordPropertiesMaintenance(landlordId, maintenanceStatus.PENDING),
                MaintenanceService.getLandlordPropertiesMaintenance(landlordId, maintenanceStatus.ASSIGNED),
                MaintenanceService.getLandlordPropertiesMaintenance(landlordId, maintenanceStatus.COMPLETED)
            ]);

            return res.status(200).json({ pendingMaintenace, assignedMaintenace, completedMaintenace })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    // Declining terminates the request outright - it cannot be picked up by a
    // vendor or acted on again, unlike before where it just sat unresolved.
    declineMaintenaceRequest = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const maintenanceId = req.params.maintenanceId
            const maintenance = await MaintenanceService.changeLandlordPropertiesMaintenanceDecisionState(
                landlordId, maintenanceId, maintenanceDecisionStatus.DECLINED, { cancel: true }
            );
            return res.status(200).json({ maintenance })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    // Landlord accepts the TENANT'S offer to pay - only valid if the tenant
    // actually offered. Unlocks the tenant's own price-setting step.
    acceptMaintenaceRequest = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const maintenanceId = req.params.maintenanceId

            const existing = await GeneralMaitnenanceservice.getMaintenanceById(maintenanceId);
            if (!existing) return res.status(404).json({ message: "Maintenance request not found" });
            if (!existing.tenantWantsToPay) {
                return res.status(400).json({ message: "The tenant did not offer to pay for this repair" });
            }

            const maintenance = await MaintenanceService.changeLandlordPropertiesMaintenanceDecisionState(
                landlordId, maintenanceId, maintenanceDecisionStatus.APPROVED, { landlordWillRepair: false }
            );
            return res.status(200).json({ maintenance })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    // Landlord approves the repair to handle/pay for it themselves, ignoring
    // any tenant offer. Stays hidden from vendors until explicitly posted.
    approveRepairMyself = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const maintenanceId = req.params.maintenanceId
            const maintenance = await MaintenanceService.changeLandlordPropertiesMaintenanceDecisionState(
                landlordId, maintenanceId, maintenanceDecisionStatus.APPROVED, { landlordWillRepair: true }
            );
            return res.status(200).json({ maintenance })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    // Landlord makes an approved "I'll repair this myself" job visible to vendors.
    postJobForVendorSearch = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const maintenanceId = req.params.maintenanceId
            const maintenance = await MaintenanceService.postJobForVendorSearch(landlordId, maintenanceId);
            return res.status(200).json({ maintenance })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getMaintenances = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const [maintenaceRequestedByLandlord, maintenaceRequestedByTenants, maintenanceHistory] = await Promise.all([
                MaintenanceService.getRequestedMaintenanceByLandlord(landlordId),
                MaintenanceService.getRequestedMaintenanceByTenants(landlordId),
                MaintenanceService.getLandlordPropertiesMaintenance(landlordId)
            ]);

            return res.status(200).json({ maintenaceRequestedByLandlord, maintenaceRequestedByTenants, maintenanceHistory })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getMaintenancesCounts = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const maintenanceStats = await MaintenanceService.getMaintenanceCounts(landlordId);

            return res.status(200).json({ maintenanceStats })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    deleteMaintenance = async (req: CustomRequest, res: Response) => {
        try {
            const { maintenanceId } = req.params;
            const maintenance = await MaintenanceService.deleteMaintenance(maintenanceId);
            if (!maintenance) return res.status(404).json({ message: "Maintenance request not found" })
            return res.status(200).json({ message: "Maintenance request deleted", maintenance })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

      // Landlord accepts a quote
  acceptQuote = asyncHandler(async (req: CustomRequest, res: Response) => {

    const landlordId = req.user.landlords.id;
    const { quoteId } = req.params;

    const quote = await quoteService.acceptQuote(quoteId, landlordId);

    return res.status(200).json({
      success: true,
      data: quote,
      message: 'Quote accepted successfully'
    });
  });

  // Landlord rejects a quote
  rejectQuote = asyncHandler(async (req: CustomRequest, res: Response) => {

    const landlordId = req.user.landlords.id;
    const { quoteId } = req.params;

    const quote = await quoteService.rejectQuote(quoteId, landlordId);
    return res.status(200).json(
      ApiResponse.success(
        quote,
        'Quote rejected'
      )
    );
  });
  createNote = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId, note, attachments } = req.body;
      const userId = req.user.id; 
    const newNote = await GeneralMaitnenanceservice.addNote(maintenanceId, userId, note, attachments);
    return res.status(200).json(
      ApiResponse.success(
        newNote,
        'note created'
      )
    );
  });
  getNotes = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    const notes = await GeneralMaitnenanceservice.getNotesByMaintenance(maintenanceId);
    return res.status(200).json(
      ApiResponse.success(
        notes,
        'notes retrieved'
      )
    );
  });
}


export default new MaintenanceControls()
