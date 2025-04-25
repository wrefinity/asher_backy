import Joi from "joi";
import { PaymentGateway, TransactionReference } from "@prisma/client"

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

export default TransactionSchema;