import { Router } from "express";
import VendorServiceController from '../vendor/controllers/services.controller';
import { Authorize } from "../middlewares/authorize";

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
        this.router.post('/',this.authenticateService.authorize, VendorServiceController.createService);
        this.router.get('/', VendorServiceController.getAllServices);
        this.router.post('/category/:categoryId', this.authenticateService.authorize, VendorServiceController.getServicesByCategoryAndSubcategories);
        this.router.post('/offer/:categoryId', this.authenticateService.authorize, VendorServiceController.applyOffer);
        this.router.get('/:id', VendorServiceController.getService);
        this.router.patch('/:id', this.authenticateService.authorize, VendorServiceController.updateService);
        this.router.delete('/:id', this.authenticateService.authorize, VendorServiceController.deleteService);
    }

}

export default new VendorServiceRoutes().router;
