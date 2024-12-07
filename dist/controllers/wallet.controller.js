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
const helpers_1 = require("../utils/helpers");
const client_1 = require("@prisma/client");
const helpers_2 = require("../utils/helpers");
class WalletController {
    constructor() {
        this.getUserWallet = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = String(req.user.id);
            const { locationCurrency } = yield (0, helpers_2.getCurrentCountryCurrency)();
            try {
                const userWallet = yield wallet_service_1.default.getOrCreateWallet(userId, locationCurrency);
                res.status(200).json({ userWallet });
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    fundWallet(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = String(req.user.id);
            const { amount, paymentGateway } = req.body;
            if (!Object.values(client_1.PaymentGateway).includes(paymentGateway)) {
                return res.status(400).json({ message: 'Invalid payment gateway' });
            }
            const userIpAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            const countryCode = yield (0, helpers_1.getCountryCodeFromIp)(userIpAddress);
            try {
                const validAmount = Number(amount);
                const fundWallet = yield wallet_service_1.default.fundWalletGeneral(userId, validAmount, 'usd', countryCode, paymentGateway);
                res.status(200).json(fundWallet);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new WalletController();
