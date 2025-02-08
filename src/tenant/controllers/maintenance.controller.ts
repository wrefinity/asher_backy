import { Response } from "express"
import { CustomRequest } from "../../utils/types"
import MaintenanceService from "../../services/maintenance.service"
import ErrorService from "../../services/error.service";
import PropertyService from "../../services/propertyServices"


class MaintenanceControls {

    getMaintenances = async (req: CustomRequest, res: Response) => {
        try {
            const tenantId = req.user?.tenant?.id;
            if (!tenantId) return res.status(400).json({ message: "kindly log in as a tenant" })

            const property = await PropertyService.getPropertiesAttachedToTenants(tenantId);
            if (!property) return res.status(404).json({ message: "No property attached to this tenant" })
            const maintenances = await MaintenanceService.getPropertyTenantMaintenance(property.id, tenantId);

            return res.status(200).json({ maintenances})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    
}


export default new MaintenanceControls()