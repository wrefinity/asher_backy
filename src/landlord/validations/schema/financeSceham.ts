import { BudgetFrequency, TransactionReference } from '@prisma/client';
import Joi from 'joi';

const budgetSchema = Joi.object({
    propertyId: Joi.string().required(),
    transactionType: Joi.string()
        .valid(...[TransactionReference])
        .required(),
    budgetAmount: Joi.number().positive().required(),
    frequency: Joi.string()
        .valid(...[BudgetFrequency])
        .required(),
});

const updateBudgetSchema = Joi.object({
    id: Joi.string().required(),
    amount: Joi.number().required(),
});

export { budgetSchema, updateBudgetSchema };
