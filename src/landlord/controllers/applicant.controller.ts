import { Response } from "express"
import { logTypeStatus, InvitedResponse, YesNo, DocumentType, userRoles, application } from "@prisma/client"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import ApplicationService from "../../webuser/services/applicantService"
import ApplicationInvitesService from '../../services/application.services';
import { LandlordService } from "../services/landlord.service";
import TenantService from '../../services/tenant.service';
import { ApplicationStatus, LogType } from "@prisma/client"
import { ReminderType, createApplicationInviteSchema, applicationReminderSchema, updateApplicationInviteSchema, agreementDocumentSchema, updateApplicationStatusSchema, updateAgreementSchema } from '../validations/schema/applicationInvitesSchema';
import Emailer from "../../utils/emailer";
import propertyServices from "../../services/propertyServices";
import logsServices from "../../services/logs.services";
import userServices from "../../services/user.services"
import sendMail from "../../utils/emailer"
import applicantService from "../../webuser/services/applicantService"
import { PropertyDocumentService } from "../../services/propertyDocument.service"
import emailService from "../../services/emailService"
import { ApiError } from "../../utils/ApiError"
import { asyncHandler } from "../../utils/asyncHandler"
import { ApiResponse } from "../../utils/ApiResponse"
import logger from "../../utils/loggers"
import { ViewingInviteNormalizer } from "../../utils/ViewingInviteNormalizer"

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
            return res.status(200).json({ application });
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

            // Pass property, unit, room separately
            const tenant = await userServices.createUser(
                {
                    ...req.body,
                    email: tenantWebUserEmail,
                    userId: application?.user?.id,
                    tenantWebUserEmail,
                    propertyId: application.propertiesId,
                    unitId: application.applicationInvites.unitId,
                    roomId: application.applicationInvites.roomId,
                    applicationId,
                    role: userRoles.TENANT,
                    password: application?.personalDetails?.firstName,
                    landlordId,
                },
                false,
                req.user?.id,
                true
            );

            if (!tenant) {
                return res.status(400).json({ message: "Tenant not created" });
            }

            await applicantService.updateApplicationStatusStep(
                applicationId,
                ApplicationStatus.TENANT_CREATED
            );
            await applicantService.copyApplicationDataToTenant(applicationId);

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
            }, { propertyId, unitId, roomId },);

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
            
            await logsServices.updateLog(enquiryId, { status: logTypeStatus.INVITED })
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

            const invite = await ApplicationInvitesService.createInvite({
                ...rest,
                invitedByLandordId,
                userInvitedId: userExist?.id,
                enquiryId: enquire?.id,
                responseStepsCompleted: value.response ? [value.response] : [InvitedResponse.PENDING]
            }, { propertyId, unitId, roomId },);

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
            const normalizedInvite = await ViewingInviteNormalizer.normalize(rawInvite);
            
            return res.status(200).json({ invite: normalizedInvite });
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
            const normalizedInvites = await ViewingInviteNormalizer.normalizeMany(rawInvites);
            
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

            if (value.response === InvitedResponse.APPLY) {
                // Check if states has PENDING, SCHEDULED, and FEEDBACK steps are completed
                const requiredSteps: InvitedResponse[] = [InvitedResponse.FEEDBACK, InvitedResponse.AWAITING_FEEDBACK, InvitedResponse.PENDING];
                // Verify that all required steps are included in responseStepsCompleted
                const hasAllRequiredSteps = requiredSteps.every(step =>
                    invite.responseStepsCompleted?.includes(step)
                );
                if (!hasAllRequiredSteps) {
                    return res.status(400).json({
                        error: "Application requires completion of SCHEDULING, FEEDBACK, and PENDING steps before prompting the user to apply"
                    });
                }
            }

            // Check response steps history
            const hasForbiddenHistory = invite.responseStepsCompleted?.some(step =>
                ([InvitedResponse.DECLINED, InvitedResponse.REJECTED] as InvitedResponse[]).includes(step)
            );

            if (hasForbiddenHistory) {
                return res.status(400).json({
                    error: "This invitation was declined or rejected"
                });
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
            return res.status(200).json({ updatedInvite });

        } catch (error) {
            errorService.handleError(error, res);
        }
    };

    getEnquiredProps = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user.landlords.id;
            const leasing = await logsServices.getLogs(landlordId, LogType.ENQUIRED, logTypeStatus.PENDING);
            return res.status(200).json({ leasing });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    // for rejection of enquire
    updateEnquireToRejected = async (req: CustomRequest, res: Response) => {
        try {
            const enquireId = req.params.enquireId;
            const leasingUpdated = await logsServices.updateLog(enquireId, { status: logTypeStatus.REJECTED });
            return res.status(200).json({ leasingUpdated });
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
                            const normalizedInvite = await ViewingInviteNormalizer.normalize(fullInvite);
                            
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

            return res.status(200).json({ applicationInvite });
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
            // Get recipient email
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

            // Send email in background - log is already created, so reminder is tracked even if email fails
            sendMail(recipientEmail, subject, htmlContent).catch((emailError) => {
                logger.error('Failed to send reminder email:', emailError);
            });

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
            // Ensure required fields are not null
            if (!application.referenceForm || !application.guarantorAgreement || !application.employeeReference) {
                return res.status(400).json({
                    error: "your reference form is not yet completed",
                    details: {
                        referenceForm: application.referenceForm ? "Provided" : "Missing",
                        guarantorAgreement: application.guarantorAgreement ? "Provided" : "Missing",
                        employeeReference: application.employeeReference ? "Provided" : "Missing"
                    }
                });
            }
            // Perform screenings
            // const landlordScreeningResult = await landlordScreener(application);
            // const guarantorScreeningResult = await guarantorScreener(application);
            // const employmentScreeningResult = await employmentScreener(application);

            // // Consolidate screening results
            // const allScreeningsPassed = landlordScreeningResult && guarantorScreeningResult && employmentScreeningResult;

            // if (!allScreeningsPassed) {
            //     return res.status(400).json({
            //         error: "Application verification failed",
            //         details: {
            //             landlordScreening: landlordScreeningResult,
            //             guarantorScreening: guarantorScreeningResult,
            //             employmentScreening: employmentScreeningResult
            //         }
            //     });
            // }

            // Proceed with updating verification status if all screenings passed
            const screener = await ApplicationInvitesService.updateVerificationStatus(applicationId, {
                employmentVerificationStatus: YesNo.YES,
                incomeVerificationStatus: YesNo.YES,
                creditCheckStatus: YesNo.YES,
                landlordVerificationStatus: YesNo.YES,
                guarantorVerificationStatus: YesNo.YES,
                refereeVerificationStatus: YesNo.YES,
            });


            return res.status(200).json({ screener });
        } catch (error) {
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
            const {applicationCreator, ...value} = req.body;
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
            const actualLandlordId = application.properties?.landlordId;
            if (req.user.landlords.id !== actualLandlordId) {
                return res.status(403).json({
                    error: "Unauthorized",
                    message: "You can only send agreement forms for applications on your own properties."
                });
            }

            if(applicationCreator){

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
                subject: `${application?.properties?.name} Agreement Form`,
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
            sendMail(recipientEmail, `${application?.properties?.name} Agreement Form`, htmlContent).catch((emailError) => {
                logger.error('Failed to send agreement form email:', emailError);
            });
            
            await Promise.all([
                logsServices.createLog({
                    applicationId,
                    subjects: "Asher Agreement Letter",
                    events: `Please check your email for the agreement letter regarding your application for the property: ${application?.properties?.name}`,
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
            await applicantService.updateApplicationStatusStep(
                agreement.applicationId,
                ApplicationStatus.AGREEMENTS_SIGNED
            );

            return res.status(200).json({
                message: "Agreement letter signed and sent successfully",
                recipient: landlord.user.email,
                agreementDocument: documentUrls
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    };

}
export default new ApplicationControls()