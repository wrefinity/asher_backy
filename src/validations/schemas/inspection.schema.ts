import Joi from 'joi';

const statusEnum = ['Not Started', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const priorityEnum = ['Low', 'Medium', 'High', 'Critical'];
const overallConditionEnum = ['Excellent', 'Good', 'Fair', 'Poor'];

export const createInspectionSchema = Joi.object({
  propertyId: Joi.string().required(),
  tenantId: Joi.string().allow(null, '').optional(),
  type: Joi.string().allow('').optional(),
  scheduledDate: Joi.alternatives().try(
    Joi.string().isoDate(),
    Joi.date()
  ).optional(),
  scheduledTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('').optional(),
  inspector: Joi.string().allow('').optional(),
  inspectorId: Joi.string().allow('').optional(),
  status: Joi.string().valid(...statusEnum).optional(),
  priority: Joi.string().valid(...priorityEnum).allow('').optional(),
  score: Joi.number().integer().min(0).max(100).allow(null).optional(),
  findings: Joi.number().integer().min(0).allow(null).optional(),
  criticalIssues: Joi.number().integer().min(0).allow(null).optional(),
  overallCondition: Joi.string().valid(...overallConditionEnum).allow('').optional(),
  generalNotes: Joi.string().allow('').optional(),
  recommendations: Joi.string().allow('').optional(),
  notes: Joi.string().allow('').optional(), // Kept for backward compatibility
});

export const updateInspectionSchema = Joi.object({
  type: Joi.string().allow('').optional(),
  scheduledDate: Joi.alternatives().try(
    Joi.string().isoDate(),
    Joi.date()
  ).optional(),
  scheduledTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('').optional(),
  inspector: Joi.string().allow('').optional(),
  inspectorId: Joi.string().allow('').optional(),
  status: Joi.string().valid(...statusEnum).optional(),
  priority: Joi.string().valid(...priorityEnum).allow('').optional(),
  score: Joi.number().integer().min(0).max(100).allow(null).optional(),
  findings: Joi.number().integer().min(0).allow(null).optional(),
  criticalIssues: Joi.number().integer().min(0).allow(null).optional(),
  overallCondition: Joi.string().valid(...overallConditionEnum).allow('').optional(),
  generalNotes: Joi.string().allow('').optional(),
  recommendations: Joi.string().allow('').optional(),
  notes: Joi.string().allow('').optional(), // Kept for backward compatibility
  completedAt: Joi.alternatives().try(
    Joi.string().isoDate(),
    Joi.date()
  ).optional(),
});