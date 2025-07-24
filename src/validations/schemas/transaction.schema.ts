import Joi from "joi";
import { 
  TransactionReference, 
  TransactionType, 
  TransactionStatus, 
  PaymentGateway,
  PaymentFrequency,
  PayableBy,
  BudgetFrequency
} from '@prisma/client';
const PaymentType = ["rent_due", "rent_payment", "maintainace_fee", "landlord_payout"]


class TransactionSchema {
    static create() {
        return Joi.object({
            amount: Joi.number().required(),
            gateWayType: Joi.string().valid(...Object.values(PaymentGateway)).required(),
        });
    }
    static transactSchema() {
        return Joi.object({
            paymentGateway: Joi.string().valid(...Object.values(PaymentGateway)).optional(),
            reference: Joi.string().valid(...Object.values(TransactionReference)).optional(),
            propertyId: Joi.string().optional(),
            billId: Joi.string().optional(),
            walletId: Joi.string().optional(),
            amount: Joi.number().required(),
            currency: Joi.string().optional(),
            description: Joi.string().optional(),
        })
    }
    

    static makePayment() {
        return Joi.object({
            billType: Joi.string().valid(...PaymentType).required(),
            amount: Joi.number().required(),
            currency: Joi.number().required(),
            set_auto: Joi.boolean().optional
        });
    }

    static withdraw() {
        return Joi.object({
            amount: Joi.number().required(),
        });
    }


    static trasferFunds() {
        return Joi.object({
            amount: Joi.number().required(),
            recieiverId: Joi.string().required(),
            description: Joi.string().optional(),
        });

    }
}


export const TransactionQuerySchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  // Filters
  type: Joi.string().valid(...Object.values(TransactionType)),
  reference: Joi.string().valid(...Object.values(TransactionReference)),
  status: Joi.string().valid(...Object.values(TransactionStatus)),
  paymentGateway: Joi.string().valid(...Object.values(PaymentGateway)),
  frequency: Joi.string().valid(...Object.values(PaymentFrequency)),
  payableBy: Joi.string().valid(...Object.values(PayableBy)),
  budgetFrequency: Joi.string().valid(...Object.values(BudgetFrequency)),
  
  // Date ranges
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  
  // Amount ranges
  minAmount: Joi.number().min(0),
  maxAmount: Joi.number().min(Joi.ref('minAmount')),
  
  // Search
  search: Joi.string().trim(),
  
  // Relationships
  propertyId: Joi.string(),
  unitId: Joi.string(),
  roomId: Joi.string(),
  billId: Joi.string(),
  walletId: Joi.string(),
  userId: Joi.string(),
  
  // Flags
  isDue: Joi.boolean(),
  
  // Sorting
  sortBy: Joi.string().valid(
    'amount', 'createdAt', 'updatedAt', 'reference', 'status', 'type'
  ).default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});
export default TransactionSchema;