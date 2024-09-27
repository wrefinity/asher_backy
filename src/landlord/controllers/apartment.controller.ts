import { Response } from "express";
import ErrorService from "../../services/error.service";
import ApartmentServices from "../../services/apartment.services";
import { apartmentSchema } from "../../validations/schemas/apartment.schema";
import { CustomRequest } from "../../utils/types";


class AppartmentController {
    constructor() { }

    createApartment = async (req: CustomRequest, res: Response) =>{
        try {
            const { error, value } = apartmentSchema.validate(req.body);
            if (error) return res.status(400).send(error.details[0].message);
            // const propertyId = req.params.propertyId;

            const videourl = value?.videourl;
            const images = value?.cloudinaryUrls;

            delete value?.videourl;
            delete value?.cloudinaryUrls;
            delete value?.cloudinaryDocumentUrls;

            const property = await ApartmentServices.createApartment({
                ...value,
                sittingRoom: Number(value.sittingRoom),
                waitingRoom: Number(value.waitingRoom),
                bedrooms: Number(value.bedrooms),
                kitchen: Number(value.kitchen),
                bathrooms: Number(value.bathrooms),
                garages: Number(value.garages),
                offices: Number(value.offices),
                videourl,
                images
            })
            return res.status(201).json({property})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
   
    getAppartmentById = async (req: CustomRequest, res: Response) => {
        try {
            const apartmentId = req.params.apartmentId;
            const apartment = await ApartmentServices.getApartmentById(apartmentId)
            if (!apartment) return res.status(200).json({message: "No Appartment Found"})
            return res.status(200).json({apartment})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    getCurrentLandlordAppartments = async (req: CustomRequest, res: Response) =>{
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) return res.status(404).json({ message: "Landlord not found" })
            const appartments = await ApartmentServices.getApartmentsByLandlord(landlordId);
            if (!appartments) return res.status(200).json({ message: "No Property listed yet" })
            return res.status(200).json({appartments})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }

    updateApartment = async(req: CustomRequest, res: Response) => {
        try {
            const { error, value } = apartmentSchema.validate(req.body);
            if (error) return res.status(400).send(error.details[0].message);
            const appartmentId = req.params.appartmentId;

            const videourl = value?.videourl;
            const images = value?.cloudinaryUrls;

            delete value?.videourl;
            delete value?.cloudinaryUrls;

            const property = await ApartmentServices.updateApartment(appartmentId,{
                ...value,
                sittingRoom: Number(value.sittingRoom),
                waitingRoom: Number(value.waitingRoom),
                bedrooms: Number(value.bedrooms),
                kitchen: Number(value.kitchen),
                bathrooms: Number(value.bathrooms),
                garages: Number(value.garages),
                offices: Number(value.offices),
                videourl,
                images
            })
            return res.status(201).json({property})
        } catch (error) {
            ErrorService.handleError(error, res)
        }
    }
    deleteApartments = async(req:CustomRequest, res:Response) => {
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