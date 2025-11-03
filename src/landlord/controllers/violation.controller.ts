import { Response } from 'express';
import ViolationService  from '../../services/violations';

import { CustomRequest } from '../../utils/types';
import propertyServices from '../../services/propertyServices';
import { ViolationSchema } from '../../validations/schemas/violations';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';

class ViolationController {


    createViolation = asyncHandler (async (req: CustomRequest, res: Response) => {
 

      const { error } = ViolationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
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


}

export default new ViolationController()