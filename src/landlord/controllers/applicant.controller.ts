import { Response } from "express"
import { logTypeStatus, InvitedResponse } from "@prisma/client"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import ApplicationService from "../../webuser/services/applicantService"
import ApplicationInvitesService from '../../services/application.services';
import { LandlordService } from "../services/landlord.service";
import TenantService from '../../services/tenant.service';
import { ApplicationStatus, LogType } from "@prisma/client"
import { createApplicationInviteSchema, updateApplicationInviteSchema } from '../validations/schema/applicationInvitesSchema';
import Emailer from "../../utils/emailer";
import propertyServices from "../../services/propertyServices";
import logsServices from "../../services/logs.services";
import userServices from "../../services/user.services"

class ApplicationControls {
    private landlordService: LandlordService;

    constructor() {
        this.landlordService = new LandlordService();
    }

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
    // getApplicationsWithInvites = async (req: CustomRequest, res: Response) => {
    //     try {
    //         const landlordId = req.user.landlords.id;
    //         const completedStatuses = [
    //             InvitedResponse.PENDING,
    //             InvitedResponse.ACCEPTED,
    //             InvitedResponse.SCHEDULED,
    //             InvitedResponse.FEEDBACK,
    //             InvitedResponse.APPLY,
    //             // InvitedResponse.REJECTED,
    //             // InvitedResponse.APPLICATION_NOT_STARTED,
    //             // InvitedResponse.APPLICATION_STARTED,
    //             // InvitedResponse.VISITED,
    //             // InvitedResponse.NOT_VISITED,
    //         ];
    //         const application = await ApplicationInvitesService.getInvitesWithStatus(landlordId, completedStatuses);
    //         return res.status(200).json({ application });
    //     } catch (error) {
    //         errorService.handleError(error, res)
    //     }
    // }
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
    approveApplication = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const applicationId = req.params?.applicationId;
            // if (!req.body.email) return res.status(400).json({ message: "kindly supply the new tenant email" })
            const application = await ApplicationService.getApplicationById(applicationId);

            // get the tenant web user email 
            if (!application) return res.status(400).json({ message: "property doesn't exist" });

            // update application invite status to approve
            await ApplicationInvitesService.updateInvite(application.applicationInviteId, { response: InvitedResponse.APPROVED });

            const tenantWebUserEmail = application.user.email;
            const userEmail = tenantWebUserEmail.toString().split('@')[0];
            // get the current landlord email domain
            const landlord = await this.landlordService.getLandlordById(landlordId);
            if (!landlord) return res.status(403).json({ message: "login as a landlord" })

            const email = `${userEmail}${landlord.emailDomains}`;

            // TODO: check if tenant has been a tenant for the current landlord before and just update the property
            const tenant = await ApplicationService.approveApplication({
                ...req.body,
                email,
                tenantWebUserEmail,
                propertyId: application.propertiesId,
                applicationId,
                password: application?.personalDetails?.firstName,
                landlordId
            });
            return res.status(200).json({ tenant });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }


    createInvite = async (req: CustomRequest, res: Response) => {

        try {
            const enquiryId = req.params?.enquiryId;

            // check enquiryId,
            const enquire = await logsServices.getLogsById(enquiryId)
            if (!enquire) {
                return res.status(400).json({ message: "invalid enquire id" });
            }
            const { error, value } = createApplicationInviteSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });
            const invitedByLandordId = req.user?.landlords?.id;

            const invite = await ApplicationInvitesService.createInvite({
                ...value,
                invitedByLandordId,
                enquiryId,
                responseStepsCompleted: value.response ? [value.response] : [InvitedResponse.PENDING]
            });

            const propertyId = value.propertyId;
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
            await Emailer(tenantInfor.email, "Asher Rentals Invites", htmlContent)
            await logsServices.updateLog(enquiryId, { status: logTypeStatus.INVITED })
            return res.status(201).json({ invite });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getInvite = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const invite = await ApplicationInvitesService.getInviteById(id);
            if (!invite) return res.status(404).json({ message: 'Invite not found' });
            return res.status(200).json({ invite });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getInvites = async (req: CustomRequest, res: Response) => {
        try {
            const invitedByLandordId = req.user?.landlords?.id;
            // get all invites which has not reach application state
            const invite = await ApplicationInvitesService.getInviteWithoutStatus(invitedByLandordId, [
                InvitedResponse.APPLY,
                InvitedResponse.FEEDBACK,
                // InvitedResponse.SCHEDULED,
                InvitedResponse.APPLICATION_STARTED,
                InvitedResponse.APPLICATION_NOT_STARTED
            ]);
            if (!invite) return res.status(404).json({ message: 'Invite not found' });
            return res.status(200).json({ invite });
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
                const requiredSteps: InvitedResponse[] = [InvitedResponse.FEEDBACK, InvitedResponse.SCHEDULED, InvitedResponse.PENDING];
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
                    error: "This invitation is declined or rejected"
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
            const feedbacks = await logsServices.getLandlordLogs(landlordId, LogType.FEEDBACK, null);
            return res.status(200).json({ feedbacks });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
}


export default new ApplicationControls()