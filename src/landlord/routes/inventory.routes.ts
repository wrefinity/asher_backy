import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import inventoryController from "../controllers/inventory.controller";

class InventoryRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.post('/', inventoryController.createInventory)
        this.router.get('/', inventoryController.getAllInventorys)
        this.router.get('/:inventoryId', inventoryController.getInventoryById)
        this.router.patch('/:inventoryId', inventoryController.updateInventory)
        this.router.delete('/:inventoryId', inventoryController.deleteInventory)
        this.router.get('/property/:propertyId', inventoryController.getAllInventorysByProperty)

    }
}

export default new InventoryRouter().router;