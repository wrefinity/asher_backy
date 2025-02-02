import { Router } from "express";
import ComplaintController from '../controllers/complaint.controller';
import { Authorize } from "../middlewares/authorize";

class ChatRoutes {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/',  this.authenticateService.authorize, ComplaintController.createComplaint.bind(ComplaintController));
        this.router.get('/',  this.authenticateService.authorize, ComplaintController.getAllComplaints.bind(ComplaintController),);
        this.router.get('/:id',  this.authenticateService.authorize, ComplaintController.getComplaintById.bind(ComplaintController),);
    }

   
}

export default new ChatRoutes().router;
