import { Request, Response } from "express";
import ErrorService from "../services/error.service";
import PropertyServices from "../services/propertyServices";



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
}

export default new PropertyController()