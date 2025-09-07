import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { ApiError } from '../utils/ApiError';
import { CustomRequest } from '../utils/types';

export const validateBody = (schema: Schema) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    const { value, error } = schema.validate(req.body, { 
      abortEarly: false, 
      stripUnknown: true 
    });
    
    if (error) {
      // Extract error messages and details
      const errorMessages = error.details.map(d => 
        d.message.replace(/["]/g, '')
      );
      
      const details = error.details.map(d => ({
        field: d.context?.key,
        message: d.message.replace(/["]/g, ''),
        type: d.type
      }));

      // Throw ApiError instead of sending response directly
      throw ApiError.validationError(errorMessages, { validationDetails: details });
    }
    
    req.body = value;
    next();
  };
};
