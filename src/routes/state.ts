import { Router } from "express";
import StateControls from '../controllers/states.controller';
import { Authorize } from "../middlewares/authorize";

class StateRoutes {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.get('/', StateControls.getAllStates);
        this.router.get('/:id', StateControls.getStateById);
        this.router.post('/', this.authenticateService.authorize, StateControls.createState);
        this.router.patch('/:id', StateControls.updateState);
        this.router.delete('/:id', StateControls.deleteState);
    }

}

export default new StateRoutes().router;
