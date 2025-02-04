import { Router } from "express";
import LogControls from '../controllers/logs.controller'
import { Authorize } from "../middlewares/authorize";

class LogRoutes {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.post('/', this.authenticateService.authorize, LogControls.createLog);
        this.router.get('/property/:propertyId', LogControls.getProperyLog);
    }
}

export default new LogRoutes().router;