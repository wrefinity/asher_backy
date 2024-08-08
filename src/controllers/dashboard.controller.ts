import { Response } from "express";
import { CustomRequest } from "../utils/types";
import errorService from "../services/error.service";
import dashboardService from "../services/dashboard/dashboard.service";
class DashboardController {
    async getDashboardData(req: CustomRequest, res: Response) {
        const userId = String(req.user.id);

        try {
            const dashboard = await dashboardService.getDashboardData(userId);
            res.status(200).json(dashboard);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new DashboardController();