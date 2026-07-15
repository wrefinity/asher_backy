import { Response } from "express"
import { logTypeStatus, InvitedResponse, DocumentType, userRoles, application, NotificationCategory } from "@prisma/client"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import ApplicationService from "../../webuser/services/applicantService"
import ApplicationInvitesService from '../../services/application.services';
import { LandlordService } from "../services/landlord.service";
import TenantService from '../../services/tenant.service';
import { ApplicationStatus, LogType, EnquireStatus, EnquiryStatus } from "@prisma/client"
import { ReminderType, createApplicationInviteSchema, applicationReminderSchema, updateApplicationInviteSchema, agreementDocumentSchema, updateApplicationStatusSchema, updateAgreementSchema } from '../validations/schema/applicationInvitesSchema';
import Emailer from "../../utils/emailer";
import propertyServices from "../../services/propertyServices";
import logsServices from "../../services/logs.services";
import userServices from "../../services/user.services"
import sendMail from "../../utils/emailer"
import { sendPreferenceAwareMail } from "../../utils/sendPreferenceAwareMail";
import {
    loadApplicationForTenantCopy,
    resolveLeaseDatesFromApplication,
    seedTenantOnboardingMilestones,
} from "../../services/tenantOnboarding.service";
import applicantService from "../../webuser/services/applicantService"
import { PropertyDocumentService } from "../../services/propertyDocument.service"
import emailService from "../../services/emailService"
import logger from "../../utils/loggers"
import { ViewingInviteNormalizer } from "../../utils/ViewingInviteNormalizer"
import { getApplicationFormConfig } from '../../utils/applicationFormConfig';
import { resolveApplicationMarketFromRecord } from '../../utils/applicationCompletionRules';
import { resolveApplicationMarket } from '../../utils/applicationAddressFields';
import { validateLandlordInviteUpdate } from "../../utils/InviteStateMachine";
import LandlordSettingsService from "../services/propertySetting.service";
import applicationFeeService from "../../services/applicationFee.service";
import {
  calculateApplicationFeeRefundAmount,
  resolveFinancialRules,
  getApplicationFeeRefundInfo,
} from "../../utils/globalSettings.util";
import { prismaClient } from "../..";
import ScreeningService from "../../modules/screening/screening.service";

class ApplicationControls {
    private landlordService: LandlordService;

    constructor() { this.landlordService = new LandlordService(); }

