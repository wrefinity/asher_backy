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
        this.router.post('/upload', billController.bulkUploadBills)
        this.router.post('/category', billController.createBillCategory)
        this.router.get('/categories', billController.getBillsCategories)
        this.router.get('/catalog', billController.getBillCatalog)
        this.router.post('/catalog/seed', billController.seedBillCatalog)
        this.router.get('/property/:propertyId/templates', billController.getPropertyBillTemplates)
        this.router.post('/from-template', billController.createBillFromTemplate)
        this.router.get('/list', billController.getAllBills)
        this.router.get('/:billId', billController.getSingleBill)
        this.router.patch('/:billId', billController.updateBill)
        this.router.delete('/:billId', billController.deleteBill)
    }
}

export default new BillRouter().router;