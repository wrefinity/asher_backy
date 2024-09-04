import { Request, Response } from "express";
import ErrorService from "../services/error.service";
import PropertyServices from "../services/propertyServices";

class PropertyController {
    constructor() { }

    async getProperty(req: Request, res: Response) {
        try {
            const properties = await PropertyServices.getProperties()
            if (properties.length < 1) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    async getPropertyByState(req: Request, res: Response) {
        try {
            const properties = await PropertyServices.getPropertiesByState()
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
}

export default new PropertyController()