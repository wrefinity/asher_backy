import { Response } from "express"

import { CustomRequest } from "../../utils/types"
import LandlordDashboardService from "../services/dashboard.services"

class DashboardControls {
 
    async getDashboardStats(req: CustomRequest, res: Response) {
        const landlordId = req.user.landlords.id;
        const filters = req.query;

        try {
            const stats = await LandlordDashboardService.getDashboardData(landlordId, filters);
            res.json({ success: true, data: stats });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

}


export default new DashboardControls()