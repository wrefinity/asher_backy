import { Router } from "express";
import inventoryController from "../controllers/inventory.controller";

class InventoryRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', inventoryController.createInventory)
        this.router.get('/', inventoryController.getAllInventorys)
        this.router.get('/:inventoryId', inventoryController.getInventoryById)
        this.router.patch('/:inventoryId', inventoryController.updateInventory)
        this.router.delete('/:inventoryId', inventoryController.deleteInventory)
        this.router.get('/property/:propertyId', inventoryController.getAllInventorysByProperty)
    }
}

export default new InventoryRouter().router;