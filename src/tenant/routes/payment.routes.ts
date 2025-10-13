import { Router } from "express";
import { Authorize } from "../../middlewares/authorize";
import { validateBody } from "../../middlewares/validation";
import Joi from "joi";
import tenantPaymentController from "../controllers/payment.controller";

class TenantPaymentRouter {
    public router: Router;
    authenticateService: Authorize;

    constructor() {
        this.router = Router();
        this.authenticateService = new Authorize();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        // Apply authentication and tenant role check
        this.router.use(this.authenticateService.authorize);
        this.router.use(this.authenticateService.requireTenantContext());

        // Payment routes
        this.router.post('/bills/:billId/pay', 
            validateBody(Joi.object({
                amount: Joi.number().positive().required(),
                paymentMethod: Joi.string().valid('wallet', 'card', 'bank_transfer').default('wallet'),
                walletId: Joi.string().when('paymentMethod', {
                    is: 'wallet',
                    then: Joi.optional(),
                    otherwise: Joi.forbidden()
                }),
                paymentGateway: Joi.string().when('paymentMethod', {
                    is: Joi.string().valid('card', 'bank_transfer'),
                    then: Joi.valid('stripe', 'paystack', 'flutterwave').required(),
                    otherwise: Joi.optional()
                })
            })),
            tenantPaymentController.payBill
        );

        this.router.get('/payments/history', tenantPaymentController.getPaymentHistory);
        this.router.get('/bills/upcoming', tenantPaymentController.getUpcomingBills);

        // Wallet routes
        this.router.post('/wallet/fund',
            validateBody(Joi.object({
                amount: Joi.number().positive().required(),
                paymentGateway: Joi.string().valid('stripe', 'paystack', 'flutterwave').required(),
                currency: Joi.string().valid('NGN', 'USD', 'GBP').default('NGN'),
                countryCode: Joi.string().length(2).default('NG')
            })),
            tenantPaymentController.fundWallet
        );

        this.router.get('/wallet/balance', tenantPaymentController.getWalletBalance);
    }
}

export default new TenantPaymentRouter().router;
