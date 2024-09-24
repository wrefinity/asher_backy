import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import MaintenanceService from "../services/maintenance.service"
import { maintenanceStatus } from '@prisma/client';
import { maintenanceWhitelistSchema, updateWhitelistSchema } from "../validations/schema/maintenance";

class MaintenanceControls {
    createWhitelist = async (req: CustomRequest, res: Response) => {
        try {
            const { error } = maintenanceWhitelistSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const landlordId = req.user.landlords?.id;
            if (!landlordId) return res.status(403).json({ error: "Unauthorized" });

            const newWhitelist = await MaintenanceService.createWhitelist(req.body, landlordId);
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
            return res.status(500).json({ error: err.message });
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
            return res.status(500).json({ error: err.message });
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
            errorService.handleError(error, res)
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
            errorService.handleError(error, res)
        }
    }


}


export default new MaintenanceControls()