    getApplicationStatistics = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const applicationStatistics = await ApplicationService.countApplicationStatsForLandlord(landlordId);
            res.status(200).json({ applicationStatistics });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    // get  applications base on the three most
    // essentially step during invites stage 
    getApplicationsWithInvites = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords.id;
            const completedStatuses = [
                InvitedResponse.PENDING,
                InvitedResponse.FEEDBACK,
                InvitedResponse.APPLY,
            ];
            const application = await ApplicationInvitesService.getInvitesWithStatus(landlordId, completedStatuses);
            return res.status(200).json({ application });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getApplicationsPending = async (req: CustomRequest, res: Response) => {

        try {
            const landlordId = req.user?.landlords?.id;
            const application = await ApplicationService.getApplicationsForLandlordWithStatus(landlordId, ApplicationStatus.PENDING);
            return res.status(200).json({ application });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getApplicationsCompleted = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const application = await ApplicationService.getApplicationsForLandlordWithStatus(landlordId, ApplicationStatus.COMPLETED);
            return res.status(200).json({ application });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getTotalApplication = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const application = await ApplicationService.getApplicationsForLandlordWithStatus(landlordId);
            return res.status(200).json({ application });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    makeApplicationPaymentRequest = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params?.applicationId;
            const application = await ApplicationService.updateApplicationStatus(applicationId, ApplicationStatus.MAKEPAYMENT);
            if (!application) return res.status(400).json({ message: "application doesn't exist" });

            try {
                const fullApp = await applicantService.getApplicationById(applicationId);
                const { notifyMoveInPaymentRequested } = await import(
                    '../../services/leasingNotification.service'
                );
                await notifyMoveInPaymentRequested({
                    applicantUserId: fullApp?.userId || fullApp?.user?.id,
                    actorUserId: req.user?.id,
                    applicationId,
                    propertyName:
                        fullApp?.properties?.name ||
                        fullApp?.applicationInvites?.properties?.name,
                });
            } catch (notifyError) {
                console.error('Failed to notify applicant of move-in payment request:', notifyError);
            }

            return res.status(200).json({ application });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    declineApplication = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params?.applicationId;
            const application = await ApplicationService.updateApplicationStatus(applicationId, ApplicationStatus.DECLINED);
            if (!application) return res.status(400).json({ message: "property doesn't exist" });

            try {
                const fullApp = await applicantService.getApplicationById(applicationId);
                const applicantUserId = fullApp?.userId || fullApp?.user?.id;
                if (applicantUserId) {
                    const { notifyUser } = await import('../../services/notify');
                    await notifyUser({
                        userId: applicantUserId,
                        sourceId: req.user?.id,
                        type: 'application_declined',
                        message: 'Your property application was declined.',
                        route: `/dashboard/applications/${applicationId}/progress`,
                    });
                }
            } catch (notifyError) {
                console.error('Failed to notify applicant of decline:', notifyError);
            }

            return res.status(200).json({
                message: "Application declined successfully",
                action: "DECLINED",
                application
            });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    // Controller: approveApplicationAndCreateTenant
    approveApplicationAndCreateTenant = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const applicationId = req.params?.applicationId;

            if (!applicationId) {
                return res.status(400).json({ message: "applicationId is required" });
            }

            const application = await ApplicationService.getApplicationById(applicationId);
            if (!application) {
                return res.status(404).json({ message: "Application doesn't exist" });
            }

            const latestAgreement = Array.isArray(application.agreementDocument)
              ? application.agreementDocument[application.agreementDocument.length - 1]
              : null;
            if (
              latestAgreement?.id &&
              !(await applicantService.isAgreementFullySigned(latestAgreement.id))
            ) {
              return res.status(400).json({
                message:
                  "Cannot create tenant until both tenant and landlord have signed the lease agreement.",
              });
            }

            const existingTenant = await prismaClient.tenants.findFirst({
                where: { applicationId },
            });
            if (existingTenant) {
                return res.status(200).json({
                    message: "Tenant already created for this application",
                    tenant: existingTenant,
                });
            }

            // Approve invite
            await ApplicationInvitesService.updateInvite(
                application.applicationInviteId,
                { response: InvitedResponse.APPROVED }
            );

            const tenantWebUserEmail = application?.user?.email;
            if (!tenantWebUserEmail) {
                return res.status(400).json({ message: "Application is missing user email" });
            }

            const landlord = await this.landlordService.getLandlordById(landlordId);
            if (!landlord) {
                return res.status(403).json({ message: "Login as a landlord" });
            }

            // Resolve property (required for tenant): application.propertiesId or invite's propertiesId
            const propertyId =
                application.propertiesId ??
                application.applicationInvites?.propertiesId ?? null;
            if (!propertyId) {
                return res.status(400).json({
                    message: "Cannot create tenant: application is not linked to a property. Link the application to a property first.",
                });
            }

            const propertyListingId =
                application.propertyListingId ??
                application.applicationInvites?.propertyListingId ??
                application.applicationInvites?.enquires?.propertyListingId ??
                null;

            const { leaseStartDate, leaseEndDate, initialDeposit } =
                resolveLeaseDatesFromApplication(application);

            // Pass property, unit, room separately
            const tenant = await userServices.createUser(
                {
                    ...req.body,
                    email: tenantWebUserEmail,
                    userId: application?.user?.id,
                    tenantWebUserEmail,
                    propertyId,
                    propertyListingId,
                    unitId: application.applicationInvites?.unitId,
                    roomId: application.applicationInvites?.roomId,
                    applicationId,
                    role: userRoles.TENANT,
                    landlordId,
                    leaseStartDate,
                    leaseEndDate,
                    initialDeposit,
                },
                false,
                req.user?.id,
                true
            );

            if (!tenant) {
                return res.status(400).json({ message: "Tenant not created" });
            }

            await applicantService.copyApplicationDataToTenant(applicationId);

            const applicationForMilestones = await loadApplicationForTenantCopy(applicationId);
            if (applicationForMilestones) {
                await seedTenantOnboardingMilestones({
                    application: applicationForMilestones,
                    tenantId: tenant.id,
                    propertyId,
                    unitId: application.applicationInvites?.unitId,
                    roomId: application.applicationInvites?.roomId,
                    createdById: req.user?.id,
                });
            }

            if (landlordId) {
                try {
                    const globalSettings =
                        await LandlordSettingsService.getAllGlobalSettings(landlordId);
                    if (globalSettings?.autoCreateRentBill) {
                        const property = await prismaClient.properties.findUnique({
                            where: { id: propertyId },
                            select: { price: true, priceFrequency: true },
                        });
                        const rent = Number(property?.price ?? 0);
                        if (rent > 0) {
                            const { resolveFinancialRules, resolveDefaultRentDueDate } =
                                await import('../../utils/globalSettings.util');
                            const rules = resolveFinancialRules(
                                globalSettings,
                                rent,
                                property?.priceFrequency
                            );
                            const billTemplateService = (
                                await import('../../services/billTemplate.service')
                            ).default;
                            const rentBill = await billTemplateService.createInitialRentBill({
                                landlordId,
                                propertyId,
                                tenantId: tenant.id,
                                rent,
                                dueDate: resolveDefaultRentDueDate(rules, leaseStartDate ?? new Date()),
                            });
                            const { serverInstance } = await import('../..');
                            if (rentBill && serverInstance.paymentNotificationService) {
                                await serverInstance.paymentNotificationService.sendNewBillNotification(
                                    rentBill.id
                                );
                            }
                        }
                    }
                } catch (billError) {
                    console.error('Auto-create rent bill failed:', billError);
                }
            }

            return res.status(200).json({
                message: "Tenant created successfully",
                tenant,
            });
        } catch (error: any) {
            console.error("Error in approveApplicationAndCreateTenant:", error);
            return res.status(500).json({
                message: "Internal server error",
                error: error.message || error,
            });
        }
    };


