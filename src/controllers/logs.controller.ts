import { Request, Response } from 'express';
import LogService from '../services/logs.services';
import PropertyServices from "../services/propertyServices";
import ErrorService from "../services/error.service";
import { CustomRequest } from '../utils/types';

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
      console.log(error)
      ErrorService.handleError(error, res)
    }
  }

  /** POST /api/logs — tenant viewing feedback (see logSchema validation). */
  createLog = async (req: CustomRequest, res: Response) => {
    try {
      const createdById = req.user?.id;
      const log = await LogService.createLog({ ...req.body, createdById });
      res.status(201).json({ log });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

}

export default new LogController();
