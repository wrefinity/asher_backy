import { Response } from "express"
import { CustomRequest } from "../../utils/types"
import MaintenanceService from "../services/maintenance.service"
import { maintenanceStatus, maintenanceDecisionStatus } from '@prisma/client';
import ErrorService from "../../services/error.service";
import CateoryService from "../../services/category.service"
import SubCateoryService from "../../services/subcategory.service"
import PropertyService from "../../services/propertyServices"
import { maintenanceWhitelistSchema, updateWhitelistSchema } from "../validations/schema/maintenance";

class MaintenanceControls {
    createWhitelist = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = maintenanceWhitelistSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ error: "Unauthorized" });

            const categoryExist =  await CateoryService.getCategoryById(value.categoryId)
            if (!categoryExist) return res.status(400).json({message:"category doesnt exist"})
            const subCategoryExist =  await SubCateoryService.getSubCategoryById(value.subcategoryId)
            if (!subCategoryExist) return res.status(400).json({message:"sub category doesnt exist"})
            const propertyExist =  await PropertyService.getPropertiesById(value.propertyId)
            if (!propertyExist) return res.status(400).json({message:"property doesnt exist"})

            const newWhitelist = await MaintenanceService.createWhitelist(value, landlordId);
            return res.status(201).json({ message: "Whitelist created successfully", data: newWhitelist });
        } catch (err) {
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

    // Update a maintenance whitelist entry
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
            const pendingMaintenace = await MaintenanceService.getLandlordPropertiesMaintenance(landlordId, maintenanceStatus.PENDING);
            const assignedMaintenace = await MaintenanceService.getLandlordPropertiesMaintenance(landlordId, maintenanceStatus.ASSIGNED);
            const completedMaintenace = await MaintenanceService.getLandlordPropertiesMaintenance(landlordId, maintenanceStatus.COMPLETED);

            return res.status(200).json({ pendingMaintenace, assignedMaintenace, completedMaintenace })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    declineMaintenaceRequest = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const maintenanceId = req.params.maintenanceId
            const maintenance = await MaintenanceService.changeLandlordPropertiesMaintenanceDecisionState(landlordId, maintenanceId, maintenanceDecisionStatus.DECLINED);
            return res.status(200).json({ maintenance})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    acceptMaintenaceRequest = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const maintenanceId = req.params.maintenanceId
            const maintenance = await MaintenanceService.changeLandlordPropertiesMaintenanceDecisionState(landlordId, maintenanceId, maintenanceDecisionStatus.APPROVED);
            return res.status(200).json({ maintenance})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    
    getMaintenances = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(400).json({ message: "kindly log in as a landlord" })
            const maintenaceRequestedByLandlord = await MaintenanceService.getRequestedMaintenanceByLandlord(landlordId);
            const maintenaceRequestedByTenants = await MaintenanceService.getRequestedMaintenanceByTenants(landlordId);
            const maintenanceHistory = await MaintenanceService.getLandlordPropertiesMaintenance(landlordId);

            return res.status(200).json({ maintenaceRequestedByLandlord, maintenaceRequestedByTenants, maintenanceHistory })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
}


export default new MaintenanceControls()