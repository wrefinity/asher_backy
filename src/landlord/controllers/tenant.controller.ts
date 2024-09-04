import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import TenantService from "../../tenant/services/tenants.services"


class TenantControls {

    getTenancies = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const tenants = await TenantService.getAllTenants(landlordId);
            res.status(200).json({ tenants });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getCurrentTenant = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        const currentTenants = await TenantService.getCurrenntTenantsForLandlord(landlordId);
        return res.status(200).json({ currentTenants });
    }
    getPreviousTenant = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        const previousTenants = await TenantService.getPreviousTenantsForLandlord(landlordId);
        return res.status(200).json({ previousTenants });
    }

}


export default new TenantControls()