import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import storageAnalyticsService from "../../services/storageAnalytics.services";

class StorageAnalyticsController {
  // Get storage analytics for landlord
  getStorageAnalytics = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user.landlords || !req.user.landlords.id) {
      return res.status(404).json(
        ApiError.badRequest('Landlord not found')
      );
    }

    const landlordId = req.user.landlords.id;
    const analytics = await storageAnalyticsService.getStorageAnalytics(landlordId);
    
    return res.status(200).json(
      ApiResponse.success(analytics, 'Storage analytics retrieved successfully')
    );
  });
}

export default new StorageAnalyticsController();
