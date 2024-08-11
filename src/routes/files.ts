import { Router } from "express";
import FileControls from '../tenant/controllers/files.controller';
import { Authorize } from "../middlewares/authorize";

class FileRoute {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.get('/', FileControls.getAllDocuments);
        this.router.get('/me', FileControls.getUserDocuments);
    }

}

export default new FileRoute().router;
