"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.envValidationSchema = void 0;
const Joi = require("joi");
exports.envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(9000),
    DATABASE_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('1d'),
    CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:5000'),
});
const validate = (config) => {
    const { error, value } = exports.envValidationSchema.validate(config, {
        allowUnknown: true,
        abortEarly: false,
    });
    if (error) {
        throw new Error(`Config validation error: ${error.message}`);
    }
    return value;
};
exports.validate = validate;
//# sourceMappingURL=env.validation.js.map