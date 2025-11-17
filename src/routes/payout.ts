import { Router } from "express";
import {payoutController} from '../controllers/payouts.controller'
import { Authorize } from "../middlewares/authorize";



class PayoutRouter {
    public router: Router;
    protected authenticateService: Authorize

    constructor() {
        this.router = Router();
        this.initializeRoutes = this.initializeRoutes.bind(this);
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }
    private initializeRoutes(): void {
        this.router.post('/',  this.authenticateService.authorize,  payoutController.createPayout);
        this.router.get('/:payoutId', this.authenticateService.authorize, payoutController.getPayoutStatus);
        this.router.get('/', this.authenticateService.authorize, payoutController.listPayouts);
        this.router.post('/:payoutId/cancel', this.authenticateService.authorize, payoutController.cancelPayout);
        this.router.post('/:payoutId/reverse', this.authenticateService.authorize, payoutController.reversePayout);
        this.router.post('/bank-account/token', this.authenticateService.authorize, payoutController.createBankAccountToken);
        // this.router.get('/schedule/:accountId', this.authenticateService.authorize, payoutController.getPayoutSchedule);

    }
}

export default new PayoutRouter().router;

