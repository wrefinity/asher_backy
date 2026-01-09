import { Request, Response } from 'express';
import ApplicantService from '../services/applicantService';
import ApplicantionService from '../../services/application.services';
import PropertyServices from '../../services/propertyServices';
import { CustomRequest } from "../../utils/types";
import { uploadDocsCloudinary } from '../../middlewares/multerCloudinary';
import {
  documentSchema,
  appDocumentSchema,
  guarantorInformationSchema,
  residentialInformationSchema,
  employmentInformationSchema,
  applicantPersonalDetailsSchema,
  emergencyContactSchema,
  additionalInfoSchema,
  refreeSchema,
  declarationSchema
} from '../schemas';
import {updateAgreementSchema } from "../../landlord/validations/schema/applicationInvitesSchema"
import ErrorService from "../../services/error.service";
import { ApplicationStatus, InvitedResponse, LogType, PropsSettingType } from '@prisma/client';
import LogsServices from '../../services/logs.services';
import { updateApplicationInviteSchema } from '../../landlord/validations/schema/applicationInvitesSchema';
import sendMail, { sendApplicationCompletionEmails } from "../../utils/emailer"
import logsServices from '../../services/logs.services';
import emailService from '../../services/emailService';
import { LandlordService } from '../../landlord/services/landlord.service';
import userServices from '../../services/user.services';
import logger from '../../utils/loggers';
import { ViewingInviteNormalizer } from '../../utils/ViewingInviteNormalizer';

class ApplicantControls {

  updateMoveInDate = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { moveInDate } = req.body;

