import { Router } from "express";
import SuggestionController from '../controllers/suggestions.controller';
import { Authorize } from "../middlewares/authorize";

class SuggestionRoutes {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {

    // Define routes
    this.router.post('/', this.authenticateService.authorize, SuggestionController.createSuggestion);
    this.router.get('/', this.authenticateService.authorize, SuggestionController.getSuggestions);
    this.router.get('/stats', this.authenticateService.authorize, SuggestionController.getSuggestionStats);
    this.router.get('/:id', this.authenticateService.authorize, SuggestionController.getSuggestionById);
    this.router.put('/:id', this.authenticateService.authorize, SuggestionController.updateSuggestion);
    this.router.delete('/:id', this.authenticateService.authorize, SuggestionController.deleteSuggestion);
    }

   
}

export default new SuggestionRoutes().router;
