import Joi from "joi";
import { dateJoiRequired, stringJoiRequired } from "./base.schema";

export const renewalSchema = Joi.object({
      tenantId: stringJoiRequired,
      propertyId: stringJoiRequired,
      currentRent: Joi.number().positive().required(),
      proposedRent: Joi.number().positive().required(),
      renewalTerms: Joi.object({
        duration: Joi.string().valid('WEEKLY', 'MONTHLY', 'ANNUAL').required(),
        startDate: dateJoiRequired,
        endDate: dateJoiRequired
      }).required(),
      message: stringJoiRequired
    });

export const responseSchema = Joi.object({
      response: Joi.string().valid('ACCEPTED', 'REJECTED', 'COUNTER_OFFER').required(),
      counterOffer: Joi.object({
        proposedRent: Joi.number().positive().optional(),
        renewalTerms: Joi.object().optional(),
        message: Joi.string().optional()
      }).when('response', {
        is: 'COUNTER_OFFER',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    });
