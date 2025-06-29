import { Router } from "express";
import { Authorize } from "../middlewares/authorize";
import walletController from "../controllers/wallet.controller";


class WalletRouter {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.use(this.authenticateService.authorize)
        this.router.get('/', walletController.getUserWallet)
        this.router.get('/all', walletController.getUserWallets)
        this.router.post('/fund', walletController.fundWallet)
        this.router.post('/fund-verify/:paymentIntent', walletController.verifyPayment)

    }

}

export default new WalletRouter().router;
