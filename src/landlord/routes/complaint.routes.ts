import { Router } from "express";
import ComplainControls from '../controllers/complaint.controller';
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
        this.router.patch('/complain/:id', ComplainControls.updateComplaint);
    }

}


export default new ComplaintRoute().router;
