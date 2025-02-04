import { Request, Response } from "express";
import ErrorService from "../services/error.service";
import PropertyServices from "../services/propertyServices";
import MaintenanceServices from "../services/maintenance.service";


class PropertyController {
    constructor() { }

    getProperty = async (req: Request, res: Response) => {
        try {
            const properties = await PropertyServices.getProperties()
            if (properties.length < 1) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropertyById = async (req: Request, res: Response) => {
        try {
            const propertyId = req.params.id;
            const property = await PropertyServices.getPropertyById(propertyId)
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropertyByState = async (req: Request, res: Response) => {
        try {
            const properties = await PropertyServices.getPropertiesByState()
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getListedProperties = async (req: Request, res: Response) => {
        try {
            const properties = await PropertyServices.getAllListedProperties()
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getPropsMaintenance = async (req: Request, res: Response) => {
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
    getVendorsServicesOnProps = async (req: Request, res: Response) => {
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

}

export default new PropertyController()