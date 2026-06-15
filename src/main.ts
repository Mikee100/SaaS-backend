import 'dotenv/config';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded, type Request } from 'express';
import cookieParser from 'cookie-parser';
import { ApiLoggingMiddleware } from './middleware/api-logging.middleware';
import { AuditLogService } from './audit-log.service';
import { ValidationExceptionFilter } from './common/filters/validation-exception.filter';

type SeedPermissionsFn = () => Promise<void>;
type SeedPermissionsModule = { seedPermissions?: SeedPermissionsFn };
type RawBodyRequest = Request & { rawBody?: Buffer };

async function loadSeedPermissions(
  logger: Logger,
): Promise<SeedPermissionsFn | null> {
  const candidates = [
    join(__dirname, 'scripts', 'seed-permissions.js'),
    join(__dirname, '..', 'scripts', 'seed-permissions.js'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;

    try {
      const mod = (await import(
        pathToFileURL(candidate).href
      )) as SeedPermissionsModule;
      if (typeof mod.seedPermissions === 'function') {
        return mod.seedPermissions;
      }
    } catch (error) {
      logger.warn(
        `Failed to load permission seed script at ${candidate}`,
        error,
      );
    }
  }

  return null;
}

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
        'x-tenant-id',
        'tenantid',
        'TenantId',
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

    const shouldSeedPermissionsOnStartup =
      process.env.SEED_PERMISSIONS_ON_STARTUP === 'true';

    if (shouldSeedPermissionsOnStartup) {
      try {
        const seedPermissions = await loadSeedPermissions(logger);
        if (!seedPermissions) {
          logger.warn(
            'SEED_PERMISSIONS_ON_STARTUP=true but seed-permissions script was not found in runtime paths.',
          );
        } else {
          await seedPermissions();
          logger.log('Permission seed completed during startup');
        }
      } catch (error) {
        logger.warn('Failed to seed permissions on startup', error);
      }
    } else {
      logger.debug(
        'Skipping permission seeding on startup. Set SEED_PERMISSIONS_ON_STARTUP=true to enable it.',
      );
    }

    const port = configService.get<number>('PORT', 5100);
    // isProduction is already defined above

    // Enable gzip compression for all responses
    app.use(
      compression({
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
      }),
    );

    // Cookie parser (required for enterprise auth: access_token / refresh_token cookies)
    app.use(cookieParser());

    // Request size limits.
    // Preserve raw body for Stripe webhook signature verification.
    app.use(
      json({
        limit: '10mb',
        verify: (req: RawBodyRequest, _res, buf) => {
          if (req.originalUrl?.includes('/billing/webhook')) {
            req.rawBody = buf;
          }
        },
      }),
    );
    app.use(
      urlencoded({
        extended: true,
        limit: '10mb',
        verify: (req: RawBodyRequest, _res, buf) => {
          if (req.originalUrl?.includes('/billing/webhook')) {
            req.rawBody = buf;
          }
        },
      }),
    );

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

    // Resolve paths from backend root instead of process CWD so production services
    // still serve files when started from a different working directory.
    const backendRootPath = existsSync(join(__dirname, '..', 'package.json'))
      ? join(__dirname, '..')
      : process.cwd();

    const uploadsPath = process.env.UPLOADS_DIR
      ? process.env.UPLOADS_DIR
      : join(backendRootPath, 'uploads');

    const posUpdatesPath = process.env.POS_UPDATES_DIR
      ? process.env.POS_UPDATES_DIR
      : join(uploadsPath, 'pos-updates');

    if (!existsSync(uploadsPath)) {
      mkdirSync(uploadsPath, { recursive: true });
    }

    if (!existsSync(posUpdatesPath)) {
      mkdirSync(posUpdatesPath, { recursive: true });
    }

    logger.log(`Serving uploads from: ${uploadsPath}`);
    logger.log(`Serving POS updates from: ${posUpdatesPath}`);

    app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });
    app.useStaticAssets(posUpdatesPath, { prefix: '/updates/pos/' });
    // Alias path useful for direct diagnostics and manual file checks.
    app.useStaticAssets(posUpdatesPath, { prefix: '/uploads/pos-updates/' });

    const swaggerEnabled =
      !isProduction || process.env.SWAGGER_ENABLED === 'true';
    const swaggerPath = (process.env.SWAGGER_PATH || 'api').replace(
      /^\/+|\/+$/g,
      '',
    );

    if (swaggerEnabled) {
      const apiUrl =
        process.env.PUBLIC_API_URL || 'https://saas-business.duckdns.org';

      const swaggerConfig = new DocumentBuilder()
        .setTitle('SaaS Platform API')
        .setDescription(
          'OpenAPI documentation for SaaS Platform backend endpoints.',
        )
        .setVersion(process.env.npm_package_version || '1.0.0')
        .addServer(`http://localhost:${port}`, 'Local')
        .addServer(apiUrl, 'Production')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            in: 'header',
          },
          'bearerAuth',
        )
        .addCookieAuth('access_token', {
          type: 'apiKey',
          in: 'cookie',
        })
        .build();

      const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
        deepScanRoutes: true,
      });

      SwaggerModule.setup(swaggerPath, app, swaggerDocument, {
        customSiteTitle: 'SaaS Platform API Docs',
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
      });

      logger.log(
        `📚 API docs: http://localhost:${port}/${swaggerPath} | OpenAPI JSON: http://localhost:${port}/${swaggerPath}-json`,
      );
    } else {
      logger.log(
        'Swagger/OpenAPI docs disabled in production. Set SWAGGER_ENABLED=true to enable.',
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
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`⚠️ Could not parse DATABASE_URL: ${errorMessage}`);
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
