import { Response } from "express";
import ErrorService from "../../services/error.service";
import ApartmentServices from "../../services/apartment.services";
import { apartmentSchema } from "../../validations/schemas/apartment.schema";
import { CustomRequest } from "../../utils/types";


class AppartmentController {
    constructor() { }

    async createApartment(req: CustomRequest, res: Response) {
        try {
            const { error } = apartmentSchema.validate(req.body);
            if (error) return res.status(400).send(error.details[0].message);
            const propertyData = req.body
            const propertyId = req.params.propertyId;

            const property = await ApartmentServices.createApartment({
                ...propertyData,
                sittingRoom: Number(propertyData.sittingRoom),
                waitingRoom: Number(propertyData.waitingRoom),
                bedrooms: Number(propertyData.bedrooms),
                kitchen: Number(propertyData.kitchen),
                bathrooms: Number(propertyData.bathrooms),
                garages: Number(propertyData.garages),
                offices: Number(propertyData.offices),
                propertyId
            })
            return res.status(201).json(property)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    async getAppartments(req: CustomRequest, res: Response) {
        try {
            const propertyId = req.params.propertyId;
            const properties = await ApartmentServices.getApartments(propertyId)
            if (properties.length < 1) return res.status(200).json({message: "No Property listed yet"})
            return res.status(200).json(properties)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    async getAppartmentById(req: CustomRequest, res: Response) {
        try {
            const apartmentId = req.params.apartmentId;
            const apartment = await ApartmentServices.getApartmentById(apartmentId)
            if (!apartment) return res.status(200).json({message: "No Appartment Found"})
            return res.status(200).json(apartment)
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    deleteApartments = async(req:CustomRequest, res:Response) =>{
        try {
            const apartmentId = req.params.apartmentId;
            const apartment = await ApartmentServices.deleteApartment(apartmentId)
            if (!apartment) return res.status(404).json({ error: 'apartment not found' });
            res.status(200).json({ message: 'appartment deleted successfully' });
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

}

export default new AppartmentController()