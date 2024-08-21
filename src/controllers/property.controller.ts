import { Request, Response } from "express";
import ErrorService from "../services/error.service";
import PropertyServices from "../services/propertyServices";
import {createPropertySchema} from "../validations/schemas/properties.schema"
import { CustomRequest } from "../utils/types";


// TODO: create schema and iterface for the properties
class PropertyController {
    constructor() { }

    async createProperty(req: CustomRequest, res: Response) {
        const landlordId = req.user?.landlords?.id;

        try {
            console.log(req.user, "testing")
            const { error, value } = createPropertySchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const images = value.cloudinaryUrls;
            const videourl = value.cloudinaryVideoUrls;
            delete value['cloudinaryUrls']
            delete value['cloudinaryVideoUrls']
          
            if (!landlordId) return res.status(404).json({ message: "Landlord not found"})
            const property = await PropertyServices.createProperty({...value, images, videourl, landlordId})
            return res.status(201).json(property)
        } catch (error) {
            console.log(error)
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