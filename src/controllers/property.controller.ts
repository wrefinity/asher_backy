import { Request, Response } from "express";
import ErrorService from "../services/error.service";
import PropertyServices from "../services/propertyServices";
import { prismaClient } from "..";
import { CustomRequest } from "../utils/types";


// TODO: create schema and iterface for the properties
class PropertyController {
    constructor() { }

    async createProperty(req: CustomRequest, res: Response) {
        const propertyData = req.body
        const landlordId = req.user?.landlords?.id;

        try {


            if (!landlordId) return res.status(404).json({ message: "Landlord not found"})
                
            const property = await PropertyServices.createProperty({...propertyData, landlordId})
            return res.status(201).json(property)
        } catch (error) {
            ErrorService.handleError(error, res)
        }

    }

    async getProperty(req: Request, res: Response) {
        try {
            const properties = await PropertyServices.getProperties()
            if (properties.length < 1) return res.status(200).json({message: "No Property listed yet"})
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    async getCurrentLandlordProperties(req: CustomRequest, res: Response) {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found"})
                
            const properties = await PropertyServices.aggregatePropertiesByState(landlordId);
            if (!properties) return res.status(200).json({message: "No Property listed yet"})
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
}

export default new PropertyController()