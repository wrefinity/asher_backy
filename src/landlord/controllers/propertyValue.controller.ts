import { Response } from "express";
import { CustomRequest } from "../../utils/types";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { asyncHandler } from "../../utils/asyncHandler";
import propertyValueService from "../../services/propertyValue.services";
import { prismaClient } from "../..";

class PropertyValueController {
  private async resolveLandlordId(req: CustomRequest): Promise<string | null> {
    if (req.user?.landlords?.id) return req.user.landlords.id;
    if (!req.user?.id) return null;
    const landlord = await prismaClient.landlords.findFirst({
      where: { userId: req.user.id },
    });
    return landlord?.id ?? null;
  }

  // Get property value analytics for landlord
  getPropertyValueAnalytics = asyncHandler(async (req: CustomRequest, res: Response) => {
    const landlordId = await this.resolveLandlordId(req);
    if (!landlordId) {
      return res.status(404).json(
        ApiError.badRequest('Landlord not found')
      );
    }
    const analytics = await propertyValueService.getPropertyValueAnalytics(landlordId);
    
    return res.status(200).json(
      ApiResponse.success(analytics, 'Property value analytics retrieved successfully')
    );
  });

  // Get property value by ID
  getPropertyValueById = asyncHandler(async (req: CustomRequest, res: Response) => {
    const landlordId = await this.resolveLandlordId(req);
    if (!landlordId) {
      return res.status(404).json(
        ApiError.badRequest('Landlord not found')
      );
    }
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
