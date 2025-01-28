import { Router } from "express";
import billController from "../controllers/bill.controller";

class BillRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', billController.createBill)
        this.router.get('/list', billController.getAllBills)
        this.router.get('/:billId', billController.getSingleBill)
        this.router.get('/properties/:propertyId', billController.getBillByPropertyId)
        this.router.patch('/:billId', billController.updateBill)
        this.router.delete('/:billId', billController.deleteBill)
    }
}

export default new BillRouter().router;