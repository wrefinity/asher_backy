import { Router } from "express";
import ComplainControls from '../controllers/complaint.controller';
import GlobalComplaintControls from '../../controllers/complaint.controller';
import { Authorize } from "../../middlewares/authorize";

class ComplaintRoute {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.get('/all', ComplainControls.getAllComplaints);
        this.router.get('/statistics', ComplainControls.getComplaintStatistics);
        this.router.patch('/complain/:id', ComplainControls.updateComplaint);
        this.router.get('/:complaintId/messages', GlobalComplaintControls.getMessages.bind(GlobalComplaintControls));
        this.router.post('/:complaintId/messages', GlobalComplaintControls.postMessage.bind(GlobalComplaintControls));
    }

}


export default new ComplaintRoute().router;
