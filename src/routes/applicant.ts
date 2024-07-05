import { Router } from "express";
import ApplicantControls from '../webuser/controllers/applicant';

class ApplicantRoutes {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/', ApplicantControls.createApplicant);
        this.router.get('/:id', ApplicantControls.getApplicant);
        this.router.put('/:id', ApplicantControls.updateApplicant);
        this.router.delete('/:id', ApplicantControls.deleteApplicant);
    }
}

export default new ApplicantRoutes().router;
