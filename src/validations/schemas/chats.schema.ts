import Joi from 'joi';
import { uploadSchema } from './upload.schema';

export const chatSchema = Joi.object({
    content: Joi.string().optional(),
    receiverId: Joi.string().required(),
}).concat(uploadSchema);

export const EmailSchema = Joi.object({
  receiverEmail: Joi.string().email().optional(),
  subject: Joi.string().required(),
  body: Joi.string().required(),
  isRead: Joi.boolean().optional(),
  isSent: Joi.boolean().optional(),
  isDraft: Joi.boolean().optional(),
})
.concat(uploadSchema)
.custom((value, helpers) => {
  if (value.isDraft === true && value.receiverEmail) {
    return helpers.error('draft.receiverEmailConflict', {
      context: {
        label: 'receiverEmail',
        value: value.receiverEmail
      }
    });
  }
  return value;
})
.messages({
  'draft.receiverEmailConflict': '"receiverEmail" is not allowed when isDraft is true'
});



export const updateEmailSchema = Joi.object({
  subject: Joi.string().optional().allow('', null),
  body: Joi.string().optional()
}).concat(uploadSchema);

export const updateEmailStateSchema = Joi.object({
  isDraft: Joi.boolean().optional(),
  isRead: Joi.boolean().optional(),
  isStarred: Joi.boolean().optional(),
  isArchived: Joi.boolean().optional(),
  isSpam: Joi.boolean().optional(),
  isDeleted: Joi.boolean().optional(),
  isSent: Joi.boolean().optional(),
})
.custom((value, helpers) => {
  const exclusiveFlags = ['isDraft', 'isStarred', 'isSent', 'isThrash', 'isArchived', 'isSpam'];
  const trueFlags = exclusiveFlags.filter(flag => value[flag] === true);

  if (trueFlags.length > 1) {
    return helpers.error('any.exclusive', {
      message:  `Only one of [isDraft, isStarred, isSent, isThrash, isArchived, isSpam] can be true. You passed: ${trueFlags.join(', ')}`,
      details: {
        path: helpers.state.path,
        flags: exclusiveFlags,
        trueFlags
      }
    });
  }
  return value;
})
.messages({
  'any.exclusive': '"{#label}" cannot have multiple status flags set to true. Conflicting flags: {#trueFlags}'
});