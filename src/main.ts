require('dotenv').config();

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as compression from 'compression';
// Swagger documentation will be added when @nestjs/swagger is installed
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import * as cookieParser from 'cookie-parser';
import { seedPermissions } from '../scripts/seed-permissions';
import { ApiLoggingMiddleware } from './middleware/api-logging.middleware';
import { AuditLogService } from './audit-log.service';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create the application with CORS configuration
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Configure CORS
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction
      ? (process.env.CORS_ORIGINS || '')
          .split(',')
          .map((origin) => origin.trim())
      : [
          'http://localhost:3000',
          'http://localhost:5000',
          'http://localhost:5100',
          'https://saas-business.duckdns.org/',
        ];

    // Log CORS configuration
    logger.debug('CORS Configuration:');
    logger.debug(`- Allowed Origins: ${JSON.stringify(allowedOrigins)}`);
    logger.debug(`- Production Mode: ${isProduction}`);

    // Enable CORS with specific configuration
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          logger.debug('Allowing request with no origin');
          return callback(null, true);
        }

        const localhostOrigins = [
          'http://localhost:3000',
          'http://localhost:5000',
          'http://localhost:5100',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5000',
          'http://127.0.0.1:5100',
          'http://localhost:5100',
          'https://saas-business.duckdns.org',
          'https://saas-business.duckdns.org/',
          // Hosted frontend (cookie-based auth requires this origin to be allowed)
          'https://adeera-pos.vercel.app',
          'https://adeera-pos.vercel.app/',
        ];

        const allowedOriginsList = isProduction
          ? [...allowedOrigins, ...localhostOrigins]
          : [...allowedOrigins, ...localhostOrigins];

        const isAllowed =
          !isProduction ||
          allowedOriginsList.some((allowedOrigin) => {
            const matches =
              origin === allowedOrigin || origin.startsWith(allowedOrigin);
            if (matches) {
              logger.debug(
                `Origin ${origin} matches allowed origin: ${allowedOrigin}`,
              );
            }
            return matches;
          });

        if (isAllowed) {
          callback(null, true);
        } else {
          logger.warn(
            `CORS request blocked from origin: ${origin}. Allowed origins: ${JSON.stringify(allowedOriginsList)}`,
          );
          callback(
            new Error(
              `Not allowed by CORS. Origin: ${origin} not in allowed origins`,
            ),
          );
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
      maxAge: 86400, // 24 hours
    });

    // Get config service
    const configService = app.get(ConfigService);

    // Seed permissions if not present
    try {
      await seedPermissions();
    } catch (error) {
      logger.warn('Failed to seed permissions on startup', error);
    }

    const port = configService.get<number>('PORT', 5100);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    // isProduction is already defined above

    // Enable gzip compression for all responses
    app.use(compression({
      level: 6, // Good balance between compression and speed
      threshold: 1024, // Only compress responses larger than 1KB
      filter: (req, res) => {
        // Don't compress responses with this request header
        if (req.headers['x-no-compression']) {
          return false;
        }
        // Use compression filter function
        return compression.filter(req, res);
      },
    }));

    // Cookie parser (required for enterprise auth: access_token / refresh_token cookies)
    app.use(cookieParser());

    // Request size limits
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));

    // API logging middleware
    const auditLogService = app.get(AuditLogService);
    const apiLoggingMiddleware = new ApiLoggingMiddleware(auditLogService);
    app.use(apiLoggingMiddleware.use.bind(apiLoggingMiddleware));

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        forbidNonWhitelisted: true,
        disableErrorMessages: isProduction,
      }),
    );

    // Global exception filter to log validation errors (even when disabled for clients)
    app.useGlobalFilters(new ValidationExceptionFilter());

    // CORS is already configured above

    // Serve uploads statically
    const uploadsPath = join(process.cwd(), 'uploads');
    app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });

    // API documentation endpoint will be available when @nestjs/swagger is installed
    if (!isProduction) {
      logger.log(
        'API documentation will be available at /api when @nestjs/swagger is installed',
      );
    }

    // Check Stripe configuration
    const stripeSecret = configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      logger.warn(
        '⚠️ Stripe secret key not found - billing features will be disabled',
      );
    }

    // Log JWT secret status (but not the actual secret for security)
    if (process.env.JWT_SECRET) {
      logger.log('JWT secret is configured');
    } else {
      logger.error('JWT_SECRET is not set - authentication will fail');
    }

    // Start the application (127.0.0.1 = local-only; use 0.0.0.0 only in Docker/production)
    await app.listen(port, '127.0.0.1');

    // Log application startup information
    logger.log(`🚀 Application is running on: http://localhost:${port}`);

    // Log database connection info
    const dbUrl = configService.get<string>('DATABASE_URL');
    if (dbUrl) {
      try {
        const dbName = new URL(dbUrl).pathname.replace(/^\/+/, '');
        logger.log(`📦 Connected to database: ${dbName}`);
      } catch (error: any) {
        logger.warn(
          `⚠️ Could not parse DATABASE_URL: ${error?.message || 'Unknown error'}`,
        );
        logger.log(`📦 Database URL: ${dbUrl.substring(0, 20)}...`); // Log first 20 chars for debugging
      }
    }
  } catch (error) {
    logger.error('❌ Failed to start application', error);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', err);
  process.exit(1);
});
