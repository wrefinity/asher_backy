// controllers/landlordTransaction.controller.ts
import { TransactionStatus } from "@prisma/client";
import { Response } from "express";
import errorService from "../../services/error.service";
import { generateIDs } from "../../utils/helpers";
import { CustomRequest } from "../../utils/types";
import landlordTransactionSchema from "../validations/schema/landlordTransactionSchema";
import landlordTransactionServices from "../services/landlord-transaction.services";
import propertyPerformance from "../services/property-performance";
import transactionServices from "../../services/transaction.services";
import { TransactionQuerySchema } from "../../validations/schemas/transaction.schema";

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
        try {
    
            // Get parameters from both route and query
            const propertyId = req.query.propertyId as string || undefined;
            const landlordId = req.user?.landlords?.id || null;
            const userId = req.user?.id || req.query.userId || null;

            // Validate query parameters
            const { error, value } = TransactionQuerySchema.validate(req.query);
            if (error) {
                return res.status(400).json({ error: error.details });
            }

            // Call service with combined filters
            const result = await transactionServices.getTransactionsByProps(
                {
                    propertyId,
                    landlordId,
                    ...value,
                    userId
                },
                value
            );

            return res.status(200).json({
                success: true,
                data: result.data,
                pagination: result.pagination
            });
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
                if (verificationResult.status === TransactionStatus.PENDING) {
                    await landlordTransactionServices.updatePropertyTransaction(verificationResult.id, verificationResult.userId, {
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

    async getTransactionStats(req: CustomRequest, res: Response) {
        try {
            const filter = req.query.filter as 'today' | 'week' | 'month' | 'year' | 'total' || 'total';
            const propertyId = req.query.propertyId as string | undefined;

            // Validate filter parameter
            if (!['today', 'week', 'month', 'year', 'total'].includes(filter)) {
                return res.status(400).json({ message: "Invalid filter parameter" });
            }

            // Get userId from authenticated user or query
            const userId = req.user?.id || req.query.userId as string | undefined;
            const landlordId = req.user?.landlords?.id || req.query.landlordId as string | undefined;

            const stats = await transactionServices.getTransactionStats(
                filter,
                userId,
                landlordId,
                propertyId
            );

            return res.status(200).json({
                success: true,
                ...stats
            });
        } catch (error) {
            errorService.handleError(error, res);
        }
    }
}

export default new LandlordTransactionController();
