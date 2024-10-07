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
        this.router.get('/pending',  ApplicationController.getApplicationsPending);
        this.router.get('/completed',  ApplicationController.getApplicationsPending);
        this.router.patch('/proceed-pay/:applicationId',  ApplicationController.makeApplicationPaymentRequest);
        this.router.post('/approve/:applicationId',  ApplicationController.approveApplication);
        this.router.patch('/decline/:applicationId',  ApplicationController.declineApplication);
        this.router.get('/statistics',  ApplicationController.getApplicationStatistics);
        
    }
}

export default new ApplicationLandlordRouter().router