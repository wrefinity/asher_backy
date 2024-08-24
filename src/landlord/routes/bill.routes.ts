import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import billController from "../controllers/bill.controller";

class BillRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        this.router.post('/', billController.createBill)
        this.router.get('/', billController.getAllBills)
        this.router.get('/:billId', billController.getSingleBill)
        this.router.get('/:propertyId', billController.getBillByPropertyId)
        this.router.patch('/:billId', billController.updateBill)
        this.router.delete('/:billId', billController.deleteBill)

    }
}

export default new BillRouter().router;