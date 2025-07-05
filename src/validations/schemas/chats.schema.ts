import Joi from 'joi';

export const chatSchema = Joi.object({
    content: Joi.string().optional(),
    receiverId: Joi.string().required(),
    cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),        // Images
    cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),   // Videos
    cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(), // Documents
    cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),   // Audios
});

export const EmailSchema = Joi.object({
  receiverEmail: Joi.string().email().optional(),
  subject: Joi.string().required(),
  body: Joi.string().required(),

  isRead: Joi.boolean().optional(),
  isSent: Joi.boolean().optional(),
  isDraft: Joi.boolean().optional(),

  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),
})
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
  body: Joi.string().optional(),

  cloudinaryUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryVideoUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryDocumentUrls: Joi.array().items(Joi.string().uri()).optional(),
  cloudinaryAudioUrls: Joi.array().items(Joi.string().uri()).optional(),

  isDraft: Joi.boolean().optional(),
  isStarred: Joi.boolean().optional(),
  isArchived: Joi.boolean().optional(),
  isSpam: Joi.boolean().optional(),
  isSent: Joi.boolean().optional(),
})
.custom((value, helpers) => {
  const exclusiveFlags = ['isDraft', 'isSent', 'isArchived', 'isSpam'];
  const trueFlags = exclusiveFlags.filter(flag => value[flag] === true);

  if (trueFlags.length > 1) {
    return helpers.error('any.exclusive', {
      message:  `Only one of [isDraft, isSent, isArchived, isSpam] can be true. You passed: ${trueFlags.join(', ')}`,
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