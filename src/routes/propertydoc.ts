import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import propertyDocument from "../controllers/propertyDocument.controller";

class PropertyDocsRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.post(
            '/',
            propertyDocument.create
        );

        this.router.get(
            '/',
            propertyDocument.findAll
        );

        this.router.get(
            '/:id',
            propertyDocument.findById
        );

        this.router.put(
            '/:id',
            propertyDocument.update
        );

        this.router.delete(
            '/:id',
            propertyDocument.delete
        );
    }
}

export default new PropertyDocsRouter().router