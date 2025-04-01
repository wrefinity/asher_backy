import { LandlordReferenceFormCreateSchema } from "../validations/schemas/reference.schema";
import landlordReferenceService from "../services/externallandlord.service";
import ErrorService from "../services/error.service";
import applicantService from "../webuser/services/applicantService";
import { Request, Response } from "express";

class LandlordReferenceFormControls {
    createReferenceForm = async (req: Request, res: Response) => {
        try {
            // Get application ID from URL parameters
            const applicationId = req.params.id;
            
            // Validate application ID presence
            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in request parameters"]
                });
            }

            // Check application existence
            const application = await applicantService.getApplicationById(applicationId);
            if (!application) {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${applicationId} does not exist`]
                });
            }

            // Validate request body
            const { error, value } = LandlordReferenceFormCreateSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    error: "Validation Error",
                    details: error.details.map(d => d.message)
                });
            }

            // Combine validated data with application ID
            const formData = {
                ...value,
                applicationId: applicationId
            };

            // Create reference form
            const result = await landlordReferenceService.createLandlordReferenceForm(formData);
            
            res.status(201).json(result);
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
    getReferenceForm = async (req: Request, res: Response) => {
        try {
            // Get application ID from URL parameters
            const applicationId = req.params.id;
            
            // Validate application ID presence
            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in request parameters"]
                });
            }

            // Check application existence
            const application = await applicantService.getApplicationById(applicationId);
            if (!application) {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${applicationId} does not exist`]
                });
            }

         
            res.status(201).json({application});
        } catch (error) {
            ErrorService.handleError(error, res);
        }
    };
}

export default new LandlordReferenceFormControls();