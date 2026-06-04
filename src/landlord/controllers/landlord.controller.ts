import { Request, Response } from 'express';
import { userRoles } from "@prisma/client";
import { LandlordService } from '../services/landlord.service';
import { UpdateLandlordDTO } from '../../validations/interfaces/auth.interface';
import { CustomRequest } from '../../utils/types';
import UserServices from '../../services/user.services';

class LandlordController {
    private landlordService: LandlordService;

    constructor() {
        this.landlordService = new LandlordService();
    }

    // Update an existing landlord
    updateLandlord = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const data: UpdateLandlordDTO = req.body;
            const landlord = await this.landlordService.updateLandlord(landlordId, data);
            return res.status(200).json(landlord);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    updateLandlordProfile = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const landlord = await UserServices.updateLandlordOrTenantOrVendorInfo(req.body, landlordId, userRoles.LANDLORD);
            return res.status(200).json(landlord);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    getLandlordInfo = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const landlord = await this.landlordService.getLandlordById(landlordId);
            return res.status(200).json(landlord);
        } catch (err) {
            console.log(err)
            return res.status(500).json({ error: err.message });
        }
    }

    submitIdentityVerification = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(401).json({ success: false, message: 'Landlord not found' });
            }
            const documentUrls = Array.isArray(req.body?.documentUrls)
                ? req.body.documentUrls.filter((url: unknown) => typeof url === 'string' && url.trim())
                : req.body?.cloudinaryUrls?.filter((url: unknown) => typeof url === 'string') ?? [];

            if (documentUrls.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'At least one identity document URL is required',
                });
            }

            const { submitLandlordIdentityDocuments } = await import('../../services/landlordIdentity.service');
            const identity = await submitLandlordIdentityDocuments(landlordId, documentUrls);

            return res.status(200).json({
                success: true,
                message: 'Identity documents submitted for admin review',
                data: identity,
            });
        } catch (err: any) {
            const status = err?.statusCode ?? 500;
            return res.status(status).json({ success: false, message: err.message });
        }
    }

    skipIdentityVerification = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(401).json({ success: false, message: 'Landlord not found' });
            }

            const { skipLandlordIdentityVerification } = await import('../../services/landlordIdentity.service');
            const identity = await skipLandlordIdentityVerification(landlordId);

            return res.status(200).json({
                success: true,
                message: 'Identity verification skipped. Leasing and application flows remain locked until you verify.',
                data: identity,
            });
        } catch (err: any) {
            const status = err?.statusCode ?? 500;
            return res.status(status).json({ success: false, message: err.message });
        }
    }

    // Delete a landlord
    deleteLandlord = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.params.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly supply the landlord id' });
            }
            await this.landlordService.deleteLandlord(landlordId);
            return res.status(204).send();
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // Get all landlords
    getAllLandlords = async (req: Request, res: Response) => {
        try {
            const landlords = await this.landlordService.getAllLandlords();
            return res.status(200).json(landlords);
        } catch (err) {
            console.log(err)
            return res.status(500).json({ error: err.message });
        }
    }

    // Get a single landlord by ID
    getLandlordUsingId = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.params.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly supply the landlordId' });
            }
            const landlord = await this.landlordService.getLandlordById(landlordId);
            if (!landlord) {
                return res.status(404).json({ error: 'Landlord not found' });
            }
            return res.status(200).json(landlord);
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // get jobs completed for a landlord properties
    getCompletedVendorsJobsForLandordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord' });
            }
            const maintenances = await this.landlordService.getCompletedJobsLandlord(landlordId);
            return res.status(200).json({ maintenances });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    // get jobs completed for a landlord properties
    getCurrentJobsForLandordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login' });
            }
            const maintenances = await this.landlordService.getCurrentVendorsByLandlord(landlordId);
            return res.status(200).json({ maintenances });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // Current locations
    getCurrentLocations = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord to get your locations' });
            }
            const locations = await this.landlordService.getLandlordLocations(landlordId);
            return res.status(200).json({ locations });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

    // Get Landlord Properties
    getLandlordProperties = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            if (!landlordId) {
                return res.status(404).json({ error: 'kindly login as landlord to get your properties' });
            }
            const properties = await this.landlordService.getLandlordProperties(landlordId);
            return res.status(200).json({ properties });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
}


export default new LandlordController()