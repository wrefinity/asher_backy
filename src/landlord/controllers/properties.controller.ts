import { Response } from "express";
import ErrorService from "../../services/error.service";
import PropertyServices from "../../services/propertyServices";
import { createPropertySchema } from "../../validations/schemas/properties.schema"
import { CustomRequest } from "../../utils/types";
import propertyPerformance from "../services/property-performance";


class PropertyController {
    constructor() { }

    createProperty = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        try {
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login' });
            }
            const { error, value } = createPropertySchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            const images = value.cloudinaryUrls;
            const videourl = value.cloudinaryVideoUrls;
            delete value['cloudinaryUrls']
            delete value['cloudinaryVideoUrls']
            delete value['cloudinaryDocumentUrls']

            const rentalFee = value.rentalFee || 0;
            // const lateFee = rentalFee * 0.01;

            const property = await PropertyServices.createProperty({ ...value, images, videourl, landlordId })
            return res.status(201).json({property})
        } catch (error) {
            console.log(error)
            ErrorService.handleError(error, res)
        }

    }

    showCaseRentals = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })

            const propertyId = req.params.propertyId;
            const property = await PropertyServices.showCaseRentals(propertyId, landlordId);
            if (!property) return res.status(200).json({ message: "No Property found" })
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    getShowCasedRentals = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })

            const property = await PropertyServices.getShowCasedRentals(landlordId);
            if (!property) return res.status(200).json({ message: "No Property found" })
            return res.status(200).json({ property })
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getCurrentLandlordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const properties = await PropertyServices.aggregatePropertiesByState(landlordId);
            if (!properties) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    deleteLandlordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const propertiesId = req.params.propertyId;
            const propertyExist = await PropertyServices.checkLandlordPropertyExist(landlordId, propertiesId);
            if (!propertyExist) return res.status(404).json({ message: "property does not exists" })
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const properties = await PropertyServices.deleteProperty(landlordId, propertiesId);
            if (!properties) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    async getPropertyPerformance(req: CustomRequest, res: Response) {
        const { entityId } = req.params;
        const { isApartment } = req.body
        if (!entityId) return res.status(400).json({ message: 'No propertyId provided' })
        try {
            const performance = await propertyPerformance.generateReport(entityId, isApartment);
            res.status(200).json(performance);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }
    async getPropertyExpenses(req: CustomRequest, res: Response) {
        const { landlords } = req.user
        const landlordId = landlords.id
        const { propertyId } = req.params;
        if (!propertyId) return res.status(400).json({ message: 'No propertyId provided' })
        try {
            const expenses = await PropertyServices.getPropertyExpenses(landlordId, propertyId);
            res.status(200).json(expenses);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

    async getRentVSExpense(req: CustomRequest, res: Response) {
        const { entityId } = req.params;
        const { isApartment, startDate, endDate } = req.body
        if (!entityId) return res.status(400).json({ message: 'No propertyId provided' })
        try {
            const rentVsExpense = await propertyPerformance.getRentVSExpenseMonthlyData(entityId, isApartment, startDate, endDate);
            res.status(200).json(rentVsExpense);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    }

}

export default new PropertyController()