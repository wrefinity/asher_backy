import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import TenantService from "../services/tenants.services"


class TenantController {
    constructor() { }

     getTenantById = async(req: CustomRequest, res: Response) =>{
        try {
            const { tenantId } = req.params;
            const tenant = await TenantService.getTenantWithUserAndProfile(tenantId)
            return res.status(200).json({tenant})
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new TenantController();