    createInvite = async (req: CustomRequest, res: Response) => {
        try {
            const enquiryId = req.params?.enquiryId;
            // check enquiryId,
            const enquire = await logsServices.getLogsById(enquiryId)
            if (!enquire) {
                return res.status(400).json({ message: "invalid enquire id" });
            }
            const value = req.body
            const invitedByLandordId = req.user?.landlords?.id;
            const { ...rest } = value

            const { propertyId, propertyListingId, unitId, roomId } = enquire

            const invite = await ApplicationInvitesService.createInvite({
                ...rest,
                invitedByLandordId,
                propertyListingId,
                enquiryId,
                responseStepsCompleted: value.response ? [value.response] : [InvitedResponse.PENDING]
            }, { propertyId, unitId, roomId, propertyListingId },);

            const property = await propertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }
            const userExist = await userServices.getUserById(value.userInvitedId);
            if (!userExist) {
                return res.status(404).json({ message: 'user not found' });
            }
            // TODO:
            // send message to the tenants
            const tenantInfor = await TenantService.getUserInfoByTenantId(value.tenantId);
            const htmlContent = `
                <h2>Invitation for Property Viewing</h2>
                <p>Hello,</p>
                <p>You have been invited to a property viewing. Here are the details:</p>
                <ul>
                <li><strong>Scheduled Date:</strong> ${value?.scheduleDate ? value?.scheduleDate : "To be determined"}</li>
                <li><strong>Status:</strong> PENDING</li>
                </ul>
                <p>Please respond to this invitation as soon as possible.</p>
            `;

            // Send email in background - don't fail the request if email fails
            Emailer(userExist.email, "Asher Rentals Invites", htmlContent).catch((emailError) => {
                logger.error('Failed to send invitation email:', emailError);
            });

            try {
                const { notifyUser } = await import('../../services/notify');
                await notifyUser({
                    userId: value.userInvitedId,
                    sourceId: req.user?.id,
                    type: 'viewing_invite',
                    title: 'Property Viewing Invite',
                    message: value?.scheduleDate
                        ? `You have been invited to a property viewing on ${value.scheduleDate}.`
                        : 'You have been invited to a property viewing. Please respond in your dashboard.',
                    route: `/dashboard/property-viewings/${invite.id}`,
                });
            } catch (notifyError) {
                console.error('Failed to notify invitee of viewing invite:', notifyError);
            }

            await logsServices.updateLog(enquiryId, { status: logTypeStatus.INVITED });
            await propertyServices.syncEnquiryStatusByLogId(enquiryId, EnquiryStatus.RESPONDED);
            return res.status(201).json({ invite });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    createInviteForExistingUser = async (req: CustomRequest, res: Response) => {
        try {
            const { error, value } = createApplicationInviteSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });
            const invitedByLandordId = req.user?.landlords?.id;

            const entityId = value.propertyId;
            const property = await propertyServices.searchPropertyUnitRoom(entityId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
            }

            const userExist = await userServices.getUserById(value.userInvitedId);
            if (!userExist) {
                return res.status(404).json({ message: 'user not found' });
            }
            const enquire = await logsServices.createLog({ status: logTypeStatus.INVITED, type: LogType.APPLICATION, events: "Application Invites", createdById: userExist?.id })
            const { propertiesId, ...rest } = value

            // check for property existance
            const propertyExist = await propertyServices.searchPropertyUnitRoom(propertiesId);
            if (!propertyExist) return res.status(404).json({ message: `property with the id : ${propertiesId} doesn't exist` });


            const { type, data } = propertyExist;

            // Only one of these will be assigned, others remain undefined
            const id = data.id;
            const propertyId = type === 'property' ? id : undefined;
            const unitId = type === 'unit' ? id : undefined;
            const roomId = type === 'room' ? id : undefined;

            let resolvedListingId = value.propertyListingId ?? null;
            if (!resolvedListingId && propertyId) {
                const activeListing = await prismaClient.propertyListingHistory.findFirst({
                    where: {
                        propertyId,
                        isActive: true,
                        onListing: true,
                    },
                    orderBy: { createdAt: "desc" },
                    select: { id: true },
                });
                resolvedListingId = activeListing?.id ?? null;
            }

            const invite = await ApplicationInvitesService.createInvite({
                ...rest,
                invitedByLandordId,
                userInvitedId: userExist?.id,
                enquiryId: enquire?.id,
                propertyListingId: resolvedListingId,
                responseStepsCompleted: value.response ? [value.response] : [InvitedResponse.PENDING]
            }, {
                propertyId,
                unitId,
                roomId,
                propertyListingId: resolvedListingId,
            },);

            // send message to the tenants
            const htmlContent = `
                <h2>Invitation for Property Viewing</h2>
                <p>Hello,</p>
                <p>You have been invited to a property viewing. Here are the details:</p>
                <ul>
                <li><strong>Scheduled Date:</strong> ${value?.scheduleDate ? value?.scheduleDate : "To be determined"}</li>
                <li><strong>Status:</strong> PENDING</li>
                </ul>
                <p>Please respond to this invitation as soon as possible.</p>
            `;

            // Send email in background - don't fail the request if email fails
            Emailer(userExist?.email, "Asher Rentals Invites", htmlContent).catch((emailError) => {
                logger.error('Failed to send invitation email:', emailError);
                // Log the error but don't throw - invite creation should still succeed
            });

            try {
                if (userExist?.id) {
                    const { notifyUser } = await import('../../services/notify');
                    await notifyUser({
                        userId: userExist.id,
                        sourceId: req.user?.id,
                        type: 'viewing_invite',
                        title: 'Property Viewing Invite',
                        message: value?.scheduleDate
                            ? `You have been invited to a property viewing on ${value.scheduleDate}.`
                            : 'You have been invited to a property viewing. Please respond in your dashboard.',
                        route: `/dashboard/property-viewings/${invite.id}`,
                    });
                }
            } catch (notifyError) {
                console.error('Failed to notify invitee of viewing invite:', notifyError);
            }

            return res.status(201).json({ invite });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getInvite = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const rawInvite = await ApplicationInvitesService.getInviteById(id);
            if (!rawInvite) return res.status(404).json({ message: 'Invite not found' });

            // Normalize the invite to include listing with hierarchy
            const normalizedInvite = await ViewingInviteNormalizer.normalize(rawInvite, req.user?.id);

            const landlordId = req.user?.landlords?.id;
            if (normalizedInvite?.application?.id) {
              await applicantService.reconcileAgreementWorkflowStatus(
                normalizedInvite.application.id
              );
              const refreshedInvite = await ApplicationInvitesService.getInviteById(id);
              if (refreshedInvite) {
                const refreshedNormalized =
                  await ViewingInviteNormalizer.normalize(refreshedInvite, req.user?.id);
                Object.assign(normalizedInvite, refreshedNormalized);
              }
            }
            const application = normalizedInvite?.application;
            const globalSettings = landlordId
              ? await LandlordSettingsService.getAllGlobalSettings(landlordId)
              : null;
            const marketCountry = application
              ? resolveApplicationMarketFromRecord(application)
              : resolveApplicationMarket(normalizedInvite?.properties?.country);
            const formConfig = getApplicationFormConfig(
              marketCountry,
              globalSettings?.minimumTenancyHistoryYears
            );

            return res.status(200).json({ invite: normalizedInvite, formConfig });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getInvites = async (req: CustomRequest, res: Response) => {
        try {
            const invitedByLandordId = req.user?.landlords?.id;
            // get all invites which has not reach application state
            const rawInvites = await ApplicationInvitesService.getInviteWithoutStatus(invitedByLandordId, [
                InvitedResponse.APPLY,
                InvitedResponse.FEEDBACK,
                // InvitedResponse.SCHEDULED,
                InvitedResponse.APPLICATION_STARTED,
                InvitedResponse.APPLICATION_NOT_STARTED
            ]);
            if (!rawInvites || rawInvites.length === 0) {
                return res.status(200).json({ invite: [] });
            }

            // Normalize all invites to include listing with hierarchy
            const normalizedInvites = await ViewingInviteNormalizer.normalizeMany(rawInvites, req.user?.id);

            return res.status(200).json({ invite: normalizedInvites });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    updateInvite = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const invite = await ApplicationInvitesService.getInviteById(id);

            if (!invite) {
                return res.status(404).json({ error: "No such application invite" });
            }

            // Validate request body
            const { error, value } = updateApplicationInviteSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }

            if (value.response) {
                const transitionCheck = validateLandlordInviteUpdate(
                    invite,
                    value.response
                );
                if (!transitionCheck.valid) {
                    return res.status(400).json({ error: transitionCheck.error });
                }
            }

            // Handle enquiry validation if present
            if (value.enquiryId) {
                const enquiry = await logsServices.getLogsById(value.enquiryId);
                if (enquiry.status === logTypeStatus.REJECTED) {
                    return res.status(400).json({ error: "Enquiry is already rejected" });
                }
            }

            if (
                [InvitedResponse.APPLY, InvitedResponse.RE_INVITED].includes(value.response) &&
                !value.enquiryId
            ) {
                return res.status(400).json({ error: "Enquiry ID is required for this response type" });
            }

            if (
                value.response === InvitedResponse.RESCHEDULED_ACCEPTED &&
                !value.reScheduleDate
            ) {
                return res.status(400).json({ error: "Reschedule date is required" });
            }

            const { enquiryId, ...updateDate } = value

            // Update invite with validated data
            const updatedInvite = await ApplicationInvitesService.updateInvite(id, updateDate, enquiryId);

            if (updateDate.response) {
                try {
                    const { notifyLandlordInviteResponse } = await import(
                        '../../services/leasingNotification.service'
                    );
                    await notifyLandlordInviteResponse({
                        invite: updatedInvite || invite,
                        response: updateDate.response,
                        actorUserId: req.user?.id,
                        applicationId:
                            updatedInvite?.application?.id ||
                            invite?.application?.id ||
                            null,
                    });
                } catch (notifyError) {
                    console.error('Failed to notify applicant of invite update:', notifyError);
                }
            }

            return res.status(200).json({ updatedInvite });

        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    getEnquiredProps = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords.id;
            const leasing = await logsServices.getLogs(
                landlordId,
                LogType.ENQUIRED,
                logTypeStatus.PENDING,
                { excludeEnquireStatus: EnquireStatus.EXISTING_TENANT }
            );
            return res.status(200).json({ leasing });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    // for rejection of enquire
    updateEnquireToRejected = async (req: CustomRequest, res: Response) => {
        try {
            const enquireId = req.params.enquireId;
            const landlordId = req.user?.landlords?.id;
            const enquiry = await logsServices.getLogsById(enquireId);

            const [leasingUpdated] = await Promise.all([
                logsServices.updateLog(enquireId, { status: logTypeStatus.REJECTED }),
                propertyServices.syncEnquiryStatusByLogId(enquireId, EnquiryStatus.CLOSED),
            ]);

            let applicationFeeRefund = null;
            if (landlordId && enquiry?.propertyId) {
                const [property, globalSettings] = await Promise.all([
                    propertyServices.getPropertiesById(enquiry.propertyId),
                    LandlordSettingsService.getAllGlobalSettings(landlordId),
                ]);
                const rent = Number(property?.price ?? 0);
                const rules = resolveFinancialRules(
                    globalSettings,
                    rent,
                    property?.priceFrequency
                );
                const [appSettings, listing] = await Promise.all([
                    LandlordSettingsService.syncApplicationSettingsFromGlobal(
                        landlordId,
                        enquiry.propertyId,
                        rent,
                        property?.priceFrequency
                    ),
                    prismaClient.propertyListingHistory.findFirst({
                        where: { propertyId: enquiry.propertyId, onListing: true, isActive: true },
                        orderBy: { createdAt: 'desc' },
                    }),
                ]);
                const feePaid = Number(
                    listing?.applicationFeeAmount ?? rules.applicationFeeAmount
                );
                const refundInfo = getApplicationFeeRefundInfo(rules);
                applicationFeeRefund = {
                    ...refundInfo,
                    suggestedRefundAmount: calculateApplicationFeeRefundAmount(feePaid, rules),
                    applicationFeePaid: feePaid,
                    propertyApplicationSettings: appSettings,
                };

                if (enquiry?.applicationId) {
                    try {
                        const refundResult =
                            await applicationFeeService.processRefundForRejectedApplication({
                                applicationId: enquiry.applicationId,
                                propertyId: enquiry.propertyId,
                                landlordId,
                            });
                        applicationFeeRefund = {
                            ...applicationFeeRefund,
                            refundProcessed: refundResult.refunded,
                            refundResult,
                        };
                    } catch (refundError) {
                        logger.warn('Application fee refund failed on enquiry rejection', refundError);
                        applicationFeeRefund = {
                            ...applicationFeeRefund,
                            refundProcessed: false,
                            refundError:
                                refundError instanceof Error
                                    ? refundError.message
                                    : 'Refund processing failed',
                        };
                    }
                }
            }

            try {
                const applicantUserId = enquiry?.createdById || null;
                if (applicantUserId) {
                    let propertyName: string | null = null;
                    if (enquiry?.propertyId) {
                        const prop = await propertyServices.getPropertiesById(enquiry.propertyId);
                        propertyName = prop?.name ?? null;
                    }
                    const { notifyEnquiryRejected } = await import(
                        '../../services/leasingNotification.service'
                    );
                    await notifyEnquiryRejected({
                        applicantUserId,
                        actorUserId: req.user?.id,
                        propertyName,
                    });
                }
            } catch (notifyError) {
                console.error('Failed to notify applicant of enquiry rejection:', notifyError);
            }

            return res.status(200).json({ leasingUpdated, applicationFeeRefund });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    deleteInvite = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            // check if the invites was created by the current landlord
            const invitedByLandordId = req.user?.landlords?.id;
            const createdByLandlord = await ApplicationInvitesService.getInviteById(id)
            if (createdByLandlord.invitedByLandordId != invitedByLandordId) return res.status(200).json({ message: "cannot delete invites not made by you" });
            const deletedInvite = await ApplicationInvitesService.deleteInvite(id, invitedByLandordId);
            return res.status(200).json({ deletedInvite });

        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getFeedbacks = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords.id;
            const rawFeedbacks = await logsServices.getLandlordLogs(landlordId, LogType.FEEDBACK, null);

            // Normalize each feedback by normalizing its associated invite
            const normalizedFeedbacks = await Promise.all(
                rawFeedbacks.map(async (feedback: any) => {
                    // Get the first applicationInvite if available
                    const firstInvite = feedback.applicationInvites?.[0];

                    if (firstInvite) {
                        // Fetch the full invite with all relations
                        const fullInvite = await ApplicationInvitesService.getInviteById(firstInvite.id);

                        if (fullInvite) {
                            // Normalize the invite to get listing with hierarchy
                            const normalizedInvite = await ViewingInviteNormalizer.normalize(fullInvite, req.user?.id);

                            // Add the normalized listing to the feedback
                            return {
                                ...feedback,
                                listing: normalizedInvite.listing
                            };
                        }
                    }

                    // If no invite or normalization failed, return feedback as-is
                    return feedback;
                })
            );

            return res.status(200).json({ feedbacks: normalizedFeedbacks });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    updateApplicationStatusStep = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params.id;

            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }

            const application: any = await applicantService.getApplicationById(applicationId);
            if (!application) {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${applicationId} does not exist`]
                });
            }

            const { error, value } = updateApplicationStatusSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });

            const currentStatuses = application?.statusesCompleted ?? [];
            if (
                currentStatuses.includes(ApplicationStatus.APPROVED) &&
                value.status === ApplicationStatus.DECLINED
            ) {
                return res.status(400).json({ error: "Application has been approved, cannot be declined" });
            }

            if (
                currentStatuses.includes(ApplicationStatus.DECLINED) &&
                value.status === ApplicationStatus.APPROVED
            ) {
                return res.status(400).json({ error: "Application has been declined, cannot be approved" });
            }

            const applicationInvite = await applicantService.updateApplicationStatusStep(
                applicationId,
                value.status
            );

            try {
                const applicantUserId = application?.userId || application?.user?.id;
                if (
                    applicantUserId &&
                    (value.status === ApplicationStatus.APPROVED ||
                        value.status === ApplicationStatus.DECLINED)
                ) {
                    const { notifyUser } = await import('../../services/notify');
                    const approved = value.status === ApplicationStatus.APPROVED;
                    await notifyUser({
                        userId: applicantUserId,
                        sourceId: req.user?.id,
                        type: approved
                            ? 'application_approved'
                            : 'application_declined',
                        message: approved
                            ? 'Your property application was approved. Check your dashboard for next steps.'
                            : 'Your property application was declined.',
                        route: `/dashboard/applications/${applicationId}/progress`,
                    });
                }
            } catch (notifyError) {
                console.error('Failed to notify applicant of application status:', notifyError);
            }

            const explicitMessage =
                value.status === ApplicationStatus.APPROVED
                    ? "Application approved successfully"
                    : value.status === ApplicationStatus.DECLINED
                        ? "Application declined successfully"
                        : `Application status updated to ${value.status}`;

            return res.status(200).json({
                message: explicitMessage,
                action: value.status,
                applicationInvite
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    sendApplicationReminder = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params.id;
            // Validate application ID
            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }
            const { error, value } = applicationReminderSchema.validate(req.body);
            if (error) {
                return res.status(400).json({ error: error.details[0].message });
            }
            // Verify application exists
            let application = null;

            if (
                value.status === ReminderType.REFERENCE_REMINDER ||
                value.status === ReminderType.APPLICATION_REMINDER
            ) {
                application = await applicantService.getApplicationById(applicationId);
            } else if (value.status === ReminderType.SCHEDULE_REMINDER) {
                application = await applicantService.getInvitedById(applicationId);
            }
            if (!application) {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${applicationId} does not exist`]
                });
            }

