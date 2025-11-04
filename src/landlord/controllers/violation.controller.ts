import { Response } from 'express';
import ViolationService from '../../services/violations';

import { CustomRequest } from '../../utils/types';
import propertyServices from '../../services/propertyServices';
import { ViolationSchema } from '../../validations/schemas/violations';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

class ViolationController {


  createViolation = asyncHandler(async (req: CustomRequest, res: Response) => {
 
    const {
      description,
      severityLevel,
      actionTaken,
      tenantId,
      noticeType,
      deliveryMethod,
      propertyId,
      unitId,
      dueDate,
    } = req.body;

    if (!description || !tenantId) {
      throw ApiError.badRequest("Description and tenantId are required");
    }

    const createdById = req.user?.id || req.body.createdById;
    if (!createdById) throw ApiError.badRequest("CreatedBy ID is required");

    const violation = await ViolationService.create({
      description,
      severityLevel,
      actionTaken,
      tenantId,
      noticeType,
      deliveryMethod,
      propertyId,
      unitId,
      createdById,
      dueDate,
    });

    return res.status(201).json(
      ApiResponse.success(violation, "Violation created successfully")
    );

  })
  deleteViolation = asyncHandler(async (req: CustomRequest, res: Response) => {
    const { id } = req.params;

    if (!id) return res.status(400).json(ApiError.badRequest("Violation ID is required"));

    const violation = await ViolationService.deleteViolation(id);

    if(!violation){
      return res.status(404).json(ApiError.notFound("Violation not found"));
    }
    return res.status(200).json(
      ApiResponse.success(violation, "Violation deleted successfully")
    );

  })


}

export default new ViolationController()