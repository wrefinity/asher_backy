import { Request, Response } from 'express';
import ApplicantService from '../services/applicantService';
import PropertyServices from '../../services/propertyServices';
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
import { ApplicationStatus, PropsSettingType } from '@prisma/client';

class ApplicantControls {

  getPendingApplications = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(403).json({ error: 'kindly login as applicant' });
      }
      const pendingApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.PENDING);
      res.status(200).json({ pendingApplications });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  getPropertyApplicationFee = async (req: CustomRequest, res: Response) => {
    try {
      const { propertyId } = req.params;
      
      // Validate propertyId
      if (!propertyId) {
        return res.status(500).json({ error: 'Property ID is required.' });
      }
      
      console.log(req.params)
      // Check if property exists
      const property = await PropertyServices.getPropertiesById(propertyId);
      if (!property) {
        return res.status(404).json({ error: 'Property does not exist.' });
      }

      const { landlordId, rentalFee } = property;

      // Validate landlord ID and rental fee
      if (!landlordId || !rentalFee) {
        return res.status(400).json({ error: 'Invalid property data.' });
      }

      // Fetch global settings for application fees
      const propsSettings = await PropertyServices.getPropertyGlobalFees(
        landlordId,
        PropsSettingType.APPLICATION
      );

      // Validate propsSettings
      if (!propsSettings || !propsSettings.applicationFee) {
        return res.status(400).json({ error: 'Application fee settings not found.' });
      }

      // Calculate application fee
      const applicationFee = Number(rentalFee) * Number(propsSettings.applicationFee);

      return res.status(200).json({
        property,
        applicationFee,
      });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  completeApplication = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;

      if (!applicationId) {
        return res.status(400).json({ error: 'Application ID is required' });
      }
      // check for the existance of application before proceeding
      const applicationExist = await ApplicantService.getApplicationById(applicationId);
      if (!applicationExist) return res.status(500).json({ message: "Application Doesn't Exist" });
      const application = await ApplicantService.updateApplicationStatus(applicationId, ApplicationStatus.COMPLETED);
      res.status(200).json(application);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  createOrUpdateApplicantBioData = async (req: CustomRequest, res: Response) => {
    try {
      const userId = String(req.user.id);
      const propertiesId = req.params.propertiesId;
      // check for property existance
      const propertyExist = await PropertyServices.getPropertiesById(propertiesId);
      if (!propertyExist) return res.status(404).json({ message: `property with the id : ${propertiesId} doesn't exist` });

      const { error } = applicantPersonalDetailsSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const application = await ApplicantService.createOrUpdatePersonalDetails({ ...req.body, userId }, propertiesId, userId);
      return res.status(201).json({ application });
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

      const application = await ApplicantService.createOrUpdateGuarantor({ ...req.body, applicationId });
      return res.status(201).json({ application });
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

      const application = await ApplicantService.createOrUpdateEmergencyContact({ ...req.body, applicationId });
      return res.status(201).json({ application });
    } catch (error: unknown) {
      ErrorService.handleError(error, res);
    }
  }
  createApplicantionDocument = async (req: CustomRequest, res: Response) => {
    try {
      const { error, value } = documentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const applicationId = req.params.applicationId;
      const { cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls } = value;
      // Check if all three URLs are empty
      if (!cloudinaryUrls && !cloudinaryVideoUrls && !cloudinaryDocumentUrls) {
        // Prompt the user for the document URL if all are empty
        return res.status(400).json({
          message: "Please provide a document URL. Either cloudinaryUrls, cloudinaryVideoUrls, or cloudinaryDocumentUrls must be supplied."
        });
      }
      // Proceed with the rest of your logic
      const documentUrl = cloudinaryUrls || cloudinaryVideoUrls || cloudinaryDocumentUrls;


      delete value['cloudinaryUrls']
      delete value['cloudinaryVideoUrls']
      delete value['cloudinaryDocumentUrls']

      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" });
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" });
      }

      const application = await ApplicantService.createOrUpdateApplicationDoc({ ...value, documentUrl: documentUrl[0], applicationId });
      return res.status(201).json({ application });
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
