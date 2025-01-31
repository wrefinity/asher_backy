import { Router } from "express";
import transactionsControllers from "../controllers/transactions.controllers";
import transferControllers from "../controllers/transfer.controllers";
import { Authorize } from "../middlewares/authorize";

class TransactionRouter {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.use(this.authenticateService.authorize)
        this.router.post('/fund-wallet', transactionsControllers.fundWallet)
        // this.router.patch('/verify/:referenceId', transactionsControllers.verifyPayment)
        this.router.patch('/verify-flutter/:referenceId', transactionsControllers.verifyFlutterWave)
        // this.router.patch('/verify-stripe/:referenceId', transactionsControllers.verifyStripe)
        this.router.post('/pay-bill', transferControllers.makePayment)
        this.router.post('/transfer', transferControllers.transferFunds)
    }

}

export default new TransactionRouter().router;
