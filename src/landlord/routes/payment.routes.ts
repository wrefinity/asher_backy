import { Router } from "express";
import paymentController from "../controllers/payment.controller";

class PaymentRouter {
    public router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/bills/:billId/status', paymentController.getBillPaymentStatus);
        this.router.post('/bills/:billId/remind', paymentController.sendPaymentReminder);
        this.router.get('/received', paymentController.getReceivedPayments);
        this.router.get('/analytics', paymentController.getPaymentAnalytics);
    }
}

export default new PaymentRouter().router;
