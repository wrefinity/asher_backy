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
// controllers/landlordTransaction.controller.ts
const client_1 = require("@prisma/client");
const error_service_1 = __importDefault(require("../../services/error.service"));
const helpers_1 = require("../../utils/helpers");
const landlordTransactionSchema_1 = __importDefault(require("../validations/schema/landlordTransactionSchema"));
const landlord_transaction_services_1 = __importDefault(require("../services/landlord-transaction.services"));
class LandlordTransactionController {
    createTransaction(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = String(landlords.id);
            const { value, error } = landlordTransactionSchema_1.default.create().validate(req.body);
            if (error) {
                return res.status(400).json({ message: error.details[0].message });
            }
            const { propertyId } = req.params;
            try {
                const attachmentUrl = req.body.cloudinaryUrls && req.body.cloudinaryUrls.length > 0 ? req.body.cloudinaryUrls[0] : null;
                const referenceId = (0, helpers_1.generateIDs)('REF');
                const transactionData = Object.assign(Object.assign({}, value), { referenceId, landlordsId: landlordId, attachment: attachmentUrl, propertyId: propertyId });
                const transaction = yield landlord_transaction_services_1.default.createPropertyTransaction(transactionData);
                // NOTE: Alert tenant that his transaction has been created
                res.status(201).json(transaction);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getTransactions(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { landlords } = req.user;
            const landlordId = String(landlords.id);
            const { propertyId } = req.params;
            try {
                const transactions = yield landlord_transaction_services_1.default.getPropertyTransactionsByLandlord(landlordId, propertyId);
                if (transactions.length < 1) {
                    return res.status(404).json({ message: "No transactions found" });
                }
                res.status(200).json(transactions);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    verifyPropertyPayment(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { referenceId } = req.params;
            if (!referenceId)
                return res.status(404).json({ message: 'No referenceId provided' });
            try {
                const verificationResult = yield landlord_transaction_services_1.default.getPropertyTransactionByReference(referenceId);
                if (verificationResult) {
                    if (verificationResult.status === client_1.TransactionStatus.PENDING) {
                        yield landlord_transaction_services_1.default.updatePropertyTransaction(verificationResult.id, verificationResult.userId, {
                            transactionStatus: client_1.TransactionStatus.COMPLETED,
                        });
                        return res.status(200).json({ message: "Payment successful", transaction: verificationResult });
                    }
                    else {
                        return res.status(400).json({ message: "Payment already processed", transaction: verificationResult });
                    }
                }
                else {
                    return res.status(404).json({ message: "Transaction not found" });
                }
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getTransactionSummary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const landlordId = String(req.user.id);
            try {
                const summary = yield landlord_transaction_services_1.default.getTransactionSummary(landlordId);
                res.status(200).json(summary);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
    getTransactionById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { transactionId } = req.params;
            try {
                const transaction = yield landlord_transaction_services_1.default.getPropertyTransactionById(transactionId);
                if (!transaction) {
                    return res.status(404).json({ message: "Transaction not found" });
                }
                res.status(200).json(transaction);
            }
            catch (error) {
                error_service_1.default.handleError(error, res);
            }
        });
    }
}
exports.default = new LandlordTransactionController();
