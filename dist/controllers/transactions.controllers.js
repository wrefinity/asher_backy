"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_service_1 = __importDefault(require("../services/error.service"));
// import paystackServices from "../services/paystack.services";
const transaction_services_1 = __importDefault(require("../services/transaction.services"));
const wallet_service_1 = __importDefault(require("../services/wallet.service"));
const transaction_scheam_1 = __importDefault(require("../validations/schemas/transaction.scheam"));
const helpers_1 = require("../utils/helpers");
const propertyServices_1 = __importDefault(require("../services/propertyServices"));
class TransactionController {
    constructor() {
        this.makeTransaction = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            const userId = String(req.user.id);
            const { value, error } = transaction_scheam_1.default.transactSchema().validate(req.body);
            if (error)
                return res.status(400).json({ message: error.details[0].message });
            try {
                const amount = Number(value.amount);
                // get the props to ensure that props exist and also get the landlord from it
                const props = yield propertyServices_1.default.getPropertiesById(value.propertyId);
                if (!props)
                    return res.status(400).json({ message: "property does not exist" });
                // get the landlordId
                const landlordUserId = (_a = props.landlord) === null || _a === void 0 ? void 0 : _a.userId;
                let transaction;
                const locationData = yield (0, helpers_1.getCurrentCountryCurrency)();
                transaction = yield transaction_services_1.default.createTransact(Object.assign(Object.assign({ userId, currency: locationData === null || locationData === void 0 ? void 0 : locationData.locationCurrency }, value), { amount }), landlordUserId);
                res.status(201).json({ transaction });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.fundWallet = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = String(req.user.id);
            const { value, error } = transaction_scheam_1.default.create().validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            try {
                const amount = Number(value.amount);
                // const authorizationUrl = await walletService.fundWallet(userId, amount)
                // const authorizationUrl = await walletService.fundWalletUsingFlutter(userId, amount)
                let authorizationUrl;
                const locationData = yield (0, helpers_1.getCurrentCountryCurrency)();
                // if(value.gateWayType == GateWayType.STRIPE){
                authorizationUrl = yield wallet_service_1.default.fundWalletGeneral(userId, amount, locationData === null || locationData === void 0 ? void 0 : locationData.locationCurrency, locationData.country_code, value.gateWayType);
                // }
                res.status(201).json({ authorizationUrl });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        this.getTransaction = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = String(req.user.id);
            const { value, error } = transaction_scheam_1.default.create().validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            try {
                const amount = Number(value.amount);
                // const authorizationUrl = await walletService.fundWallet(userId, amount)
                // const authorizationUrl = await walletService.fundWalletUsingFlutter(userId, amount)
                let authorizationUrl;
                const locationData = yield (0, helpers_1.getCurrentCountryCurrency)();
                // if(value.gateWayType == GateWayType.STRIPE){
                authorizationUrl = yield wallet_service_1.default.fundWalletGeneral(userId, amount, locationData === null || locationData === void 0 ? void 0 : locationData.locationCurrency, locationData.country_code, value.gateWayType);
                // }
                res.status(201).json({ authorizationUrl });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
        // async verifyPayment(req: CustomRequest, res: Response) {
        //     const { referenceId } = req.params
        //     if (!referenceId) return res.status(404).json({ message: 'No refrenceId provided' })
        //     const userId = String(req.user.id)
        //     try {
        //         const verificationResult = await paystackServices.verifyPayment(referenceId);
        //         if (verificationResult.status) {
        //             await transactionServices.updateReferneceTransaction(referenceId, userId)
        //             return res.status(200).json({
        //                 message: "Payment successful",
        //                 transaction: verificationResult.data,
        //             });
        //         } else {
        //             return res.status(400).json({
        //                 message: "Payment Failed",
        //                 transaction: verificationResult.data,
        //             });
        //         }
        //     } catch (error) {
        //         errorService.handleError(error, res)
        //     }
        // }
        // async verifyFlutterWave(req: CustomRequest, res: Response) {
        //     const { referenceId } = req.params
        //     if (!referenceId) return res.status(404).json({ message: 'No refrenceId provided' })
        //     // const userId = String(req.user.id)
        //     try {
        //         const verificationResult = await flutterWaveService.verifyPayment(referenceId);
        //         if (verificationResult.data.status === 'successful') {
        //             await flutterWaveService.handleSuccessfulPayment(referenceId)
        //             return res.status(200).json({
        //                 message: "Payment successful",
        //                 transaction: verificationResult.data,
        //             });
        //         } else {
        //             return res.status(400).json({
        //                 message: "Payment Failed",
        //                 transaction: verificationResult.data,
        //             });
        //         }
        //     } catch (error) {
        //         errorService.handleError(error, res)
        //     }
        // }
        // async verifyStripe(req: CustomRequest, res: Response) {
        //     const { referenceId } = req.params
        //     if (!referenceId) return res.status(404).json({ message: 'No refrenceId provided' })
        //     // const userId = String(req.user.id)
        //     try {
        //         const verificationResult = await stripeService.verifyPaymentIntent(referenceId);
        //         if (verificationResult.status) {
        //             await stripeService.handleSuccessfulPayment(referenceId)
        //             return res.status(200).json({
        //                 message: "Payment successful",
        //                 transaction: verificationResult,
        //             });
        //         } else {
        //             return res.status(400).json({
        //                 message: "Payment Failed",
        //                 transaction: verificationResult,
        //             });
        //         }
        //     } catch (error) {
        //         errorService.handleError(error, res)
        //     }
        // }
    }
}
exports.default = new TransactionController();
