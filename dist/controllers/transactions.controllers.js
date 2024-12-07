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
const wallet_service_1 = __importDefault(require("../services/wallet.service"));
const transaction_scheam_1 = __importDefault(require("../validations/schemas/transaction.scheam"));
const flutterWave_service_1 = __importDefault(require("../services/flutterWave.service"));
class TransactionController {
    fundWallet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = String(req.user.id);
            const { value, error } = transaction_scheam_1.default.create().validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            try {
                const amount = Number(value.amount);
                // const authorizationUrl = await walletService.fundWallet(userId, amount)
                // const authorizationUrl = await walletService.fundWalletUsingFlutter(userId, amount)
                const authorizationUrl = yield wallet_service_1.default.fundWalletUsingStripe(userId, amount);
                res.status(201).json(authorizationUrl);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
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
    verifyFlutterWave(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { referenceId } = req.params;
            if (!referenceId)
                return res.status(404).json({ message: 'No refrenceId provided' });
            // const userId = String(req.user.id)
            try {
                const verificationResult = yield flutterWave_service_1.default.verifyPayment(referenceId);
                if (verificationResult.data.status === 'successful') {
                    yield flutterWave_service_1.default.handleSuccessfulPayment(referenceId);
                    return res.status(200).json({
                        message: "Payment successful",
                        transaction: verificationResult.data,
                    });
                }
                else {
                    return res.status(400).json({
                        message: "Payment Failed",
                        transaction: verificationResult.data,
                    });
                }
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new TransactionController();
