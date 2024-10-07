// validations/schemas/landlordTransaction.schema.ts
import { TransactionReference, TransactionStatus } from '@prisma/client';
import Joi from 'joi';

const landlordTransactionSchema = {
    create: () => Joi.object({
        description: Joi.string().optional(),
        amount: Joi.number().precision(2).required(),
        tenantId: Joi.string().required(),
        type: Joi.string().valid(...Object.values(TransactionReference)).required(),
        transactionStatus: Joi.string().valid(...Object.values(TransactionStatus)).required(),
        paidDate: Joi.date().required(),
    })
};

export default landlordTransactionSchema;
