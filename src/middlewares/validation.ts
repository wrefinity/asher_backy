import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';

export const validateBody = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { value, error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map(d => ({
        field: d.context?.key,
        message: d.message.replace(/["]/g, '')
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details
      });
    }
    req.body = value;
    next();
  };
};
