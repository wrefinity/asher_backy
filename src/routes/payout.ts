import { Router } from "express";
import {payoutController} from '../controllers/payouts.controller'
import { Authorize } from "../middlewares/authorize";
import { userRoles } from "@prisma/client";



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
        this.router.use(this.authenticateService.authorize);
        this.router.use(this.authenticateService.authorizeRole(userRoles.VENDOR));
        this.router.post('/',  payoutController.createPayout);
        this.router.get('/:payoutId', payoutController.getPayoutStatus);
        this.router.get('/', payoutController.listPayouts);
        this.router.post('/:payoutId/cancel', payoutController.cancelPayout);
        this.router.post('/:payoutId/reverse', payoutController.reversePayout);
        this.router.post('/bank-account/token', payoutController.createBankAccountToken);
        // this.router.get('/schedule/:accountId', payoutController.getPayoutSchedule);

    }
}

export default new PayoutRouter().router;

