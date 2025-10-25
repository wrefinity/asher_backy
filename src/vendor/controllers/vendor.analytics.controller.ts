import { Response } from 'express';
import { CustomRequest } from '../../utils/types';
import serviceService from '../services/vendor.services';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';


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
}

export default new VendorAnalyticsController();