import { Router } from "express";
import StatusControls from '../controllers/status.controller';
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
        this.router.get('/', StatusControls.getAllStatuses);
        this.router.get('/:id', StatusControls.getStatusById);
        this.router.post('/', this.authenticateService.authorize, StatusControls.createStatus);
        this.router.put('/:id', StatusControls.updateStatus);
        this.router.delete('/:id', StatusControls.deleteStatus);
    }

}

export default new ChatRoutes().router;
