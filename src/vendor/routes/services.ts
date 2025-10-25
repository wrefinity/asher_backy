import { Router } from "express";
import VendorServiceController from '../controllers/services.controller';
import { Authorize } from "../../middlewares/authorize";
import { userRoles } from "@prisma/client";
import { validateBody } from "../../middlewares/validation";
import { serviceSchema } from "../validations/schema";

class VendorServiceRoutes {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.use(this.authenticateService.authorize);
        this.router.post('/', validateBody(serviceSchema), VendorServiceController.createService);
        this.router.get('/', VendorServiceController.getAllServices);
        this.router.post('/category/:categoryId', this.authenticateService.authorize, VendorServiceController.getServicesByCategoryAndSubcategories);
        this.router.post('/offer/:categoryId', this.authenticateService.authorize, VendorServiceController.applyOffer);
        this.router.get('/:id', VendorServiceController.getService);
        this.router.patch('/:id', VendorServiceController.updateService);
        this.router.delete('/:id', VendorServiceController.deleteService);
        
    }

}

export default new VendorServiceRoutes().router;