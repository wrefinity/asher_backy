// controllers/landlordTransaction.controller.ts
import { TransactionStatus } from "@prisma/client";
import { Response } from "express";
import errorService from "../../services/error.service";
import { generateIDs } from "../../utils/helpers";
import { CustomRequest } from "../../utils/types";
import landlordTransactionSchema from "../schema/landlordTransactionSchema";
import landlordTransactionServices from "../services/landlord-transaction.services";
import propertyPerformance from "../services/property-performance";

class LandlordTransactionController {
    async createTransaction(req: CustomRequest, res: Response) {
        const { landlords } = req.user
        const landlordId = String(landlords.id);
        const { value, error } = landlordTransactionSchema.create().validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const { propertyId } = req.params

        try {

            const attachmentUrl = req.body.cloudinaryUrls && req.body.cloudinaryUrls.length > 0 ? req.body.cloudinaryUrls[0] : null
            const referenceId = generateIDs('REF');
            const transactionData = {
                ...value,
                referenceId,
                landlordsId: landlordId,
                attachment: attachmentUrl,
                propertyId: propertyId
            };
            const transaction = await landlordTransactionServices.createPropertyTransaction(transactionData);
            // NOTE: Alert tenant that his transaction has been created
            res.status(201).json(transaction);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getTransactions(req: CustomRequest, res: Response) {
        const { landlords } = req.user
        const landlordId = String(landlords.id);
        const { propertyId } = req.params
        try {
            const transactions = await landlordTransactionServices.getPropertyTransactionsByLandlord(landlordId, propertyId);
            if (transactions.length < 1) {
                return res.status(404).json({ message: "No transactions found" })
            }
            res.status(200).json(transactions);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async verifyPropertyPayment(req: CustomRequest, res: Response) {
        const { referenceId } = req.params;
        if (!referenceId) return res.status(404).json({ message: 'No referenceId provided' });

        try {
            const verificationResult = await landlordTransactionServices.getPropertyTransactionByReference(referenceId);
            if (verificationResult) {
                if (verificationResult.transactionStatus === TransactionStatus.PENDING) {
                    await landlordTransactionServices.updatePropertyTransaction(verificationResult.id, verificationResult.landlordsId, {
                        transactionStatus: TransactionStatus.COMPLETED,
                    });
                    return res.status(200).json({ message: "Payment successful", transaction: verificationResult });
                } else {
                    return res.status(400).json({ message: "Payment already processed", transaction: verificationResult });
                }
            } else {
                return res.status(404).json({ message: "Transaction not found" });
            }
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getTransactionSummary(req: CustomRequest, res: Response) {
        const landlordId = String(req.user.id);
        try {
            const summary = await landlordTransactionServices.getTransactionSummary(landlordId);
            res.status(200).json(summary);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

    async getTransactionById(req: CustomRequest, res: Response) {
        const { transactionId } = req.params;
        try {
            const transaction = await landlordTransactionServices.getPropertyTransactionById(transactionId);
            if (!transaction) {
                return res.status(404).json({ message: "Transaction not found" });
            }
            res.status(200).json(transaction);
        } catch (error) {
            errorService.handleError(error, res);
        }
    }

}

export default new LandlordTransactionController();
