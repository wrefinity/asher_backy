import { Request, Response, NextFunction } from 'express';
import maintenanceService from '../services/maintenance.service';
import { maintenanceSchema } from '../validations/schemas/maintenance.schema';
import ServiceServices from "../vendor/services/vendor.services"
import ErrorService from "../services/error.service";
import { CustomRequest } from '../utils/types';
import { maintenanceStatus, vendorAvailability } from '@prisma/client';

class MaintenanceController {

  public getAllMaintenances = async (req: Request, res: Response) => {
    try {
      const maintenances = await maintenanceService.getAllMaintenances();
      res.status(200).json({maintenances});
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
  public getVendorRelatedJobs = async (req: CustomRequest, res: Response) => {
    try {
      const vendorId = req.user.id;
      const vendorService = await ServiceServices.getVendorService(vendorId);
      res.status(200).json({services: vendorService});
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public getMaintenanceById = async (req: CustomRequest, res: Response) => {
    try {
      const id = req.params.id;
      const maintenance = await maintenanceService.getMaintenanceById(id);
      if (maintenance) {
        res.status(200).json(maintenance);
      } else {
        res.status(404).json({ message: 'Maintenance not found' });
      }
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public createMaintenance = async (req: CustomRequest, res: Response) => {
    try {
      const { error, value } = maintenanceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }

      const userId = req.user.id;
     
      const { cloudinaryUrls, cloudinaryDocumentUrls, cloudinaryVideoUrls, ...data } = value;
      const maintenance = await maintenanceService.createMaintenance({
        ...data,
        attachments: cloudinaryUrls,
        userId,
      });
      res.status(201).json({maintenance});
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public updateMaintenance = async (req: CustomRequest, res: Response) => {
    try {
      const id = req.params.id;
      const { error } = maintenanceSchema.validate(req.body, { allowUnknown: true });
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
      const maintenanceExits = await maintenanceService.getMaintenanceById(id);
      if (!maintenanceExits) {
        res.status(404).json({ message: `maintenance with id: ${id} doesnt exist` });
      }

      const maintenance = await maintenanceService.updateMaintenance(id, req.body);
      return res.status(200).json({maintenance});
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public acceptMaintenanceOffer = async (req: CustomRequest, res: Response) => {
    try {
      const maintenanceId = req.params.maintenanceId;
      const vendorId = req.user.id;

      const maintenanceRequest = await maintenanceService.getMaintenanceById(maintenanceId);
      if (!maintenanceRequest) {
        res.status(404).json({ message: `maintenance with id: ${maintenanceId} doesnt exist` });
      }

      if (maintenanceRequest?.vendorId !== null) {
        return res.status(400).json({ message: "job already assigned to a vendor" });
      }

      const vendorService = await ServiceServices.getSpecificVendorService(vendorId, maintenanceRequest.categoryId);
      if (vendorService && vendorService.currentJobs > 1) {
        return res.status(400).json({ message: "job level exceeded" });
      }

      await maintenanceService.updateMaintenance(
        maintenanceId,
        { 
          vendorId, 
          status: maintenanceStatus.ASSIGNED,
          serviceId: vendorService.id,
          availability: vendorService.currentJobs > 1? vendorAvailability.NO : vendorAvailability.YES 
        }
      );

      // increment job current count for vendor
      await ServiceServices.incrementJobCount(vendorService.id, vendorId);

      return res.status(201).json({ message: "maintenance offer accepted" });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  }
  public updateMaintenanceToCompleted = async (req: CustomRequest, res: Response) => {
    try {
      const maintenanceId = req.params.maintenanceId;
      const vendorId = req.user.id;

      const maintenanceExits = await maintenanceService.getMaintenanceById(maintenanceId);
      if (!maintenanceExits) {
        return res.status(404).json({ message: `maintenance with id: ${maintenanceId} doesnt exist` });
      }

      const maintenance = await maintenanceService.updateMaintenance(maintenanceId, { status: maintenanceStatus.COMPLETED });
      
      // decrement job current count for vendor
      await ServiceServices.decrementJobCount(maintenance.serviceId, vendorId);
      
      await ServiceServices.updateService(maintenance.serviceId, {availability:vendorAvailability.YES});

      return res.status(201).json({ message: `maintenance status updated: ${maintenanceStatus.COMPLETED}`, maintenance });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
  public deleteMaintenance = async (req: CustomRequest, res: Response) => {
    try {
      const id = req.params.id;
      const maintenanceExits = await maintenanceService.getMaintenanceById(id);
      if (!maintenanceExits) {
        res.status(404).json({ message: `maintenance with id: ${id} doesnt exist` });
      }

      await maintenanceService.deleteMaintenance(id);
      return res.status(204).end();
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

}

export default new MaintenanceController();
