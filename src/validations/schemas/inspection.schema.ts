import Joi from 'joi';
import { stringJoiOptional } from './base.schema';

const statusEnum = ['Not Started', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];
const priorityEnum = ['Low', 'Medium', 'High', 'Critical'];
const overallConditionEnum = ['Excellent', 'Good', 'Fair', 'Poor'];

export const createInspectionSchema = Joi.object({
  propertyId: Joi.string().required(),
  tenantId: stringJoiOptional,
  type: stringJoiOptional,
  scheduledDate: Joi.alternatives().try(
    Joi.string().isoDate(),
    Joi.date()
  ).optional(),
  scheduledTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('').optional(),
  inspector: stringJoiOptional,
  inspectorId: stringJoiOptional,
  status: Joi.string().valid(...statusEnum).optional(),
  priority: Joi.string().valid(...priorityEnum).allow('').optional(),
  score: Joi.number().integer().min(0).max(100).allow(null).optional(),
  findings: Joi.number().integer().min(0).allow(null).optional(),
  criticalIssues: Joi.number().integer().min(0).allow(null).optional(),
  overallCondition: Joi.string().valid(...overallConditionEnum).allow('').optional(),
  generalNotes: stringJoiOptional,
  recommendations: stringJoiOptional,
  notes: stringJoiOptional, // Kept for backward compatibility
});

export const updateInspectionSchema = Joi.object({
  type: stringJoiOptional,
  scheduledDate: Joi.alternatives().try(
    Joi.string().isoDate(),
    Joi.date()
  ).optional(),
  scheduledTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).allow('').optional(),
  inspector: stringJoiOptional,
  inspectorId: stringJoiOptional,
  status: Joi.string().valid(...statusEnum).optional(),
  priority: Joi.string().valid(...priorityEnum).allow('').optional(),
  score: Joi.number().integer().min(0).max(100).allow(null).optional(),
  findings: Joi.number().integer().min(0).allow(null).optional(),
  criticalIssues: Joi.number().integer().min(0).allow(null).optional(),
  overallCondition: Joi.string().valid(...overallConditionEnum).allow('').optional(),
  generalNotes: stringJoiOptional,
  recommendations: stringJoiOptional,
  notes: stringJoiOptional, // Kept for backward compatibility
  completedAt: Joi.alternatives().try(
    Joi.string().isoDate(),
    Joi.date()
  ).optional(),
});