// Controller
import { Request, Response } from 'express';
import {
  GuarantorAgreementCreateSchema,
} from '../validations/schemas/reference.schema';
import guarantorService from '../services/guarantor.services';
import applicantService from '../webuser/services/applicantService';
import ErrorService from '../services/error.service';

class GuarantorController {
    async createGuarantorAgreement(req: Request, res: Response) {
        try {
          const applicationId = req.params.id;
    
          // Validate application ID
          if (!applicationId) {
            return res.status(400).json({
              error: "Application ID is required",
              details: ["Missing application ID in URL parameters"]
            });
          }
    
          // Verify application exists
          const application = await applicantService.getApplicationById(applicationId);
          if (!application) {
            return res.status(404).json({
              error: "Application not found",
              details: [`Application with ID ${applicationId} does not exist`]
            });
          }
    
          // Validate request body
          const { error, value } = GuarantorAgreementCreateSchema.validate(req.body);
          if (error) {
            return res.status(400).json({
              error: "Validation Error",
              details: error.details.map(d => d.message)
            });
          }
          // const data = req.body;
          // const documents = data.cloudinaryDocumentUrls;
          // delete data.cloudinaryUrls;
          // delete data.cloudinaryVideoUrls;
          // delete data.cloudinaryDocumentUrls;
          // delete data.cloudinaryAudioUrls;
         
          // Create agreement with nested employment info
          const result = await guarantorService.createGuarantorAgreement({
            ...value,
            applicationId,
            employmentInfo: value.employmentInfo 
          });
    
          res.status(201).json(result);
        } catch (error) {
          ErrorService.handleError(error, res);
        }
      }
}

export default new GuarantorController();