            // Check landlord authorization
            const landlordId = req.user.landlords.id;
            if (!landlordId) {
                return res.status(403).json({ error: "Unauthorized: Missing landlord information" });
            }
            // Check if the landlord is authorized to send reminders for this application
            const [landlord, applicationLandlord] = await Promise.all([
                this.landlordService.getLandlordById(landlordId),
                this.landlordService.getLandlordById(application.properties?.landlordId)
            ]);
            if (!landlord) {
                return res.status(403).json({ error: "Unauthorized: Landlord not found" });
            }
            // Check if the landlord is associated with the application
            if (!applicationLandlord) {
                return res.status(403).json({ error: "Unauthorized: Landlord not associated with this property application" });
            }
            // Get recipient email — applicant for app/reference reminders; invitee for schedule
            let recipientEmail = null;

            if (
                value.status === ReminderType.REFERENCE_REMINDER ||
                value.status === ReminderType.APPLICATION_REMINDER
            ) {
                recipientEmail = application.user.email;
            } else if (value.status === ReminderType.SCHEDULE_REMINDER) {
                recipientEmail = application.userInvited?.email;
            }

            if (!recipientEmail) {
                return res.status(400).json({
                    error: "Recipient email not found",
                    message: "Could not retrieve email address for the selected reminder type."
                });
            }
            // Define email content based on reminder type
            let subject = "";
            let htmlContent = "";
            const firstName = value.status === ReminderType.SCHEDULE_REMINDER
                ? application?.userInvited?.profile?.firstName
                : application?.user?.profile?.firstName;

