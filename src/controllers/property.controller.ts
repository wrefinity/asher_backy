import { Response } from "express";
import ErrorService from "../services/error.service";
import PropertyServices from "../services/propertyServices";
import MaintenanceServices from "../services/maintenance.service";
import PropertyViewingService from "../services/propertyviewing.service";
import { createPropertyViewingSchema, updatePropertyViewingSchema } from "../validations/schemas/properties.schema";
import { CustomRequest } from "../utils/types";
import LogsServices from "../services/logs.services";
import { LogType } from ".prisma/client";


class PropertyController {
    constructor() { }

    getProperty = async (req: CustomRequest, res: Response) => {
        try {
            const properties = await PropertyServices.getProperties()
            if (properties.length < 1) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    createLikeProperty = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId
            const userId = req.user?.id;

            // Check if the property exists
            const propertyExists = await PropertyServices.getPropertyById(propertyId);

            if (!propertyExists) {
                throw new Error(`Property with ID ${propertyId} does not exist.`);
            }

            // check if the user already liked the props 
            const liked = await PropertyServices.getLikeHistory(userId, propertyId)

            if (liked) {
                return res.status(400).json({ message: "property alread liked by the current user" })
            }

            const likedProps = await PropertyServices.createLikeHistory(userId, propertyId)
            return res.status(200).json({ likedProps })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getLikePropertyHistories = async (req: CustomRequest, res: Response) => {
        try {

            const userId = req.user?.id;
            const likedProps = await PropertyServices.getLikeHistories(userId)
            return res.status(200).json(likedProps)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    viewProperty = async (req: CustomRequest, res: Response) => {
        try {
            const createdById = req.user?.id;
            const propertyId = req.params.propertyId;
            // check props existence
            const property = await PropertyServices.getPropertyById(propertyId)

            if (!property) return res.status(400).json({ message: "property with the id given doesnt exist" });
            // check if propertyId have been viewed before by the user 
            const logcreated = await LogsServices.checkPropertyLogs(
                createdById,
                LogType.VIEW,
                propertyId
            )
            if (logcreated) res.status(200).json({ message: "property viewed have been logged already" });

            const log = await LogsServices.createLog({
                propertyId,
                events: "Property Viewing",
                createdById,
                type: LogType.VIEW
            })
            return res.status(200).json(log)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropertyById = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.id;
            const property = await PropertyServices.getPropertyById(propertyId)
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropertyByState = async (req: CustomRequest, res: Response) => {
        try {
            const properties = await PropertyServices.getPropertiesByState()
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getListedProperties = async (req: CustomRequest, res: Response) => {
        try {
            const properties = await PropertyServices.getAllListedProperties()
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropsMaintenance = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
            const properties = await MaintenanceServices.getPropertyMaintenance(propertyId)
            return res.status(200).json({ properties })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getVendorsServicesOnProps = async (req: CustomRequest, res: Response) => {
        try {
            const propertyId = req.params.propertyId;
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
            const vendors = await MaintenanceServices.getVendorsForPropertyMaintenance(propertyId)
            return res.status(200).json({ vendors })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    createViewing = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = createPropertyViewingSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const property = await PropertyServices.getPropertyById(value.propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
            const viewing = await PropertyViewingService.createViewing({ ...value, userId: req.user?.id });
            res.status(201).json({ viewing });
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getAllPropsViewings = async (req: CustomRequest, res: Response) => {
        try {
            const { propertyId } = req.params;
            const property = await PropertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
            const viewings = await PropertyViewingService.getAllPropertyViewing(propertyId);
            res.json(viewings);
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getViewingById = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const viewing = await PropertyViewingService.getViewingById(id);
            if (!viewing) return res.status(404).json({ error: "Property viewing not found" });

            res.json(viewing);
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    updateViewing = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { error } = updatePropertyViewingSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const updatedViewing = await PropertyViewingService.updateViewing(id, req.body);
            res.json({ updatedViewing });
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    deleteViewing = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            await PropertyViewingService.deleteViewing(id);
            res.json({ message: "Property viewing deleted successfully" });
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

}

export default new PropertyController()