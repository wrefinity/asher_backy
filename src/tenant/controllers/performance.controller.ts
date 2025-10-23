import { Response } from "express"
import { CustomRequest } from "../../utils/types"
import PerformanceCalculator from '../../services/PerformanceCalculator';
import errorService from "../../services/error.service"
import TenantService from "../../tenant/services/tenants.services"

class PerformanceController {
    constructor() { }


    getTenantPerformance = async (req: CustomRequest, res: Response) => {
        try {
       
            const tenantId = req.user.tenant?.id;
            const tenant = await TenantService.getTenantWithUserAndProfile(tenantId)

            const performance = await PerformanceCalculator.calculateOverallScore(
                tenant?.userId
            );
            return res.status(200).json({ performance });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

}

export default new PerformanceController();