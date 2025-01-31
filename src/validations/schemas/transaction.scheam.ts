import Joi from "joi";
import {PaymentGateway} from "@prisma/client"

const PaymentType = ["rent_due", "rent_payment", "maintainace_fee", "landlord_payout"]


class TransactionSchema {
    static create() {
        return Joi.object({
            amount: Joi.number().required(),
            gateWayType: Joi.string().valid(...Object.values(PaymentGateway)).required(),
        });
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