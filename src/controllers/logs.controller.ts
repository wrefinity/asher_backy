import { Request, Response } from 'express';
import LogService from '../services/logs.services';
import PropertyServices from "../services/propertyServices";
import ErrorService from "../services/error.service";
import { CustomRequest } from '../utils/types';
import { LoginSchema } from '../validations/schemas/auth';


class LogController {

  getProperyLog = async (req: Request, res: Response) => {
    try {
      const propertyId = req.params.propertyId;
      const property = await PropertyServices.getPropertyById(propertyId);
      if (!property) {
        return res.status(404).json({ message: 'Property not found' });
      }
      const logs = await LogService.getLogsByProperty(propertyId);
      return res.status(200).json({ logs });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  }

  createLog = async (req: CustomRequest, res: Response) => {
    try {
      const { error, value } = LoginSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });
      const createdById = req.user?.id;
      const log = await LogService.createLog({createdById, ...value});
      res.status(201).json({ log });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
}

export default new LogController();
