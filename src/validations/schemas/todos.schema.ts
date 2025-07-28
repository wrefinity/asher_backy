import Joi from 'joi';
import { PriorityLevel, TodoStatus } from '@prisma/client';


export const getTodosSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...Object.values(TodoStatus)).optional(),
  priority: Joi.string().valid(...Object.values(PriorityLevel)).optional(),
  fromDate: Joi.date().optional(),
  toDate: Joi.date().optional(),
  search: Joi.string().optional().max(100)
});

export const createTodoSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  dueDate: Joi.date().optional().greater('now'),
  priority: Joi.string()
    .valid(...Object.values(PriorityLevel))
    .default('MEDIUM'),
  status: Joi.string()
    .valid(...Object.values(TodoStatus))
    .default('CREATED'),
});

export const updateTodoSchema = Joi.object({
  title: Joi.string().optional().min(3).max(100),
  description: Joi.string().optional().max(500),
  dueDate: Joi.date().optional(),
  priority: Joi.string().valid(...Object.values(PriorityLevel)),
  status: Joi.string().valid(...Object.values(TodoStatus)),
}).min(1); 