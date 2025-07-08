import { Router } from "express";
import DocusignController from '../controllers/docusign.controller';
import { Authorize } from "../middlewares/authorize";

class DocuSignRoutes {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize()
        this.router.use(this.authenticateService.authorize);
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Template operations
        this.router.post('/templates', DocusignController.createTemplate);
        this.router.get('/templates/:id', DocusignController.getTemplate);
        this.router.patch('/templates/:id', DocusignController.updateTemplate);
        this.router.delete('/templates/:id', DocusignController.deleteTemplate);
        
        // Version operations
        this.router.delete('/templates/version/:id', DocusignController.deleteTemplateVersion);
        this.router.post('/templates/:id/versions', DocusignController.createVersion);
        this.router.get('/templates/:id/versions', DocusignController.getTemplateVersions);
        this.router.get('/templates/:id/versions/:version', DocusignController.getTemplateVersion);

        // User-template operations
        this.router.post('/templates/assign', DocusignController.assignTemplate);
        this.router.get('/templates/user/mine', DocusignController.getUserTemplates);
        this.router.post('/templates/default', DocusignController.setDefaultTemplate);
    }
}

export default new DocuSignRoutes().router;
