import Joi from 'joi';

export const LogsSchema = Joi.object({
  events:  Joi.string().required(),           
  propertyId:  Joi.string().optional(),           
  transactionId:  Joi.string().optional()
});
