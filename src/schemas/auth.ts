import Joi from 'joi';


export const LoginSchema = Joi.object({
  password: Joi.string().required(),
  email: Joi.string().email().required(),
});

