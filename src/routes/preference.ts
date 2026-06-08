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
        this.router.get('/viewer-context', this.authenticateService.authorize, PreferencesController.getViewerContext);
        this.router.get('/options', PreferencesController.getPreferenceOptions);
        this.router.get('/', this.authenticateService.authorize, PreferencesController.getPreferences);
        this.router.patch('/', this.authenticateService.authorize, PreferencesController.updatePreferences);
        this.router.patch('/privacy', this.authenticateService.authorize, PreferencesController.updatePrivacySettings);
        this.router.get('/dashboard-layout', this.authenticateService.authorize, PreferencesController.getDashboardLayout);
        this.router.post('/dashboard-layout', this.authenticateService.authorize, PreferencesController.updateDashboardLayout);
        this.router.get('/onboarding-status', this.authenticateService.authorize, PreferencesController.getOnboardingStatus);
        this.router.post('/onboarding/skip-step', this.authenticateService.authorize, PreferencesController.skipOnboardingStep);
        this.router.post('/onboarding/complete', this.authenticateService.authorize, PreferencesController.completeOnboarding);
    }
}

export default new PreferenceRoutes().router;
