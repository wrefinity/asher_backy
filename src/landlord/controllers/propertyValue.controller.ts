import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import propertyValueService from "../../services/propertyValue.services";

class PropertyValueController {
  // Get property value analytics for landlord
  getPropertyValueAnalytics = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user.landlords || !req.user.landlords.id) {
      return res.status(404).json(
        ApiError.badRequest('Landlord not found')
      );
    }

    const landlordId = req.user.landlords.id;
    const analytics = await propertyValueService.getPropertyValueAnalytics(landlordId);
    
    return res.status(200).json(
      ApiResponse.success(analytics, 'Property value analytics retrieved successfully')
    );
  });

  // Get property value by ID
  getPropertyValueById = asyncHandler(async (req: CustomRequest, res: Response) => {
    if (!req.user.landlords || !req.user.landlords.id) {
      return res.status(404).json(
        ApiError.badRequest('Landlord not found')
      );
    }

    const landlordId = req.user.landlords.id;
    const { propertyId } = req.params;

    const propertyValue = await propertyValueService.getPropertyValueById(landlordId, propertyId);
    
    if (!propertyValue) {
      return res.status(404).json(
        ApiError.notFound('Property not found')
      );
    }
    
    return res.status(200).json(
      ApiResponse.success(propertyValue, 'Property value retrieved successfully')
    );
  });
}

export default new PropertyValueController();
