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
        this.router.post('/category', billController.createBillCategory)
        this.router.get('/categories', billController.getBillsCategories)
        this.router.get('/list', billController.getAllBills)
        this.router.get('/:billId', billController.getSingleBill)
        this.router.patch('/:billId', billController.updateBill)
        this.router.delete('/:billId', billController.deleteBill)
    }
}

export default new BillRouter().router;