      if (!moveInDate) {
        return res.status(400).json({ message: 'moveInDate is required' });
      }
      const date = new Date(moveInDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      const updated = await ApplicantionService.updateMoveInDate(id, date);
      return res.status(200).json({ updated });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
  getBasicStats = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(403).json({ error: 'kindly login as applicant' });
      }
      const stats = await ApplicantionService.getDashboardData(userId);
      res.status(200).json({ stats });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
  getPendingApplications = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const pendingApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.PENDING);
      res.status(200).json({ pendingApplications });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };
  getApplications = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      const pendingApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.PENDING);
      const completedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.COMPLETED);
      const approvedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.APPROVED);
      const declinedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.DECLINED);
      const makePaymentApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.MAKEPAYMENT);
      const acceptedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.ACCEPTED);
      const submittedApplications = await ApplicantService.getApplicationBasedOnStatus(userId, ApplicationStatus.SUBMITTED);

      const allInvites = await ApplicantService.getInvite({ userInvitedId: userId }, false);
      
      // Filter invites to only include those ready for application:
      // Invites that have completed the full flow (PENDING -> ACCEPTED -> AWAITING_FEEDBACK -> FEEDBACK -> APPLY)
      const filteredInvites = allInvites.filter((invite: any) => {
        const response = invite.response;
        const stepsCompleted = invite.responseStepsCompleted || [];
        
        // Include if in APPLY or APPLICATION_STARTED state
        if (response === InvitedResponse.APPLY || response === InvitedResponse.APPLICATION_STARTED) {
          return true;
        }
        
        // Include if has completed the full flow: PENDING -> ACCEPTED -> AWAITING_FEEDBACK -> FEEDBACK -> APPLY
        const hasFullFlow = 
          stepsCompleted.includes(InvitedResponse.PENDING) &&
          stepsCompleted.includes(InvitedResponse.ACCEPTED) &&
          stepsCompleted.includes(InvitedResponse.AWAITING_FEEDBACK) &&
          stepsCompleted.includes(InvitedResponse.FEEDBACK) &&
          stepsCompleted.includes(InvitedResponse.APPLY);
        
        return hasFullFlow;
      });
      
      // Normalize invites to include listing with hierarchy
      const invites = await ViewingInviteNormalizer.normalizeMany(filteredInvites);
      // Define status groups
      const activeStatuses = [
        ApplicationStatus.PENDING,
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.MAKEPAYMENT,
        ApplicationStatus.ACCEPTED
      ];

      const completedStatuses = [
        ApplicationStatus.COMPLETED,
        ApplicationStatus.DECLINED,
        ApplicationStatus.APPROVED,
        ApplicationStatus.AGREEMENTS,
        ApplicationStatus.AGREEMENTS_SIGNED,
      ];

      // Get grouped applications (already normalized in service)
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
          invites,
          approvedApplications
        }
      });
    } catch (error) {
      console.log(error)
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

      // Check if property exists
      const property = await PropertyServices.getPropertiesById(propertyId);
      if (!property) {
        return res.status(404).json({ error: 'Property does not exist.' });
      }

      const { landlordId, price } = property;

      // Validate landlord ID and rental fee
      if (!landlordId || !price) {
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
      const applicationFee = Number(price) * Number(propsSettings.applicationFee);

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

      const requiredFields = [
        { field: applicationExist.guarantorInformationId, name: 'guarantorInformationId' },
        { field: applicationExist.residentialId, name: 'residentialId' },
        { field: applicationExist.employmentInformationId, name: 'employmentInformationId' },
        { field: applicationExist.applicantPersonalDetailsId, name: 'applicantPersonalDetailsId' },
        { field: applicationExist.refereeId, name: 'refereeId' }
      ];

      const missingFields = requiredFields.filter(item => !item.field).map(item => item.name);

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: "Kindly complete the application fields before submitting",
          missingFields: missingFields
        });
      }

      const application = await ApplicantService.updateApplicationStatus(applicationId, ApplicationStatus.COMPLETED);

      if (!application) {
        return res.status(400).json({ error: 'Application not updated' });
      }
      await Promise.all([
        ApplicantService.updateInvites(application.applicationInviteId, { response: InvitedResponse.SUBMITTED }),
        sendApplicationCompletionEmails(applicationExist)
      ]);
      return res.status(200).json(application);
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
      const propertyExist = await PropertyServices.searchPropertyUnitRoom(propertiesId);
      if (!propertyExist) return res.status(404).json({ message: `property with the id : ${propertiesId} doesn't exist` });

      const { error, value } = applicantPersonalDetailsSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      if (!value.applicationInviteId == null) {
        return res.status(400).json({ error: "cannot pass null application invite id" });
      }

      const invitation = await ApplicantService.getInvitedById(value.applicationInviteId);
      if (!invitation) return res.status(400).json({ error: "Invalid application invitation" });

      // Check response steps history
      const hasForbiddenHistory = invitation.responseStepsCompleted?.some(step =>
        ([InvitedResponse.DECLINED, InvitedResponse.REJECTED] as InvitedResponse[]).includes(step)
      );

      if (hasForbiddenHistory) {
        return res.status(400).json({
          error: "This invitation is declined or rejected"
        });
      }

      // Check if APPLY, AWAITING_FEEDBACK, FEEDBACK, and PENDING steps are completed
      const requiredSteps: InvitedResponse[] = [
        InvitedResponse.APPLY,
        InvitedResponse.AWAITING_FEEDBACK,
        InvitedResponse.FEEDBACK,
        InvitedResponse.PENDING
      ];

      // Verify that all required steps are included in responseStepsCompleted
      const hasAllRequiredSteps = requiredSteps.every(step =>
        invitation.responseStepsCompleted?.includes(step)
      );

      if (!hasAllRequiredSteps) {
        return res.status(400).json({
          error: "Application requires completion of APPLY, FEEDBACK, and PENDING steps"
        });
      }
      const { type, data } = propertyExist;
      // Only one of these will be assigned, others remain undefined
      const id = data.id;
      const propertyId = type === 'property' ? id : undefined;
      const unitId = type === 'unit' ? id : undefined;
      const roomId = type === 'room' ? id : undefined;

      const application = await ApplicantService.createApplication({ ...value, userId }, { propertyId, unitId, roomId }, userId);

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

  getLastApplicationDataForUser = async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user.id;
      const application = await ApplicantService.getLastApplicationDataForUser(userId);
      return res.status(200).json({ application });
    } catch (error: unknown) {
      ErrorService.handleError(error, res);
    }
  }
  uploadAppDocuments = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;
      const userId = req.user.id;

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



      // const files = req.files as Express.Multer.File[];
      const files: Express.Multer.File[] = Object.values(req.files).flat();

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }


      // Normalize metadata from req.body
      const documentNames = Array.isArray(req.body.documentName)
        ? req.body.documentName
        : [req.body.documentName];

      if (documentNames.length !== files.length) {
        return res.status(400).json({ error: "Metadata length mismatch with files" });
      }

      const uploadedFiles = await Promise.all(
        files.map(async (file, index) => {
          const documentData = {
            documentName: documentNames[index],
            type: "filex",
            size: "0kB",
          };

          const { error } = appDocumentSchema.validate(documentData);
          if (error) {
            throw new Error(`Validation failed for document ${index + 1}: ${error.message}`);
          }

          const uploadResult: any = await uploadDocsCloudinary(file);
          if (!uploadResult.secure_url) {
            throw new Error(`Failed to upload file: ${file.originalname}`);
          }

          return await ApplicantService.createOrUpdateApplicationDoc({
            documentName: documentData.documentName,
            type: file.mimetype,
            size: String(file.size),
            applicationId,
            documentUrl: [uploadResult.secure_url],
          });
        })
      );

      return res.status(201).json({ success: true, uploadedFiles });
    } catch (error) {
      console.log(error)
      ErrorService.handleError(error, res);
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

      const application = await ApplicantService.createOrUpdateApplicationDoc({ ...value, documentUrl, applicationId });
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
      const requiredFields = [
        { field: existingApplication.guarantorInformationId, name: 'guarantorInformationId' },
        { field: existingApplication.residentialId, name: 'residentialId' },
        { field: existingApplication.employmentInformationId, name: 'employmentInformationId' },
        { field: existingApplication.applicantPersonalDetailsId, name: 'applicantPersonalDetailsId' },
        { field: existingApplication.refereeId, name: 'refereeId' }
      ];

      const missingFields = requiredFields.filter(item => !item.field).map(item => item.name);

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: "Kindly complete the application fields before submitting",
          missingFields: missingFields
        });
      }

      // // Validate questions content
      // if (existingApplication.applicationQuestions.length < 3) {
      //   return res.status(400).json({ message: "Kindly complete the application questions field before submitting" });
      // }
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

  getInvite = async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const rawInvite = await ApplicantService.getInvitedById(id);
      if (!rawInvite) {
        return res.status(404).json({ message: 'Invite not found' });
      }
      
      // Normalize the invite to include listing with hierarchy
      const normalizedInvite = await ViewingInviteNormalizer.normalize(rawInvite);
      
      return res.status(200).json({ invite: normalizedInvite });
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  }

  // invites sections 
  getInvites = async (req: CustomRequest, res: Response) => {
    try {
      const userInvitedId = req.user?.id;
      const [
        rawPendingInvites,
        rawAcceptInvites,
        rawOtherInvites,
        rawAwaitingFeedbackInvites
      ] = await Promise.all([
        ApplicantService.getInvite({
          userInvitedId,
          response: [InvitedResponse.PENDING]
        }),
        ApplicantService.getInvite({
          userInvitedId,
          response: [InvitedResponse.ACCEPTED, InvitedResponse.RESCHEDULED, InvitedResponse.RE_INVITED, InvitedResponse.RESCHEDULED_ACCEPTED]
        }),
        ApplicantService.getInvite({
          userInvitedId,
          response: [InvitedResponse.REJECTED, InvitedResponse.COMPLETED, InvitedResponse.CANCELLED, InvitedResponse.DECLINED, InvitedResponse.APPROVED]
        }),
        ApplicantService.getInvite({
          userInvitedId,
          response: [InvitedResponse.AWAITING_FEEDBACK]
        })
      ]);

      // Normalize all invites to include listing with hierarchy
      const [pendingInvites, acceptInvites, otherInvites, awaitingFeedbackInvites] = await Promise.all([
        ViewingInviteNormalizer.normalizeMany(rawPendingInvites || []),
        ViewingInviteNormalizer.normalizeMany(rawAcceptInvites || []),
        ViewingInviteNormalizer.normalizeMany(rawOtherInvites || []),
        ViewingInviteNormalizer.normalizeMany(rawAwaitingFeedbackInvites || [])
      ]);

      return res.status(200).json({
        pendingInvites,
        acceptInvites,
        otherInvites,
        awaitingFeedbackInvites
      });

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

  signAgreementForm = async (req: CustomRequest, res: Response) => {
    const userId = req.user?.id;
    const agreementId = req.params.id;
    try {
      const { error, value } = updateAgreementSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }
      // Validate agreement ID
      if (!agreementId) {
        return res.status(400).json({
          error: "Agreement ID is required",
          details: ["Missing agreement ID in URL parameters"]
        });
      }

      // Fetch agreement
      const agreement = await ApplicantService.getAgreementById(agreementId);
      if (!agreement) {
        return res.status(404).json({
          error: "Agreement not found",
          details: [`Agreement with ID ${agreementId} does not exist`]
        });
      }

      // const { cloudinaryUrls, cloudinaryVideoUrls, cloudinaryDocumentUrls, cloudinaryAudioUrls, ...data} = value;

      // Get landlord info
      const landlordId = agreement.application?.properties?.landlordId;
      const landlord = await new LandlordService().getLandlordById(landlordId);
      if (!landlord) {
        return res.status(400).json({
          error: "Landlord not found",
          message: "The landlord associated with this property is not found."
        });
      }

      // Get user info
      const user = await userServices.getUserById(userId);
      if (!user) {
        return res.status(400).json({
          error: "User not found",
          message: "The user associated with this application is not found."
        });
      }

      // Authorization check
      const actualUserId = agreement.application.user?.id;
      if (user.id !== actualUserId) {
        return res.status(403).json({
          error: "Unauthorized",
          message: "You can only sign agreement forms for applications you applied for"
        });
      }

      // Combine all provided URLs into a single array
      const documentUrls = [
        ...(value.cloudinaryUrls || []),
        ...(value.cloudinaryAudioUrls || []),
        ...(value.cloudinaryVideoUrls || []),
        ...(value.cloudinaryDocumentUrls || [])
      ];

      // Extract needed values
      const { documentUrl = documentUrls[0], processedContent, metadata, ...data } = value;

      // Update agreement
      const created = await ApplicantService.signTenantAgreementDocument(
        { metadata, documentUrl, processedContent },
        userId,
        agreementId
      );

      if (!created) {
        return res.status(400).json({ message: "Agreement letter not updated" });
      }

      // Build HTML content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif;">
          <h2>Agreement Form Signed Notification</h2>
          <p>Hello,</p>
          <p>Please find the mail inbox for the agreement form signed by the applicant</p>
          <p>Best regards,<br/>Asher</p>
        </div>
      `;

      // Send in-house inbox message
      const mailBox = await emailService.createEmail({
        senderEmail: user.email,
        receiverEmail: landlord.user.email,
        body: `Kindly check your email inbox for the agreement form signed by the applicant`,
        attachment: documentUrls,
        subject: `Asher - ${agreement?.application.properties?.name} Agreement Form SignUp`,
        senderId: req.user.id,
        receiverId: agreement.application.user.id,
      });

      if (!mailBox) {
        return res.status(400).json({ message: "Mail not sent" });
      }

      // Send email notification in background - don't fail the request if email fails
      sendMail(
        landlord.user.email,
        `Asher - ${agreement.application?.properties?.name} Agreement Form`,
        htmlContent
      ).catch((emailError) => {
        logger.error('Failed to send agreement signed email:', emailError);
      });

      // Create audit log
      await logsServices.createLog({
        applicationId: agreement.applicationId,
        subjects: "Asher Agreement Letter SignUp",
        events: `Agreement letter signed for the property: ${agreement.application?.properties?.name}`,
        createdById: userId,
        type: LogType.EMAIL,
      });

      // Update application status
      await ApplicantService.updateApplicationStatusStep(
        agreement.applicationId,
        ApplicationStatus.AGREEMENTS_SIGNED
      );

      return res.status(200).json({
        message: "Agreement letter signed and sent successfully",
        recipient: landlord.user.email,
        agreementDocument: documentUrls
      });
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  };
}

export default new ApplicantControls();
