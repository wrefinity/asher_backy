import { Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import ApplicationService from "../../webuser/services/applicantService"
import ApplicationInvitesService from '../services/application.services';
import { LandlordService } from "../services/landlord.service";
import TenantService from '../../services/tenant.service';
import { ApplicationStatus } from "@prisma/client"
import { createApplicationInviteSchema, updateApplicationInviteSchema } from '../validations/schema/applicationInvitesSchema';
import Emailer from "../../utils/emailer";
import propertyServices from "../../services/propertyServices";

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
    getApplicationsPending = async (req: CustomRequest, res: Response) => {

        try {
            const landlordId = req.user?.landlords?.id;
            const application = await ApplicationService.getPendingApplicationsForLandlord(landlordId);
            return res.status(200).json({ application });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }
    getApplicationsCompleted = async (req: CustomRequest, res: Response) => {
        try {
            const landlordId = req.user?.landlords?.id;
            const application = await ApplicationService.getCompletedApplications(landlordId);
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
            const tenantWebUserEmail = application.user.email;
            const userEmail = tenantWebUserEmail.toString().split('@')[0];
            // get the current landlord email domain
            const landlord = await this.landlordService.getLandlordById(landlordId);
            if(!landlord) return res.status(403).json({message: "login as a landlord"})

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
            const { error, value } = createApplicationInviteSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });
            const invitedByLandordId = req.user?.landlords?.id;
            const invite = await ApplicationInvitesService.createInvite({ ...value, invitedByLandordId });
            const propertyId = value.propertyId;
            const property = await propertyServices.getPropertyById(propertyId);
            if (!property) {
                return res.status(404).json({ message: 'Property not found' });
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
            return res.status(201).json({ invite });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    getInvite = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const invitedByLandordId = req.user?.landlords?.id;
            const invite = await ApplicationInvitesService.getInvite(id, invitedByLandordId);
            if (!invite) return res.status(404).json({ message: 'Invite not found' });
            return res.status(200).json({ invite });
        } catch (error) {
            errorService.handleError(error, res)
        }
    }

    updateInvite = async (req: CustomRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { error, value } = updateApplicationInviteSchema.validate(req.body);
            if (error) return res.status(400).json({ error: error.details[0].message });
            const updatedInvite = await ApplicationInvitesService.updateInvite(id, value);
            return res.status(200).json({ updatedInvite });
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
}


export default new ApplicationControls()