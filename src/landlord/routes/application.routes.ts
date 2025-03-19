import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import ApplicationController from "../controllers/applicant.controller";


class ApplicationLandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }
    private initializeRoutes() {
        this.router.get('/pending', ApplicationController.getApplicationsPending);
        this.router.get('/completed', ApplicationController.getApplicationsCompleted);
        this.router.get('/total', ApplicationController.getTotalApplication);
        this.router.patch('/proceed-pay/:applicationId', ApplicationController.makeApplicationPaymentRequest);
        this.router.post('/approve/:applicationId', ApplicationController.approveApplication);
        this.router.patch('/decline/:applicationId', ApplicationController.declineApplication);
        this.router.get('/statistics', ApplicationController.getApplicationStatistics);

        this.router.get('/leasing', ApplicationController.getEnquiredProps);
        this.router.post('/invites', ApplicationController.createInvite);
        this.router.get('/invites', ApplicationController.getInvites);
        this.router.get('/invites/:id', ApplicationController.getInvite);
        this.router.patch('/invites/:id/update', ApplicationController.updateInvite);
        this.router.delete('/invites/:id', ApplicationController.deleteInvite);
        this.router.get('/invites/feedbacks', ApplicationController.getFeedbacks);

        /// feedbacks
    }
}

export default new ApplicationLandlordRouter().router