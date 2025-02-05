import Joi from 'joi';
import {LogType} from "@prisma/client"
const logsType = Object.values(LogType);

export const LogsSchema = Joi.object({
  events:  Joi.string().required(), 
  subjects:  Joi.string().optional(), 
  type:   Joi.string().valid(...logsType).optional(),          
  propertyId:  Joi.string().optional(),           
  transactionId:  Joi.string().optional(),
  userId:  Joi.string().optional()
});
