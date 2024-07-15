import { Request, Response, NextFunction } from 'express';
import StatusService from '../services/status.service';
import ErrorService from "../services/error.service";

class StatusController {
  private statusService = new StatusService();

  public getAllStatuses = async (req: Request, res: Response) => {
    try {
      const statuses = await this.statusService.getAllStatuses();
      res.status(200).json(statuses);
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };

  public getStatusById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const status = await this.statusService.getStatusById(id);
      if (status) {
        res.status(200).json(status);
      } else {
        res.status(404).json({ message: 'Status not found' });
      }
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };

  public createStatus = async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: "status name required"});
      }
      const status = await this.statusService.createStatus(name);
      res.status(201).json(status);
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };

  public updateStatus = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { name } = req.body
      if (!name) {
        return res.status(400).json({ message: "status name required" });
      }
      const status = await this.statusService.updateStatus(id, name);
      res.status(200).json(status);
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };

  public deleteStatus = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      await this.statusService.deleteStatus(id);
      res.status(204).end();
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };
}

export default new StatusController();
