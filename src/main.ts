require('dotenv').config();

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
// Swagger documentation will be added when @nestjs/swagger is installed
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { seedPermissions } from '../scripts/seed-permissions';


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
          'http://localhost:9000',
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
          'http://localhost:9000',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5000',
          'http://127.0.0.1:9000',
          'https://saas-business.duckdns.org/',
        ];

        const allowedOriginsList = isProduction
          ? [...allowedOrigins, ...localhostOrigins]
          : [
              ...allowedOrigins,
              ...localhostOrigins,
            ];

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
          logger.debug(`Allowing CORS request from origin: ${origin}`);
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

    const port = configService.get<number>('PORT', 9000);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    // isProduction is already defined above

    // Request size limits
    app.use(json({ limit: '10mb' }));
    app.use(urlencoded({ extended: true, limit: '10mb' }));

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

    // Log JWT secret at startup
    console.log('Signing JWT with secret:', process.env.JWT_SECRET);

    // Start the application
    await app.listen(9000, '0.0.0.0');


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
  console.error('Failed to start application:', err);
  process.exit(1);
});
