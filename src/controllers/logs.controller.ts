import { Request, Response } from 'express';
import LogService from '../services/logs.services';
import PropertyServices from "../services/propertyServices";
import ErrorService from "../services/error.service";
import { CustomRequest } from '../utils/types';
import { logSchema } from '../validations/schemas/log';


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

  createLog = async (req: CustomRequest, res: Response) => {
    try {
      const value = req.body;
      // Additional check for response requirement
      if ((value.viewAgain || value.considerRenting) && !value.response) {
        return res.status(400).json({
          error: 'Response field is required when providing viewAgain or considerRenting'
        });
      }
      const createdById = req.user?.id;
      const log = await LogService.createLog({ ...value, createdById, });
      res.status(201).json({ log });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  autoLogTenantEnquire = async (req: CustomRequest, res: Response) => {
    try {
      const value = req.body;
      // Additional check for response requirement
      if ((value.viewAgain || value.considerRenting) && !value.response) {
        return res.status(400).json({
          error: 'Response field is required when providing viewAgain or considerRenting'
        });
      }
      const createdById = req.user?.id;
      const log = await LogService.createLog({ ...value, createdById, });
      res.status(201).json({ log });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

}

export default new LogController();
