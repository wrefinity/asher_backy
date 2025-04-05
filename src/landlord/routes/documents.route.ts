import { Router } from "express";
import DocumentController from "../../controllers/document.controller";
import upload from "../../configs/multer";

class DocumentRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', upload.array('files'), DocumentController.create)
        this.router.get('/docs', DocumentController.getter)
    }
}

export default new DocumentRouter().router;