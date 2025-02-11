import { Request, Response } from "express";
import ErrorService from "../services/error.service";
import PropertyServices from "../services/propertyServices";
import MaintenanceServices from "../services/maintenance.service";
import PropertyViewingService from "../services/propertyviewing.service";
import { createPropertyViewingSchema, updatePropertyViewingSchema } from "../validations/schemas/properties.schema";
import { CustomRequest } from "../utils/types";


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
            const viewing = await PropertyViewingService.createViewing({...value, userId: req.user?.id});
            res.status(201).json({viewing});
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getAllPropsViewings = async (req: CustomRequest, res: Response) => {
        try {
            const {propertyId} = req.params;
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

    updateViewing = async (req: CustomRequest, res: Response) =>{
        try {
            const { id } = req.params;
            const { error } = updatePropertyViewingSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const updatedViewing = await PropertyViewingService.updateViewing(id, req.body);
            res.json({updatedViewing});
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