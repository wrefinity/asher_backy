import { Request, Response } from 'express';
import maintenanceService from '../services/maintenance.service';
import propertyService from '../services/propertyServices';
import { maintenanceSchema, rescheduleMaintenanceSchema, checkWhitelistedSchema, maintenanceChatSchema, maintenanceCancelSchema } from '../validations/schemas/maintenance.schema';
import ServiceServices from "../vendor/services/vendor.services"
import ErrorService from "../services/error.service";
import { CustomRequest } from '../utils/types';
import { maintenanceStatus, maintenanceDecisionStatus, TransactionStatus, vendorAvailability } from '@prisma/client';

class MaintenanceController {

  public getAllMaintenances = async (req: Request, res: Response) => {
    try {
      const maintenances = await maintenanceService.getAllMaintenances();
      res.status(200).json({ maintenances });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
  public getVendorRelatedJobs = async (req: CustomRequest, res: Response) => {
    try {
      const vendorId = req.user.id;
      const vendorService = await ServiceServices.getVendorService(vendorId);
      res.status(200).json({ services: vendorService });
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
  public scheduleMaintenanceDate = async (req: CustomRequest, res: Response) => {
    try {

      const maintenanceId = req.params.maintenanceId;
      const maintenance = await maintenanceService.getMaintenanceById(maintenanceId);
      if (!maintenance){
        res.status(404).json({ message: 'Maintenance not found' });
      }
      const { error, value } = rescheduleMaintenanceSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const updatedMaintenance = await maintenanceService.updateMaintenance(maintenanceId,  value)
      return res.status(200).json({ message: 'Maintenance scheduled successfully', updatedMaintenance });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
  // tenancy function to check if a property maintenance is whitelisted
  public checkIfMaintenanceWhitelisted = async (req: CustomRequest, res: Response) => {
    try {
      const { error, value } = checkWhitelistedSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
      const tenantId = req.user?.tenant?.id;
      if (!tenantId) {
        return res.status(400).json({ message: "Please log in as either a tenant or a landlord." });
      }

      const checkPropertyExist = await propertyService.getPropertiesById(value.propertyId)
      if (checkPropertyExist) return res.status(400).json({ message: "propery doesnt exist" })

      const isWhitelisted = await maintenanceService.checkWhitelist(
        checkPropertyExist?.landlordId,
        value.categoryId,
        value.subcategoryId,
        value.propertyId,
        value.apartmentId
      );
      return res.status(200).json({
        isWhitelisted
      })
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public requestMaintenanceCancellation = async (req: CustomRequest, res: Response) => {
    const maintenanceId = req.params.maintenanceId;
    const maintenance = await maintenanceService.getMaintenanceById(maintenanceId);
    const tenantId = req.user.tenant?.id;


    const { error, value } = maintenanceCancelSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Only the assigned tenant can initiate the cancellation request
    if (maintenance.tenantId !== tenantId) {
      throw new Error("Unauthorized: Only the assigned tenant can request cancellation.");
    }
    // Update the maintenance record with cancellation flag and reason
    await maintenanceService.updateMaintenance(maintenanceId, {
      flagCancellation: true,
      cancelReason: value.reason,
      status: maintenanceStatus.CANCELLATION_REQUEST
    });
  }
  public confirmCancellationByVendor = async (req: CustomRequest, res: Response) => {
    const maintenanceId = req.params.maintenanceId;
    const maintenance = await maintenanceService.getMaintenanceById(maintenanceId);;

    const vendorId = req.user.vendors?.id;
    // Ensure the vendor providing consent is the assigned vendor
    if (maintenance.vendorId !== vendorId) {
      throw new Error("Unauthorized: Only the assigned vendor can consent to cancellation.");
    }
    // Update the maintenance record to reflect vendor consent
    await maintenanceService.updateMaintenance(maintenanceId, {
      vendorConsentCancellation: true,
      status: maintenanceStatus.CANCEL,
    });
  }
  public rescheduleMaintenanceController = async (req: CustomRequest, res: Response) => {
    try {
      const maintenanceId = req.params.maintenanceId;
      const { error, value } = rescheduleMaintenanceSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });
      const result = await maintenanceService.rescheduleMaintenance({ ...value, maintenanceId });
      return res.status(200).json({ message: 'Maintenance rescheduled successfully', result });
    } catch (err) {
      ErrorService.handleError(err, res);
    }
  }
  public createMaintenance = async (req: CustomRequest, res: Response) => {
    try {
      const { error, value } = maintenanceSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
      const tenantId = req.user.tenant?.id;
      const landlordId = req.user.landlords?.id;

      if (!tenantId && !landlordId) {
        return res.status(400).json({ message: "Please log in as either a tenant or a landlord." });
      }
      // checking if the maitenance category is whitelisted by the landlord
      const isWhitelisted = await maintenanceService.checkWhitelist(
        landlordId,
        value.categoryId,
        value.subcategoryId,
        value.propertyId,
        value.apartmentId
      );
      // Determine if maintenance should be handled by the landlord
      const handleByLandlord = !!landlordId || isWhitelisted;

      // const { cloudinaryUrls, cloudinaryDocumentUrls, cloudinaryVideoUrls, ...data } = value;
      const property = await propertyService.getPropertyById(value?.propertyId);
      if (!property) {
          return res.status(404).json({ message: 'Property not found' });
      }
      const maintenance = await maintenanceService.createMaintenance({
        ...value,
        handleByLandlord,
        landlordDecision: handleByLandlord ? maintenanceDecisionStatus.PENDING : '',
        // attachments: cloudinaryUrls,
        tenantId: tenantId || undefined,
        landlordId: landlordId || undefined
      });

      if (isWhitelisted && !landlordId) return res.status(200).json({
        message: "request created and will be handled by landlord",
        maintenance
      })

      return res.status(201).json({ maintenance, message: " maintenance request created" });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  createMaintenanceChat = async (req: CustomRequest, res: Response) => {
    const { maintenanceId } = req.params;
    // Fetch the maintenance request details
    const { error, value } = maintenanceChatSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const maintenance = await maintenanceService.getMaintenanceById(maintenanceId);
    const senderId = req.user.id;
    if (!maintenance) {
      return res.status(200).json({ message: "Maintenance request not found." });
    }
    const chats = await maintenanceService.createMaintenanceChat(maintenanceId, senderId, value.receiverId, value.message)
    return res.status(201).json({ chats });
  }
  getMaintenanceChat = async (req: CustomRequest, res: Response) => {
    try {
      const { maintenanceId } = req.params;
      const maintenance = await maintenanceService.getMaintenanceById(maintenanceId);
      if (!maintenance) {
        return res.status(200).json({ message: "Maintenance request not found." });
      }
      const chats = await maintenanceService.getMaintenanceChat(maintenanceId);
      return res.status(201).json({ chats });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  }

  public updateMaintenance = async (req: CustomRequest, res: Response) => {
    try {
      const id = req.params.id;
      const { error } = maintenanceSchema.validate(req.body, { allowUnknown: true });
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
      const maintenanceExits = await maintenanceService.getMaintenanceById(id);
      if (!maintenanceExits) {
        return res.status(404).json({ message: `maintenance with id: ${id} doesnt exist` });
      }

      const maintenance = await maintenanceService.updateMaintenance(id, req.body);
      return res.status(200).json({ maintenance });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  public cancelMaintenance = async (req: CustomRequest, res: Response) => {
    try {
      const id = req.params.id;
      const { error } = maintenanceSchema.validate(req.body, { allowUnknown: true });
      if (error) {
        return res.status(400).json({ message: error.details[0].message });
      }
      const maintenanceExits = await maintenanceService.getMaintenanceById(id);
      if (!maintenanceExits) {
        return res.status(404).json({ message: `maintenance with id: ${id} doesnt exist` });
      }

      const maintenance = await maintenanceService.updateMaintenance(id, req.body);
      return res.status(200).json({ maintenance });
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
          availability: vendorService.currentJobs > 1 ? vendorAvailability.NO : vendorAvailability.YES
        }
      );

      // increment job current count for vendor
      await ServiceServices.incrementJobCount(vendorService.id, vendorId);

      return res.status(201).json({ message: "maintenance offer accepted" });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  }
  // this function is for vendor to update payment to completed
  public updateMaintenanceToCompleted = async (req: CustomRequest, res: Response) => {
    try {
      const maintenanceId = req.params.maintenanceId;
      const vendorId = req.user.id;

      const maintenanceExits = await maintenanceService.getMaintenanceById(maintenanceId);
      if (!maintenanceExits) {
        return res.status(404).json({ message: `maintenance with id: ${maintenanceId} doesnt exist` });
      }

      //check if payment has beeen completed
      if (maintenanceExits.paymentStatus !== TransactionStatus.COMPLETED) {
        return res.status(400).json({ message: `Payment has not been completed yet` });
      }

      const maintenance = await maintenanceService.updateMaintenance(maintenanceId, { status: maintenanceStatus.COMPLETED });

      // decrement job current count for vendor
      await ServiceServices.decrementJobCount(maintenance.serviceId, vendorId);

      await ServiceServices.updateService(maintenance.serviceId, { availability: vendorAvailability.YES });

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

  public payForMaintenance = async (req: CustomRequest, res: Response) => {
    try {
      const maintenanceId = req.params.id;
      const { amount, vendorId, currency } = req.body;
      const { landlords } = req.user
      const userId = landlords.id;

      const maintenance = await maintenanceService.getMaintenanceById(maintenanceId);
      if (!maintenance) {
        return res.status(404).json({ message: `Maintenance with id: ${maintenanceId} does not exist` });
      }

      if (maintenance.paymentStatus !== TransactionStatus.PENDING) {
        return res.status(400).json({ message: `Payment has already been processed` });
      }

      const updatedMaintenance = await maintenanceService.processPayment(maintenanceId, amount, userId, vendorId, currency);

      return res.status(200).json({ message: `Payment processed successfully`, updatedMaintenance });
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  }

}

export default new MaintenanceController();
