import { Request, Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import ApplicationService from "../../webuser/services/applicantService"
import { ApplicationStatus } from "@prisma/client"


class ApplicationControls {

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
        const landlordId = req.user?.landlords?.id;
        const application = await ApplicationService.getPendingApplicationsForLandlord(landlordId);
        return res.status(200).json({ application });
    }
    getApplicationsCompleted = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        const application = await ApplicationService.getCompletedApplications(landlordId);
        return res.status(200).json({ application });
    }
    makeApplicationPaymentRequest = async (req: CustomRequest, res: Response) => {
        const applicationId = req.params?.applicationId;
        const application = await ApplicationService.updateApplicationStatus(applicationId, ApplicationStatus.MAKEPAYMENT);
        if (!application) return res.status(400).json({ message: "property doesn't exist" });
        return res.status(200).json({ application });
    } 
    declineApplication = async (req: CustomRequest, res: Response) => {
        const applicationId = req.params?.applicationId;
        const application = await ApplicationService.updateApplicationStatus(applicationId, ApplicationStatus.DECLINED);
        if (!application) return res.status(400).json({ message: "property doesn't exist" });
        return res.status(200).json({ application });
    } 
    approveApplication = async (req: CustomRequest, res: Response) => {
        const landlordId = req.user?.landlords?.id;
        const applicationId = req.params?.applicationId;
        const application = await ApplicationService.getApplicationById(applicationId);
        if (!application) return res.status(400).json({ message: "property doesn't exist" });
        const tenant = await ApplicationService.approveApplication({...req.body, applicationId, landlordId});
        return res.status(200).json({ tenant });
    } 

}


export default new ApplicationControls()