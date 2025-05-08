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
const transaction_scheam_1 = __importDefault(require("../validations/schemas/transaction.scheam"));
const error_service_1 = __importDefault(require("../services/error.service"));
const transfer_services_1 = __importDefault(require("../services/transfer.services"));
const helpers_1 = require("../utils/helpers");
class TransferController {
    makePayment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const tenantId = req.user.id;
            const { value, error } = transaction_scheam_1.default.makePayment().validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            try {
                const payment = yield transfer_services_1.default.payBill(value, tenantId, value.currency);
                res.status(200).json(payment);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    transferFunds(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = (req.user.id);
            const { value, error } = transaction_scheam_1.default.trasferFunds().validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            try {
                const { locationCurrency } = yield (0, helpers_1.getCurrentCountryCurrency)();
                const transfer = yield transfer_services_1.default.transferFunds(userId, value, locationCurrency);
                res.status(200).json(transfer);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new TransferController();
