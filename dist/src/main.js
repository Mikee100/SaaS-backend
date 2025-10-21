"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
const express_1 = require("express");
const seed_permissions_1 = require("../scripts/seed-permissions");
const api_logging_middleware_1 = require("./middleware/api-logging.middleware");
const audit_log_service_1 = require("./audit-log.service");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        const isProduction = process.env.NODE_ENV === 'production';
        const allowedOrigins = isProduction
            ? (process.env.CORS_ORIGINS || '')
                .split(',')
                .map((origin) => origin.trim())
            : [
                'http://localhost:3000',
                'http://localhost:5000',
                'http://localhost:9000',
                'https://saas-business.duckdns.org/',
            ];
        logger.debug('CORS Configuration:');
        logger.debug(`- Allowed Origins: ${JSON.stringify(allowedOrigins)}`);
        logger.debug(`- Production Mode: ${isProduction}`);
        app.enableCors({
            origin: (origin, callback) => {
                if (!origin) {
                    logger.debug('Allowing request with no origin');
                    return callback(null, true);
                }
                const localhostOrigins = [
                    'http://localhost:3000',
                    'http://localhost:5000',
                    'http://localhost:9000',
                    'http://127.0.0.1:3000',
                    'http://127.0.0.1:5000',
                    'https://saas-business.duckdns.org',
                    'https://saas-business.duckdns.org/',
                ];
                const allowedOriginsList = isProduction
                    ? [...allowedOrigins, ...localhostOrigins]
                    : [
                        ...allowedOrigins,
                        ...localhostOrigins,
                    ];
                const isAllowed = !isProduction ||
                    allowedOriginsList.some((allowedOrigin) => {
                        const matches = origin === allowedOrigin || origin.startsWith(allowedOrigin);
                        if (matches) {
                            logger.debug(`Origin ${origin} matches allowed origin: ${allowedOrigin}`);
                        }
                        return matches;
                    });
                if (isAllowed) {
                    logger.debug(`Allowing CORS request from origin: ${origin}`);
                    callback(null, true);
                }
                else {
                    logger.warn(`CORS request blocked from origin: ${origin}. Allowed origins: ${JSON.stringify(allowedOriginsList)}`);
                    callback(new Error(`Not allowed by CORS. Origin: ${origin} not in allowed origins`));
                }
            },
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
            credentials: true,
            allowedHeaders: [
                'Origin',
                'X-Requested-With',
                'Content-Type',
                'Accept',
                'Authorization',
                'X-Request-Id',
                'X-Api-Key',
                'X-Client-Version',
                'X-Client-Name',
                'X-Requested-With',
                'X-Forwarded-For',
                'X-Forwarded-Proto',
                'X-Forwarded-Host',
                'X-Forwarded-Port',
                'X-Forwarded-Prefix',
                'X-Requested-With',
                'Content-Type',
                'Accept',
                'Authorization',
                'X-XSRF-TOKEN',
                'x-branch-id',
                'Cache-Control',
                'Pragma',
                'If-Modified-Since',
                'Accept-Language',
                'Accept-Encoding',
            ],
            exposedHeaders: [
                'Content-Length',
                'Content-Type',
                'Authorization',
                'x-branch-id',
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Credentials',
                'Set-Cookie',
            ],
            maxAge: 86400,
        });
        const configService = app.get(config_1.ConfigService);
        try {
            await (0, seed_permissions_1.seedPermissions)();
        }
        catch (error) {
            logger.warn('Failed to seed permissions on startup', error);
        }
        const port = configService.get('PORT', 9000);
        const nodeEnv = configService.get('NODE_ENV', 'development');
        app.use((0, express_1.json)({ limit: '10mb' }));
        app.use((0, express_1.urlencoded)({ extended: true, limit: '10mb' }));
        const auditLogService = app.get(audit_log_service_1.AuditLogService);
        const apiLoggingMiddleware = new api_logging_middleware_1.ApiLoggingMiddleware(auditLogService);
        app.use(apiLoggingMiddleware.use.bind(apiLoggingMiddleware));
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
            forbidNonWhitelisted: true,
            disableErrorMessages: isProduction,
        }));
        const uploadsPath = (0, path_1.join)(process.cwd(), 'uploads');
        app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });
        if (!isProduction) {
            logger.log('API documentation will be available at /api when @nestjs/swagger is installed');
        }
        const stripeSecret = configService.get('STRIPE_SECRET_KEY');
        if (!stripeSecret) {
            logger.warn('⚠️ Stripe secret key not found - billing features will be disabled');
        }
        console.log('Signing JWT with secret:', process.env.JWT_SECRET);
        await app.listen(9000, '0.0.0.0');
        logger.log(`🚀 Application is running on: http://localhost:${port}`);
        const dbUrl = configService.get('DATABASE_URL');
        if (dbUrl) {
            try {
                const dbName = new URL(dbUrl).pathname.replace(/^\/+/, '');
                logger.log(`📦 Connected to database: ${dbName}`);
            }
            catch (error) {
                logger.warn(`⚠️ Could not parse DATABASE_URL: ${error?.message || 'Unknown error'}`);
                logger.log(`📦 Database URL: ${dbUrl.substring(0, 20)}...`);
            }
        }
    }
    catch (error) {
        logger.error('❌ Failed to start application', error);
        process.exit(1);
    }
}
bootstrap().catch((err) => {
    console.error('Failed to start application:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map