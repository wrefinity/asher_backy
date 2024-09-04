import { Request, Response } from 'express';
import ApplicantService from '../services/applicantService';
import { CustomRequest } from "../../utils/types";
import {
  documentSchema,
  guarantorInformationSchema,
  residentialInformationSchema,
  employmentInformationSchema,
  applicantPersonalDetailsSchema,
  emergencyContactSchema
} from '../schemas';
import ErrorService from "../../services/error.service";

class ApplicantControls {

  completeApplication = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;

      if (!applicationId) {
        return res.status(400).json({ error: 'Application ID is required' });
      }
      const application = await ApplicantService.updateApplicationStatus(applicationId);
      res.status(200).json(application);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  createOrUpdateApplicantBioData = async (req: CustomRequest, res: Response) => {
    try {
      const userId = String(req.user.id);
      const propertiesId = req.params.propertiesId;

      const { error } = applicantPersonalDetailsSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const guarantor = await ApplicantService.createOrUpdatePersonalDetails({ ...req.body, userId }, propertiesId, userId);
      return res.status(201).json({ guarantor });
    } catch (error: unknown) {
      ErrorService.handleError(error, res)
    }
  }
  createOrUpdateGuarantor = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const applicationId = req.params.applicationId;

      const { error } = guarantorInformationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);

      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" }); 
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" }); 
      }

      const guarantor = await ApplicantService.createOrUpdateGuarantor({ ...req.body, applicationId});
      return res.status(201).json({ guarantor });
    } catch (error: unknown) {
      ErrorService.handleError(error, res)
    }
  }
  createOrUpdateEmergencyContact = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;
      
      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" }); 
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" }); 
      }
      const { error } = emergencyContactSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const emergencyContact = await ApplicantService.createOrUpdateEmergencyContact({ ...req.body, applicationId });
      return res.status(201).json({ emergencyContact });
    } catch (error: unknown) {
      ErrorService.handleError(error, res);
    }
  }
  createApplicantionDocument = async (req: CustomRequest, res: Response) => {
    try {
      const { error } = documentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const applicationId = req.params.applicationId;
      const documentUrl = req.body.cloudinaryUrls;
      const data = req.body;
      delete data['cloudinaryUrls']

      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" }); 
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" }); 
      }

      const document = await ApplicantService.createOrUpdateApplicationDoc({ ...data, documentUrl:documentUrl[0], applicationId });
      return res.status(201).json({ document });
    } catch (error: unknown) {
      ErrorService.handleError(error, res)
    }
  }

  createOrUpdateResidentialInformation = async (req: CustomRequest, res: Response) => {
    try {
      const { error } = residentialInformationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const applicationId = req.params.applicationId;
      const data = req.body;
      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" }); 
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" }); 
      }

      const result = await ApplicantService.createOrUpdateResidentialInformation({ ...data, applicationId });
      res.status(200).json(result);
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  }

  createOrUpdateEmploymentInformation = async (req: CustomRequest, res: Response) => {
    try {
      // Validate request body
      const { error } = employmentInformationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const applicationId = req.params.applicationId;
      const data = req.body;
      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" }); 
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" }); 
      }

      const employmentInformation = await ApplicantService.createOrUpdateEmploymentInformation({ ...data, applicationId });
      return res.status(200).json(employmentInformation);
    } catch (err) {
      ErrorService.handleError(err, res);
    }
  };


  getApplication = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const application = await ApplicantService.getApplicationById(id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      return res.status(200).json({ application });
    } catch (err) {
      ErrorService.handleError(err, res);
    }
  }

  deleteApplicant = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const applicant = await ApplicantService.deleteApplicant(id);
      return res.status(200).json({ applicant });
    } catch (error: unknown) {
      ErrorService.handleError(error, res);
    }
  }


}

export default new ApplicantControls();
