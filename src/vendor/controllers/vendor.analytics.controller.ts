import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import serviceService from '../services/vendor.services';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import vendorServices from '../services/vendor.services';
import { addDays, eachDayOfInterval, formatISO, startOfDay, endOfDay } from "date-fns";


class VendorAnalyticsController {

    getVendorOverview = asyncHandler(async (req: CustomRequest, res: Response) => {
        const vendorId = req.user?.vendors?.id;

        if (!vendorId) {
            throw ApiError.badRequest("Vendor context missing or unauthorized");
        }

        const analytics = await serviceService.getVendorAnalytics(vendorId);

        return res.status(200).json(
            ApiResponse.success(analytics, "Vendor analytics retrieved successfully")
        );
    });


 getVendorGraphs = asyncHandler(async (req: CustomRequest, res: Response) => {
     const vendorId = req.user?.vendors?.id;

     const end = req.query.end ? new Date(req.query.end as string) : new Date();
     const start = req.query.start ? new Date(req.query.start as string) : addDays(end, -8);

     if (!vendorId) {
         return res.status(401).json( 
          ApiError.unauthorized("Vendor context missing or unauthorized")
        )
     }

     const analytics = await vendorServices.vendorGraph(vendorId, end, start);

     return res.status(200).json(
         ApiResponse.success(analytics, "Vendor analytics retrieved successfully")
     );
 });


}

export default new VendorAnalyticsController();