import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import TenantsServices from "../services/tenants.services"


class ProfileController {
    constructor() { }


    getProfileData = async (req: CustomRequest, res: Response) => {
        try {
            const tenantId = req.params.tenantId;
            const tenant = await TenantsServices.getTenantByUserIdAndLandlordId(undefined, null, tenantId)
            return res.status(201).json({
                tenant
            });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

 
}

export default new ProfileController();