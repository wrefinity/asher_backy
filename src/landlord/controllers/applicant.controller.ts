import { Request, Response } from "express"
import errorService from "../../services/error.service"
import { CustomRequest } from "../../utils/types"
import ApplicationService from "../../webuser/services/applicantService"


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

}


export default new ApplicationControls()