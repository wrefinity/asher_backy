import { Request, Response } from 'express';
import ApplicantService from '../services/applicantService';
import { CustomRequest } from "../../utils/types";
import { 
  documentSchema,
  guarantorInformationSchema,
  residentialInformationSchema,
  employmentInformationSchema,
  applicantPersonalDetailsSchema,
  emergencyContactSchema } from '../schemas';

class ApplicantControls {

  completeApplication= async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.body;
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
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      } else {
        return res.status(500).json({ message: "An unknown error occurred" });
      }
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

      const guarantor = await ApplicantService.createOrUpdateGuarantor({ ...req.body, applicationId, userId });
      return res.status(201).json({ guarantor });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      } else {
        return res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  }
  createOrUpdateEmergencyContact = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const applicationId = req.params.applicationId;

      const { error } = emergencyContactSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const emergencyContact = await ApplicantService.createOrUpdateEmergencyContact({ ...req.body, applicationId, userId });
      return res.status(201).json({ emergencyContact });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      } else {
        return res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  }
  createApplicantionDocument = async (req: CustomRequest, res: Response) => {
    try {
      const { error } = documentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const userId = req.user.id;
      const applicationId = req.params.applicationId;
      const documentUrl = req.body.cloudinaryUrls;

      const emergencyContact = await ApplicantService.createOrUpdateApplicationDoc({ ...req.body, documentUrl, applicationId, userId });
      return res.status(201).json({ emergencyContact });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      } else {
        return res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  }

  createOrUpdateResidentialInformation = async (req: CustomRequest, res: Response) =>{
    try {
      const { error } = residentialInformationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const userId = req.user.id;
      const applicationId = req.params.applicationId;

      const data = req.body;
      const result = await ApplicantService.createOrUpdateResidentialInformation({...data, applicationId});
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
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
      // Call service method
      const employmentInformation = await ApplicantService.createOrUpdateEmploymentInformation({...data, applicationId});
      return res.status(200).json(employmentInformation);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };

  getApplication = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const application = await ApplicantService.getApplicationById(id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      return res.status(200).json({application});
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  deleteApplicant = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const applicant = await ApplicantService.deleteApplicant(id);
      return res.status(200).json(applicant);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      } else {
        return res.status(500).json({ message: "An unknown error occurred" });
      }
    }
  }
}

export default new ApplicantControls();