            const userId = value.status === ReminderType.SCHEDULE_REMINDER
                ? application?.userInvited?.id
                : application?.user?.id;

            switch (value.status) {
                case ReminderType.REFERENCE_REMINDER:
                    subject = "Asher Reference Reminder";
                    htmlContent = `<p>Dear ${firstName}, you have a reference documents reminder.</p>`;
                    await logsServices.createLog({
                        applicationId,
                        subjects: "Reference Document Reminder",
                        events: "Please contact your reference to submit your documents as soon as possible.",
                        createdById: userId,
                        type: LogType.EMAIL,
                    });
                    break;
                case ReminderType.APPLICATION_REMINDER:
                    subject = "Asher Application Reminder";
                    htmlContent = `<p>Dear ${firstName}, you have an ongoing application notification reminder. Check your Asher dashboard.</p>`;
                    await logsServices.createLog({
                        applicationId,
                        subjects: "Application Reminder",
                        events: `Dear ${firstName}, you have an ongoing application for the property ${application?.properties?.name}`,
                        createdById: userId,
                        type: LogType.EMAIL,
                    });
                    break;
                case ReminderType.SCHEDULE_REMINDER:
                    subject = "Asher Schedule Reminder";
                    htmlContent = `<p>Dear ${firstName}, check your dashboard for an appointment scheduled.</p>`;
                    await logsServices.createLog({
                        applicationId,
                        subjects: "Schedule Reminder",
                        events: `Please confirm your scheduled appointment for ${application?.properties?.name}`,
                        createdById: userId,
                        type: LogType.EMAIL,
                    });
                    break;
            }

