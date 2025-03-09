import { Request, Response } from 'express';
import LogService from '../services/logs.services';
import PropertyServices from "../services/propertyServices";
import ErrorService from "../services/error.service";
import { CustomRequest } from '../utils/types';
import { logSchema, feedbackSchema } from '../validations/schemas/log';


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
      const { error, value } = logSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });
      const createdById = req.user?.id;
      const log = await LogService.createLog({ createdById, ...value });
      res.status(201).json({ log });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  createLogFeedback = async (req: CustomRequest, res: Response) => {
    try {
      const { error, value } = feedbackSchema.validate(req.body);
      const logId = req.params.logId
      if (error) return res.status(400).json({ error: error.details[0].message });
      const userId = req.user?.id;
      const logExist = await LogService.getLogsById(logId);
      if (logExist) {
        return res.status(404).json({ message: "log with the queried id not found" }); 
      }
      const logFeedBack = await LogService.createLog({ userId, logId, ...value });
      return res.status(201).json({ feedback: logFeedBack });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
}

export default new LogController();
