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
import { ApplicationStatus, InvitedResponse, LogType } from '@prisma/client';
import LogsServices from '../../services/logs.services';
import { updateApplicationInviteSchema } from '../../landlord/validations/schema/applicationInvitesSchema';
import sendMail, { sendApplicationCompletionEmails } from "../../utils/emailer"
import { sendPreferenceAwareMail } from "../../utils/sendPreferenceAwareMail";
import { NotificationCategory } from "@prisma/client";
import logsServices from '../../services/logs.services';
import emailService from '../../services/emailService';
import { LandlordService } from '../../landlord/services/landlord.service';
import LandlordSettingsService from '../../landlord/services/propertySetting.service';
import { getApplicationFormConfig } from '../../utils/applicationFormConfig';
import {
  getMissingApplicationFields,
  resolveApplicationMarketFromRecord,
  resolveLandlordTenancyMinimum,
} from '../../utils/applicationCompletionRules';
import { validateTenancyHistoryCoverage, resolveMinimumTenancyHistoryYears } from '../../utils/tenancyHistoryRules';
import { resolveFinancialRules, getApplicationFeeRefundInfo } from '../../utils/globalSettings.util';
import userServices from '../../services/user.services';
import logger from '../../utils/loggers';
import { ViewingInviteNormalizer } from '../../utils/ViewingInviteNormalizer';
import { EngagementNormalizer } from '../../utils/EngagementNormalizer';
import {
    validateTenantApplicationStart,
    validateTenantInviteUpdate,
} from '../../utils/InviteStateMachine';
import applicationFeeService from '../../services/applicationFee.service';
import moveInPaymentService from '../../services/moveInPayment.service';
import { PaymentGateway } from '@prisma/client';

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
      const applicationStatuses = [...new Set([...activeStatuses, ...completedStatuses])];

      const [applications, allInvites] = await Promise.all([
        ApplicantService.getApplicationBasedOnStatus(userId, applicationStatuses),
        ApplicantService.getInvite({ userInvitedId: userId }, false),
      ]);

      const applicationsByStatus = (status: ApplicationStatus) =>
        applications.filter((application: any) => application.status === status);
      const pendingApplications = applicationsByStatus(ApplicationStatus.PENDING);
      const completedApplications = applicationsByStatus(ApplicationStatus.COMPLETED);
      const approvedApplications = applicationsByStatus(ApplicationStatus.APPROVED);
      const declinedApplications = applicationsByStatus(ApplicationStatus.DECLINED);
      const makePaymentApplications = applicationsByStatus(ApplicationStatus.MAKEPAYMENT);
      const acceptedApplications = applicationsByStatus(ApplicationStatus.ACCEPTED);
      const submittedApplications = applicationsByStatus(ApplicationStatus.SUBMITTED);
      
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
      
      // Normalize invites to include listing with hierarchy + engagement DTO
      const invites = (await ViewingInviteNormalizer.normalizeMany(filteredInvites, req.user?.id)).map(
        (invite) => ({
          ...invite,
          engagement: EngagementNormalizer.fromNormalizedInvite(invite),
        })
      );
      const activeApps = applications.filter((application: any) =>
        activeStatuses.includes(application.status)
      );
      const completedApps = applications.filter((application: any) =>
        completedStatuses.includes(application.status)
      );

      const inviteEngagements = EngagementNormalizer.fromNormalizedInvitesMany(invites);
      const applicationEngagements = EngagementNormalizer.fromApplicationRecordsMany([
        ...pendingApplications,
        ...completedApplications,
        ...declinedApplications,
        ...makePaymentApplications,
        ...acceptedApplications,
        ...submittedApplications,
        ...activeApps,
        ...completedApps,
        ...approvedApplications,
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
          approvedApplications,
          inviteEngagements,
          applicationEngagements,
          engagements: [...inviteEngagements, ...applicationEngagements],
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

      const globalSettings = await LandlordSettingsService.getAllGlobalSettings(landlordId);
      const rent = Number(price);
      const rules = resolveFinancialRules(globalSettings, rent, property.priceFrequency);

      if (!globalSettings) {
        return res.status(400).json({ error: 'Application fee settings not found.' });
      }

      return res.status(200).json({
        property,
        applicationFee: rules.applicationFeeAmount,
        applicationFeePercent: rules.applicationFeePercent,
        ...getApplicationFeeRefundInfo(rules),
      });
    } catch (error) {
      ErrorService.handleError(error, res)
    }
  };

  getApplicationFeeStatus = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;
      const userId = String(req.user.id);
      const status = await applicationFeeService.getFeeStatus(applicationId, userId);
      return res.status(200).json(status);
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  };

  payApplicationFee = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;
      const userId = String(req.user.id);
      const paymentMethod = (req.body.paymentMethod || 'card') as 'wallet' | 'card';
      const paymentGateway = req.body.paymentGateway as PaymentGateway | undefined;

      if (paymentMethod === 'wallet') {
        const result = await applicationFeeService.payFromWallet(applicationId, userId);
        return res.status(200).json(result);
      }

      const result = await applicationFeeService.initiateCardPayment(
        applicationId,
        userId,
        paymentGateway
      );
      return res.status(200).json(result);
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  };

  verifyApplicationFeePayment = async (req: CustomRequest, res: Response) => {
    try {
      const userId = String(req.user.id);
      const applicationId = req.params.applicationId;
      const { referenceId, paymentGateway } = req.body;
      if (!referenceId || !paymentGateway) {
        return res.status(400).json({ error: 'referenceId and paymentGateway are required' });
      }

      await applicationFeeService.getFeeStatus(applicationId, userId);

      const result = await applicationFeeService.settleFromProviderReference(
        referenceId,
        paymentGateway as PaymentGateway,
        applicationId
      );
      return res.status(200).json(result);
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  };

  getMoveInPaymentStatus = async (req: CustomRequest, res: Response) => {
    try {
      const userId = String(req.user.id);
      const applicationId = req.params.applicationId;
      const status = await moveInPaymentService.getPaymentStatus(applicationId, userId);
      return res.status(200).json(status);
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  };

  payMoveInFromWallet = async (req: CustomRequest, res: Response) => {
    try {
      const userId = String(req.user.id);
      const applicationId = req.params.applicationId;
      const result = await moveInPaymentService.payFromWallet(applicationId, userId);
      return res.status(200).json(result);
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  };

  completeApplication = async (req: CustomRequest, res: Response) => {
    try {
      const applicationId = req.params.applicationId;
      const userId = String(req.user.id);

      if (!applicationId) {
        return res.status(400).json({ error: 'Application ID is required' });
      }
      // check for the existance of application before proceeding
      const applicationExist = await ApplicantService.getApplicationById(applicationId);
      if (!applicationExist) return res.status(500).json({ message: "Application Doesn't Exist" });

      if (applicationExist.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to complete this application' });
      }

      const feeGate = await applicationFeeService.assertCanComplete(applicationId);
      if (!feeGate.ok) {
        return res.status(402).json({
          error: feeGate.message,
          code: 'APPLICATION_FEE_REQUIRED',
          fee: feeGate.fee,
        });
      }

      const landlordMinimum = await resolveLandlordTenancyMinimum(applicationExist);
      const missingFields = getMissingApplicationFields(
        applicationExist,
        landlordMinimum
      );

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

      const startCheck = validateTenantApplicationStart(invitation);
      if (!startCheck.valid) {
        return res.status(400).json({ error: startCheck.error });
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

      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);

      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" });
      }
      const isCompletd = await ApplicantService.checkApplicationCompleted(applicationId);
      if (isCompletd) {
        return res.status(400).json({ error: "application completed" });
      }

      if (req.body?.skip === true) {
        const marketCountry = resolveApplicationMarketFromRecord(existingApplication);
        const formConfig = getApplicationFormConfig(marketCountry);
        if (!formConfig.guarantor.optional) {
          return res.status(400).json({ error: "Guarantor is required for this application" });
        }
        await ApplicantService.skipGuarantorStep(applicationId);
        return res.status(200).json({ skipped: true });
      }

      const { error } = guarantorInformationSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const body = {
        ...req.body,
        address: req.body.address?.trim?.() || "",
      };

      const application = await ApplicantService.createOrUpdateGuarantor({
        ...body,
        applicationId,
        userId,
      });
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
      const signature = value.signature?.trim();
      if (!signature) {
        return res.status(400).json({
          message: "Digital signature is required. Type your full legal name.",
        });
      }

      const existingApplication = await ApplicantService.checkApplicationExistance(applicationId);
      if (!existingApplication) {
        return res.status(400).json({ error: "wrong application id supplied" });
      }
      const landlordMinimum = await resolveLandlordTenancyMinimum(existingApplication);
      const missingFields = getMissingApplicationFields(
        existingApplication,
        landlordMinimum
      );

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

      const marketCountry = resolveApplicationMarketFromRecord(existingApplication);
      const landlordId = existingApplication.properties?.landlordId;
      const globalSettings = landlordId
        ? await LandlordSettingsService.getAllGlobalSettings(landlordId)
        : null;
      const minimumYears = resolveMinimumTenancyHistoryYears(
        globalSettings?.minimumTenancyHistoryYears,
        marketCountry
      );
      const coverage = validateTenancyHistoryCoverage(
        {
          lengthOfResidence: data.lengthOfResidence,
          prevAddresses: data.prevAddresses,
        },
        minimumYears
      );
      if (!coverage.valid) {
        return res.status(400).json({ error: coverage.message });
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
      const marketCountry = resolveApplicationMarketFromRecord(application);
      const landlordId = (application as { properties?: { landlordId?: string } })
        .properties?.landlordId;
      const globalSettings = landlordId
        ? await LandlordSettingsService.getAllGlobalSettings(landlordId)
        : null;
      return res.status(200).json({
        application,
        formConfig: getApplicationFormConfig(
          marketCountry,
          globalSettings?.minimumTenancyHistoryYears
        ),
      });
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
      const normalizedInvite = await ViewingInviteNormalizer.normalize(rawInvite, req.user?.id);
      
      return res.status(200).json({
        invite: normalizedInvite,
        engagement: EngagementNormalizer.fromNormalizedInvite(normalizedInvite),
      });
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
        ViewingInviteNormalizer.normalizeMany(rawPendingInvites || [], req.user?.id),
        ViewingInviteNormalizer.normalizeMany(rawAcceptInvites || [], req.user?.id),
        ViewingInviteNormalizer.normalizeMany(rawOtherInvites || [], req.user?.id),
        ViewingInviteNormalizer.normalizeMany(rawAwaitingFeedbackInvites || [], req.user?.id)
      ]);

      return res.status(200).json({
        pendingInvites,
        acceptInvites,
        otherInvites,
        awaitingFeedbackInvites,
        engagements: EngagementNormalizer.fromNormalizedInvitesMany([
          ...pendingInvites,
          ...acceptInvites,
          ...awaitingFeedbackInvites,
        ]),
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

      if (value.response) {
        const transitionCheck = validateTenantInviteUpdate(
          inviteExist,
          value.response
        );
        if (!transitionCheck.valid) {
          return res.status(400).json({ error: transitionCheck.error });
        }
      }

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
      // Multipart form sends metadata as JSON string; normalize to object for Joi
      if (req.body && typeof req.body.metadata === 'string') {
        try {
          req.body.metadata = JSON.parse(req.body.metadata);
        } catch {
          req.body.metadata = {};
        }
      }
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

      // Get landlord info (application.properties may be null; fallback to invite's property or invite's landlord)
      const app = agreement.application;
      const landlordId =
        app?.properties?.landlordId ??
        app?.applicationInvites?.properties?.landlordId ??
        app?.applicationInvites?.invitedByLandordId ?? null;
      if (!landlordId) {
        return res.status(400).json({
          error: "Landlord not found",
          message: "Could not determine the landlord for this agreement. The application may not be linked to a property."
        });
      }
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
      sendPreferenceAwareMail({
        userId: landlord.user?.id,
        category: NotificationCategory.WEBSITE_INQUIRY,
        notificationType: 'agreement_signed',
        to: landlord.user.email,
        subject: `Asher - ${agreement.application?.properties?.name} Agreement Form`,
        html: htmlContent,
      }).catch((emailError) => {
        logger.error('Failed to send agreement signed email:', emailError);
      });

      // Agreement fully signed only after landlord counter-signs (see syncApplicationStatusAfterAgreementSign)
      await logsServices.createLog({
        applicationId: agreement.applicationId,
        subjects: "Asher Agreement Letter SignUp",
        events: `Agreement letter signed for the property: ${agreement.application?.properties?.name}`,
        createdById: userId,
        type: LogType.EMAIL,
      });

      return res.status(200).json({
        message: "Agreement signed by tenant. Awaiting landlord counter-signature.",
        recipient: landlord.user.email,
        agreementDocument: created,
      });
    } catch (error) {
      ErrorService.handleError(error, res);
    }
  };
}

export default new ApplicantControls();
