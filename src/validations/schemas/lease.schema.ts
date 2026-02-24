import Joi from "joi";

export const renewalSchema = Joi.object({
      tenantId: Joi.string().required(),
      propertyId: Joi.string().required(),
      currentRent: Joi.number().positive().required(),
      proposedRent: Joi.number().positive().required(),
      renewalTerms: Joi.object({
        duration: Joi.string().valid('WEEKLY', 'MONTHLY', 'ANNUAL').required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().required()
      }).required(),
      message: Joi.string().optional()
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
