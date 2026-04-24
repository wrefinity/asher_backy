import { Response } from "express";
import errorService from "../../services/error.service";
import { CustomRequest } from "../../utils/types";

import { analyticsService } from "../services/landlord.analytics.service";

class BillController {
    constructor() { }

    getDashboardData = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords?.id;
            if (!landlordId) {
                return res.status(403).json({ success: false, message: 'Landlord context required' });
            }
            const timeframe = req.query.timeframe as string || '0-2 years';

            const analytics = await analyticsService.getDashboardAnalytics(landlordId, timeframe);

            res.json({
                success: true,
                data: analytics
            });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}

export default new BillController();
