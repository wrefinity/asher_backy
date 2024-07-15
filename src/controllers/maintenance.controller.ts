import { Request, Response, NextFunction } from 'express';
import MaintenanceService from '../services/maintenance.service';
import { maintenanceSchema } from '../schemas/maintenance.schema';
import ErrorService from "../services/error.service";


class MaintenanceController {
  private maintenanceService = new MaintenanceService();

  public getAllMaintenances = async (req: Request, res: Response) => {
    try {
        
      const maintenances = await this.maintenanceService.getAllMaintenances();
      res.status(200).json(maintenances);
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };

  public getMaintenanceById = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const maintenance = await this.maintenanceService.getMaintenanceById(id);
      if (maintenance) {
        res.status(200).json(maintenance);
      } else {
        res.status(404).json({ message: 'Maintenance not found' });
      }
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };

  public createMaintenance = async (req: Request, res: Response) => {
    try {
      const { error } = maintenanceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
      const maintenance = await this.maintenanceService.createMaintenance(req.body);
      res.status(201).json(maintenance);
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };

  public updateMaintenance = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { error } = maintenanceSchema.validate(req.body, { allowUnknown: true });
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
      const maintenance = await this.maintenanceService.updateMaintenance(id, req.body);
      res.status(200).json(maintenance);
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };

  public deleteMaintenance = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      await this.maintenanceService.deleteMaintenance(id);
      res.status(204).end();
    } catch (error) {
        ErrorService.handleError(error, res)
    }
  };
}

export default new MaintenanceController();
