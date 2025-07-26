import { Router } from "express";
import PreferencesController from '../controllers/preference.controller';
import { Authorize } from "../middlewares/authorize";


class PreferenceRoutes {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize()
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/', this.authenticateService.authorize, PreferencesController.getPreferences);
        this.router.patch('/', this.authenticateService.authorize, PreferencesController.updatePreferences);
        this.router.patch('/privacy', this.authenticateService.authorize, PreferencesController.updatePrivacySettings)
    }
}

export default new PreferenceRoutes().router;
