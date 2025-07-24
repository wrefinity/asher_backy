import Joi from "joi";
import {ComplaintCategory, ComplaintPriority, ComplaintStatus} from "@prisma/client"
const catType = Object.values(ComplaintCategory);
const statusType = Object.values(ComplaintStatus);
const priorType = Object.values(ComplaintPriority);



export const createComplaintSchema = Joi.object({
  category: Joi.string().valid(...catType).default(ComplaintCategory.MAINTENANCE).required(),
  subject: Joi.string().required(),
  propertyId: Joi.string().optional(),
  priority: Joi.string().valid(...priorType).default(ComplaintPriority.LOW).required(),
  status: Joi.string().valid(...statusType).default(ComplaintStatus.IN_PROGRESS).optional(),
});
export const updateComplaintSchema = Joi.object({
  category: Joi.string().valid(...catType).default(ComplaintCategory.MAINTENANCE).optional(),
  subject: Joi.string().optional(),
  propertyId: Joi.string().optional(),
  priority: Joi.string().valid(...priorType).default(ComplaintPriority.LOW).optional(),
  status: Joi.string().valid(...statusType).default(ComplaintStatus.IN_PROGRESS).optional(),
});
