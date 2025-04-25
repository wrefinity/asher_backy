import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import ApplicationController from "../controllers/applicant.controller";
import upload, { uploadcsv } from "../../configs/multer";
import { uploadToCloudinary } from "../../middlewares/multerCloudinary";


class ApplicationLandlordRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }
    private initializeRoutes() {
        this.router.patch('/statuses/:id', ApplicationController.updateApplicationStatusStep);
        this.router.patch('/reminder/:id', ApplicationController.sendApplicationReminder);
        this.router.get('/all', ApplicationController.getApplicationsWithInvites);
        this.router.get('/pending', ApplicationController.getApplicationsPending);
        this.router.get('/completed', ApplicationController.getApplicationsCompleted);
        this.router.get('/total', ApplicationController.getTotalApplication);
        this.router.patch('/proceed-pay/:applicationId', ApplicationController.makeApplicationPaymentRequest);
        this.router.post('/create-tenant/:applicationId', ApplicationController.approveApplicationAndCreateTenant);
        this.router.patch('/decline/:applicationId', ApplicationController.declineApplication);
        this.router.get('/statistics', ApplicationController.getApplicationStatistics);

        this.router.get('/leasing', ApplicationController.getEnquiredProps);
        this.router.patch('/leasing/reject/:enquireId', ApplicationController.updateEnquireToRejected);
        this.router.post('/invites/:enquiryId/enquire', ApplicationController.createInvite);
        this.router.post('/existing-user-invites/:userId', ApplicationController.createInviteForExistingUser);
        this.router.get('/invites', ApplicationController.getInvites);
        this.router.get('/invites/:id', ApplicationController.getInvite);
        this.router.patch('/invites/:id/update', ApplicationController.updateInvite);
        this.router.delete('/invites/:id', ApplicationController.deleteInvite);
        this.router.get('/invites/feedbacks/all', ApplicationController.getFeedbacks);

        /// screening phase
        // this.router.post('/send-agreement-doc/:id',  upload.array('files'), uploadToCloudinary, ApplicationController.sendAgreementForm);
        this.router.post('/send-agreement-doc/:id',  ApplicationController.sendAgreementForm);
        this.router.get('/get-agreement-doc',  ApplicationController.getCurrentLandlordAgreementForm);
        this.router.patch('/references/screening/:id', ApplicationController.updateApplicationVerificationStatus);
    }
}

export default new ApplicationLandlordRouter().router