import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import landlordTransactionController from "../controllers/landlord-transaction.controller";
class LandlordTransactionRouter {
    public router: Router;
    authenticateService: Authorize

    constructor() {
        this.router = Router()
        this.authenticateService = new Authorize()
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.use(this.authenticateService.authorize)
        // Landlord Transactions Routes
        this.router.post('/:propertyId', landlordTransactionController.createTransaction);
        this.router.get('/queries', landlordTransactionController.getTransactions);
        this.router.get('/transact/:Id', landlordTransactionController.getTransactionById);
        this.router.get('/verify/:referenceId', landlordTransactionController.verifyPropertyPayment);
        this.router.get('/stats', landlordTransactionController.getTransactionStats);
        this.router.get('/summary', landlordTransactionController.getTransactionSummary);
    }
}

export default new LandlordTransactionRouter().router