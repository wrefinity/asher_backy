import { PropertyTransactionsType } from "@prisma/client";
import Joi from "joi";

const PaymentType = ["rent_due", "rent_payment", "maintainace_fee", "landlord_payout"]

class TransactionSchema {
    static create() {
        return Joi.object({
            amount: Joi.number().required(),
        });
    }

    static makePayment() {
        return Joi.object({
            billType: Joi.string().valid(...PaymentType).required(),
            amount: Joi.number().required(),
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