            // Reminder must go to applicant/invitee — not external guarantor/employer refs
            if (userId) {
                await sendPreferenceAwareMail({
                    userId,
                    category: NotificationCategory.COMMUNICATION,
                    notificationType: value.status,
                    to: recipientEmail,
                    subject,
                    html: htmlContent,
                }).catch((emailError) => {
                    logger.error('Failed to send reminder email:', emailError);
                });
            } else {
                await sendMail(recipientEmail, subject, htmlContent).catch((emailError) => {
                    logger.error('Failed to send reminder email:', emailError);
                });
            }
            return res.status(200).json({
                message: "Reminder sent successfully",
                details: { recipient: recipientEmail, type: value.status }
            });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    updateApplicationVerificationStatus = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params.id;
            const landlordId = req.user?.landlords?.id;
            // Validate application ID
            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }

            const screener = await ScreeningService.runApplicationScreening({
                applicationId,
                landlordId,
                triggeredByUserId: req.user?.id,
            });

            if (screener.overall === "BLOCKED") {
                return res.status(400).json({
                    error: "Application screening blocked",
                    details: screener.blockedReasons,
                    screener,
                });
            }

            return res.status(200).json({ screener });
        } catch (error) {
            if ((error as Error)?.message === "Application not found") {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${req.params.id} does not exist`]
                });
            }
            errorService.handleError(error, res);
        }
    };

    getApplicationScreeningRuns = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params.id;
            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }

            const screeningRuns = await ScreeningService.getScreeningRuns(applicationId);
            return res.status(200).json({ screeningRuns });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    getLatestApplicationScreeningRun = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params.id;
            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }

            const screeningRun = await ScreeningService.getLatestScreeningRun(applicationId);
            return res.status(200).json({ screeningRun });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    overrideApplicationScreeningCheck = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params.id;
            const { check, status, reason } = req.body;
            const validChecks = [
                "identity",
                "employment",
                "employmentResearch",
                "income",
                "credit",
                "guarantor",
                "referee",
                "landlord",
                "regional",
            ];
            const validStatuses = ["YES", "NO"];

            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }
            if (!validChecks.includes(check)) {
                return res.status(400).json({
                    error: "Invalid screening check",
                    details: [`check must be one of: ${validChecks.join(", ")}`],
                });
            }
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    error: "Invalid screening status",
                    details: ["status must be YES or NO"],
                });
            }
            if (!reason?.trim()) {
                return res.status(400).json({
                    error: "Override reason is required",
                    details: ["Manual screening overrides must include a reason"],
                });
            }

            const result = await ScreeningService.overrideScreeningCheck({
                applicationId,
                check,
                status,
                reason,
                triggeredByUserId: req.user?.id,
            });

            return res.status(200).json(result);
        } catch (error) {
            if ((error as Error)?.message === "Application not found") {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${req.params.id} does not exist`]
                });
            }
            errorService.handleError(error, res);
        }
    };

    recordApplicationCreditScreeningResult = async (req: CustomRequest, res: Response) => {
        try {
            const applicationId = req.params.id;
            const { status, reason, providerReferenceId, providerScore, providerName } = req.body;
            const validStatuses = ["YES", "NO", "PENDING"];

            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    error: "Invalid credit/background status",
                    details: ["status must be YES, NO, or PENDING"],
                });
            }
            if (!reason?.trim()) {
                return res.status(400).json({
                    error: "Credit/background result reason is required",
                    details: ["Credit/background updates must include a reason"],
                });
            }

            const result = await ScreeningService.recordCreditScreeningResult({
                applicationId,
                status,
                reason,
                providerReferenceId,
                providerScore:
                    providerScore != null && Number.isFinite(Number(providerScore))
                        ? Number(providerScore)
                        : undefined,
                providerName: typeof providerName === 'string' ? providerName.trim() : undefined,
                triggeredByUserId: req.user?.id,
            });

            return res.status(200).json(result);
        } catch (error) {
            if ((error as Error)?.message === "Application not found") {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${req.params.id} does not exist`]
                });
            }
            errorService.handleError(error, res);
        }
    };

    getCurrentLandlordAgreementForm = async (req: CustomRequest, res: Response) => {
        try {
            const agreementDocument = await new PropertyDocumentService().getManyDocumentBaseOnLandlord(req.user.landlords.id, DocumentType.AGREEMENT_DOC)
            return res.status(200).json({ agreementDocument });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    sendAgreementForm = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        try {
            if (!landlordId) {
                return res.status(403).json({ error: 'kindly login' });
            }
            const { applicationCreator, ...value } = req.body;
            const applicationId = req.params.id;
            // Validate application ID
            if (!applicationId) {
                return res.status(400).json({
                    error: "Application ID is required",
                    details: ["Missing application ID in URL parameters"]
                });
            }
            // Fetch application
            const application = await applicantService.getApplicationById(applicationId);
            if (!application) {
                return res.status(404).json({
                    error: "Application not found",
                    details: [`Application with ID ${applicationId} does not exist`]
                });
            }
            // Application may have propertiesId null when created from "View Application" (invite flow); resolve via invite
            let actualLandlordId = application.properties?.landlordId;
            let inviteForProperty: Awaited<ReturnType<typeof ApplicationInvitesService.getInviteById>> = null;
            if (actualLandlordId == null && application.applicationInviteId) {
                inviteForProperty = await ApplicationInvitesService.getInviteById(application.applicationInviteId);
                actualLandlordId = inviteForProperty?.properties?.landlordId ?? inviteForProperty?.invitedByLandordId ?? undefined;
            }
            if (req.user.landlords.id !== actualLandlordId) {
                return res.status(403).json({
                    error: "Unauthorized",
                    message: "You can only send agreement forms for applications on your own properties."
                });
            }
            const propertyName = application?.properties?.name ?? inviteForProperty?.properties?.name ?? 'Property';

            if (applicationCreator) {

            }
            // Get recipient email
            const recipientEmail = application.user.email;
            if (!recipientEmail) {
                return res.status(400).json({
                    error: "Missing recipient email",
                    message: "The applicant's email is required to send the agreement form."
                });
            }
            const documentUrlModified = value.documentUrls;

            // Build HTML content
            const htmlContent = `
            <div style="font-family: Arial, sans-serif;">
              <h2>Agreement Form Notification</h2>
              <p>Hello,</p>
              <p>Please find the mail inbox on agreement form in your asher mailing box</p>
              <p>Best regards,<br/>Asher</p>
            </div>
          `;

            //send inhouse inbox
            const mailBox = await emailService.createEmail({
                senderEmail: req.user.email,
                receiverEmail: recipientEmail,
                body: `Hello, please find and complete the agreement form below: ${documentUrlModified}`,
                attachment: [documentUrlModified],
                subject: `${propertyName} Agreement Form`,
                senderId: req.user.id,
                receiverId: application.user.id,

            })

            if (!mailBox) {
                return res.status(400).json({ message: "mail not sent" })
            }

            // Combine all provided URLs into a single array
            const documentUrls = [
                ...(value.cloudinaryUrls || []),
                ...(value.cloudinaryAudioUrls || []),
                ...(value.cloudinaryVideoUrls || []),
                ...(value.cloudinaryDocumentUrls || [])
            ];

            // Extract needed values
            const { documentUrl = documentUrls[0], cloudinaryVideoUrls, cloudinaryUrls, cloudinaryAudioUrls, cloudinaryDocumentUrls, ...data } = value;

            // Send email in background - don't fail the request if email fails
            sendMail(recipientEmail, `${propertyName} Agreement Form`, htmlContent).catch((emailError) => {
                logger.error('Failed to send agreement form email:', emailError);
            });

            try {
                if (application.user?.id) {
                    const { notifyUser } = await import('../../services/notify');
                    await notifyUser({
                        userId: application.user.id,
                        sourceId: req.user.id,
                        type: 'application_agreement_sent',
                        title: 'Agreement Form Ready',
                        message: `Please review and sign the agreement for ${propertyName}.`,
                        route: '/dashboard',
                    });
                }
            } catch (notifyError) {
                console.error('Failed to notify applicant of agreement form:', notifyError);
            }

            await Promise.all([
                logsServices.createLog({
                    applicationId,
                    subjects: "Asher Agreement Letter",
                    events: `Please check your email for the agreement letter regarding your application for the property: ${propertyName}`,
                    createdById: application.user.id,
                    type: LogType.EMAIL,
                }),
                applicantService.upsertAgreementDocument({ ...data, documentUrl, applicationId }, req.user.id),
                // Update the application with the agreement document URL
                applicantService.updateApplicationStatusStep(applicationId, ApplicationStatus.AGREEMENTS)
            ])
            return res.status(200).json({
                message: "Agreement form email sent successfully",
                recipient: recipientEmail,
                agreementDocument: documentUrlModified
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

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
            const agreement = await applicantService.getAgreementById(agreementId);
            if (!agreement) {
                return res.status(404).json({
                    error: "Agreement not found",
                    details: [`Agreement with ID ${agreementId} does not exist`]
                });
            }

            // Get landlord info (fallback to invite's property or invite's landlord)
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

            // Authorization: only the property landlord may counter-sign
            const propertyLandlordId =
                app?.properties?.landlordId ??
                app?.applicationInvites?.properties?.landlordId ??
                null;
            const requestingLandlordId = req.user?.landlords?.id;

            if (!requestingLandlordId || requestingLandlordId !== propertyLandlordId) {
                return res.status(403).json({
                    error: "Unauthorized",
                    message: "Only the property landlord can counter-sign this agreement",
                });
            }

            if (!agreement.signedByTenantAt) {
                return res.status(400).json({
                    error: "Tenant signature required",
                    message: "The tenant must sign the agreement before the landlord can counter-sign.",
                });
            }

            if (agreement.signedByLandlordAt) {
                return res.status(400).json({
                    error: "Already signed",
                    message: "This agreement has already been counter-signed by the landlord.",
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
            const created = await applicantService.signAgreementDocumentLandlord(
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
          <h2>Agreement Counter-Signed</h2>
          <p>Hello,</p>
          <p>Your landlord has counter-signed the lease agreement.</p>
          <p>Best regards,<br/>Asher</p>
        </div>
      `;

            const tenantUser = agreement.application.user;
            if (tenantUser?.email) {
              await emailService.createEmail({
                senderEmail: landlord.user.email,
                receiverEmail: tenantUser.email,
                body: `Your landlord has counter-signed the lease agreement for ${agreement.application?.properties?.name ?? 'the property'}.`,
                attachment: documentUrls,
                subject: `Asher - ${agreement?.application.properties?.name} Agreement Counter-Signed`,
                senderId: req.user.id,
                receiverId: tenantUser.id,
              }).catch(() => undefined);

              sendPreferenceAwareMail({
                userId: tenantUser.id,
                category: NotificationCategory.COMMUNICATION,
                notificationType: 'agreement_counter_signed',
                to: tenantUser.email,
                subject: `Asher - ${agreement.application?.properties?.name} Agreement Counter-Signed`,
                html: htmlContent,
              }).catch((emailError) => {
                logger.error('Failed to send landlord counter-sign email:', emailError);
              });
            }

            try {
                const { notifyAgreementCounterSigned } = await import(
                    '../../services/leasingNotification.service'
                );
                await notifyAgreementCounterSigned({
                    applicantUserId: tenantUser?.id || agreement.application?.userId,
                    actorUserId: userId,
                    applicationId: agreement.applicationId,
                    propertyName: agreement.application?.properties?.name,
                });
            } catch (notifyError) {
                console.error('Failed to notify applicant of counter-sign:', notifyError);
            }

            await logsServices.createLog({
                applicationId: agreement.applicationId,
                subjects: "Landlord Agreement Counter-Signature",
                events: `Landlord counter-signed agreement for ${agreement.application?.properties?.name}`,
                createdById: userId,
                type: LogType.EMAIL,
            });

            return res.status(200).json({
                message: "Agreement counter-signed successfully",
                agreementDocument: created,
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

}
export default new ApplicationControls()
