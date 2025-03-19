import { Request, Response } from 'express';
import ApplicantService from '../services/applicantService';
import PropertyServices from '../../services/propertyServices';
import { CustomRequest } from "../../utils/types";
import { uploadDocsCloudinary } from '../../middlewares/multerCloudinary';
import {
  documentSchema,
  guarantorInformationSchema,
  residentialInformationSchema,
  employmentInformationSchema,
  applicantPersonalDetailsSchema,
  emergencyContactSchema,
  additionalInfoSchema,
  refreeSchema,
  declarationSchema
} from '../schemas';
import ErrorService from "../../services/error.service";
import { ApplicationStatus, InvitedResponse, LogType, PropsSettingType } from '@prisma/client';
import LogsServices from '../../services/logs.services';
import { updateApplicationInviteSchema } from '../../landlord/validations/schema/applicationInvitesSchema';


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
  getApplications = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(403).json({ error: 'kindly login as applicant' });
      }
      const pendingApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.PENDING);
      const completedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.COMPLETED);
      const declinedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.DECLINED);
      const makePaymentApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.MAKEPAYMENT);
      const acceptedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.ACCEPTED);
      const submittedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.SUBMITTED);
      const invites = await ApplicantService.getInvite({ userInvitedId: userId });
      // Define status groups
      const activeStatuses = [
        ApplicationStatus.PENDING,
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.MAKEPAYMENT,
        ApplicationStatus.ACCEPTED
      ];

      const completedStatuses = [
        ApplicationStatus.COMPLETED,
        ApplicationStatus.DECLINED
      ];

      // Get grouped applications
      const [activeApps, completedApps] = await Promise.all([
        ApplicantService.getApplicationBasedOnStatus(userId, activeStatuses),
        ApplicantService.getApplicationBasedOnStatus(userId, completedStatuses)
      ]);

      res.status(200).json({
        applications: {
          pendingApplications,
          completedApplications,
          declinedApplications,
          makePaymentApplications,
          acceptedApplications,
          submittedApplications,
          activeApps,
          completedApps,
          invites
        }
      });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  /**
   * Fetches application property milestones and application details.
   * @param req - Express request object.
   * @param res - Express response object.
  */
  getApplicationPropsMilestone = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { propertyId, applicationId } = req.params;

      // Validate user ID
      if (!userId) {
        return res.status(403).json({ error: 'Kindly login as an applicant.' });
      }

      // Validate propertyId
      if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required.' });
      }

      // Fetch property milestones
      const propsMilestone = await LogsServices.getMilestone(
        userId,
        LogType.APPLICATION,
        propertyId,
      );

      let application = null;
      let milestones = propsMilestone;

      // Fetch application milestones if applicationId is provided
      if (applicationId) {
        // Validate applicationId
        if (!applicationId) {
          return res.status(400).json({ error: 'Application ID is required.' });
        }

        // Fetch application details
        application = await ApplicantService.getApplicationById(applicationId);

        // Fetch application-specific milestones
        const applicationMilestone = await LogsServices.getMilestone(
          userId,
          LogType.APPLICATION,
          propertyId,
          applicationId,
        );

        // Combine property and application milestones
        milestones = [...propsMilestone, ...applicationMilestone];
      }

      // Return the response
      res.status(200).json({ milestones, application });
    } catch (error) {
      // Handle errors
      ErrorService.handleError(error, res);
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
  // done
  // creating an application 
  createOrUpdateApplicantBioData = async (req: CustomRequest, res: Response) => {
    try {
      const userId = String(req.user.id);
      const propertiesId = req.params.propertiesId;
      // check for property existance
      const propertyExist = await PropertyServices.getPropertiesById(propertiesId);
      if (!propertyExist) return res.status(404).json({ message: `property with the id : ${propertiesId} doesn't exist` });

      const { error, value } = applicantPersonalDetailsSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const application = await ApplicantService.createApplication({ ...value, userId }, propertiesId, userId);


      return res.status(201).json({ application });
    } catch (error: unknown) {
      ErrorService.handleError(error, res)
    }
  }
  createOrUpdateAdditionInfo = async (req: CustomRequest, res: Response) => {
    try {
      const userId = String(req.user.id);
      const applicationId = req.params.applicationId;

      const { error, value } = additionalInfoSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const application = await ApplicantService.createOrUpdateAdditionalInformation({ ...value, applicationId });
      return res.status(201).json({ application });
    } catch (error: unknown) {
      ErrorService.handleError(error, res)
    }
  }
  //done
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

      const application = await ApplicantService.createOrUpdateGuarantor({ ...req.body, applicationId, userId });
      return res.status(201).json({ application });
    } catch (error: unknown) {
      ErrorService.handleError(error, res)
    }
  }
  // done
  createOrUpdateEmergencyContact = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;
      const userId = req.user.id;

      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" });
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" });
      }
      const { error, value } = emergencyContactSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const application = await ApplicantService.createOrUpdateEmergencyContact({ ...value, userId, applicationId });
      return res.status(201).json({ application });
    } catch (error: unknown) {
      ErrorService.handleError(error, res);
    }
  }
  // done
  createOrUpdateRefree = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;
      const userId = req.user.id;

      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" });
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" });
      }
      const { error, value } = refreeSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const referee = await ApplicantService.createOrUpdateReferees({ ...value, applicationId, userId });
      return res.status(201).json({ referee });
    } catch (error: unknown) {
      ErrorService.handleError(error, res);
    }
  }

  // Upload Documents Handler
  uploadAppDocuments = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;
      const userId = req.user.id;

      console.log("Received files:", req.files);

      // Ensure `req.files` exists and is not empty
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }

      // Convert `req.files` to an array
      const files: Express.Multer.File[] = Object.values(req.files).flat();

      // Validate application existence
      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "Invalid application ID provided" });
      }

      // Validate application completion
      const isCompleted = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompleted) {
        return res.status(400).json({ error: "Application is already completed" });
      }

      // Upload files and save metadata
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const uploadResult: any = await uploadDocsCloudinary(file);
          // Ensure `documentUrl` is always available
          if (!uploadResult.secure_url) {
            throw new Error("Failed to upload document");
          }

          // Remove file extension (e.g., ".jpg", ".pdf")
          const documentName = file.originalname.replace(/\.[^/.]+$/, "");
          return await ApplicantService.createOrUpdateApplicationDoc({
            documentName, // File name
            type: file.mimetype, // MIME type (e.g., image/jpeg, application/pdf)
            size: String(file.size), // File size in bytes
            applicationId,
            documentUrl: uploadResult.secure_url
          });
        })
      );

      return res.status(201).json({ success: true, uploadedFiles });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  createApplicantionDocument = async (req: CustomRequest, res: Response) => {
    try {
      const { error, value } = documentSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const applicationId = req.params.applicationId;
      const { cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, cloudinaryAudioUrls } = value;
      // Check if all three URLs are empty
      if (!cloudinaryUrls && !cloudinaryVideoUrls && !cloudinaryDocumentUrls) {
        // Prompt the user for the document URL if all are empty
        return res.status(400).json({
          message: "Please provide a document URL. Either cloudinaryUrls, cloudinaryVideoUrls, cloudinaryAudioUrls, or cloudinaryDocumentUrls must be supplied."
        });
      }
      // Proceed with the rest of your logic
      const documentUrl = cloudinaryUrls || cloudinaryVideoUrls || cloudinaryDocumentUrls;

      delete value['cloudinaryUrls']
      delete value['cloudinaryVideoUrls']
      delete value['cloudinaryDocumentUrls']
      delete value['cloudinaryAudioUrls']

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
  // 
  createOrUpdateDeclaration = async (req: CustomRequest, res: Response) => {
    try {
      const { error, value } = declarationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const applicationId = req.params.applicationId;
      const { cloudinaryUrls } = value;
      // Check if all three URLs are empty
      if (!cloudinaryUrls) {
        return res.status(400).json({
          message: "kindly sign the document"
        });
      }
      const signature = cloudinaryUrls[0];

      delete value['cloudinaryUrls']
      delete value['cloudinaryVideoUrls']
      delete value['cloudinaryDocumentUrls']
      delete value['cloudinaryAudioUrls']

      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" });
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" });
      }
      const declaration = await ApplicantService.createOrUpdateDeclaration({ ...value, signature, applicationId });
      return res.status(201).json({ declaration });
    } catch (error: unknown) {
      ErrorService.handleError(error, res)
    }
  }

  // done
  createOrUpdateResidentialInformation = async (req: CustomRequest, res: Response) => {
    try {
      const { error } = residentialInformationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      const applicationId = req.params.applicationId;
      const userId = req.user.id;
      const data = req.body;
      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" });
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" });
      }

      const result = await ApplicantService.createOrUpdateResidentialInformation({ ...data, applicationId, userId });
      res.status(200).json(result);
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  }

  // done
  createOrUpdateEmploymentInformation = async (req: CustomRequest, res: Response) => {
    try {
      // Validate request body
      const { error } = employmentInformationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const applicationId = req.params.applicationId;
      const userId = req.user.id;
      const data = req.body;
      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" });
      }
      const isCompleted = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompleted) {
        return res.status(400).json({ error: "application completed" });
      }

      const employmentInformation = await ApplicantService.createOrUpdateEmploymentInformation({ ...data, applicationId, userId });
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

  getInvites = async (req: CustomRequest, res: Response) => {
    try {
      const userInvitedId = req.user?.id;
      const pendingInvites = await ApplicantService.getInvite({ userInvitedId, status: InvitedResponse.PENDING });
      const acceptInvites = await ApplicantService.getInvite({ userInvitedId, status: InvitedResponse.ACCEPTED });
      const rescheduledInvites = await ApplicantService.getInvite({ userInvitedId, status: InvitedResponse.RESCHEDULED });
      const rejectedInvites = await ApplicantService.getInvite({ userInvitedId, status: InvitedResponse.REJECTED });
      // const invite = await ApplicantService.getInvite({ userInvitedId });
      // if (!invite) return res.status(404).json({ message: 'Invite not found' });
      return res.status(200).json({ invites:{
        pendingInvites,
        acceptInvites,
        rescheduledInvites,
        rejectedInvites
      } });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  }

  updateInvite = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;

      const inviteExist = await ApplicantService.getInvitedById(id);
      if (!inviteExist) return res.status(404).json({ message: "invitation doesn't exist" });

      const { error, value } = updateApplicationInviteSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });

      const invite = await ApplicantService.updateInvites(id, value);
      return res.status(200).json({ invite });
    } catch (error: unknown) {
      ErrorService.handleError(error, res);
    }
  }
}

export default new ApplicantControls();
