import Joi from "joi";

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().required(),

  DB_MONGO_URI: Joi.string().required(),

  JWT_SECRET: Joi.string().required(),
  EXPIRES_IN: Joi.string().required(),

  EMAIL_USERNAME: Joi.string().required(),
  EMAIL_PASSWORD: Joi.string().required(),
  EMAIL_HOST: Joi.string().required(),
  EMAIL_PORT: Joi.number().required(),

  THROTTLE_TTL: Joi.number().required(),
  THROTTLE_LIMIT: Joi.number().required(),

  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),

  FR_BASE_URL: Joi.string().required(),
});
