import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { validateStripeConfig } from './config/stripe.config';
import { ConfigurationService } from './config/configuration.service';

async function bootstrap() {
  // Validate Stripe configuration
  const stripeConfigured = validateStripeConfig();
  if (stripeConfigured) {
      // console.log('✅ Stripe configuration validated');
  } else {
    console.warn('⚠️  Stripe configuration missing - billing features will be disabled');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get configuration service
  const configService = app.get(ConfigurationService);
  
  // Initialize default configurations
  try {
    await configService.initializeDefaultConfigurations();
      // console.log('✅ Default configurations initialized');
  } catch (error) {
    console.warn('⚠️  Failed to initialize default configurations:', error.message);
  }

  const uploadsPath = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsPath, { prefix: '/uploads/' });
  
  // Get CORS origins from configuration
  const corsOrigins = await configService.getConfiguration('CORS_ORIGINS');
  const allowedOrigins = corsOrigins ? corsOrigins.split(',').map(origin => origin.trim()) : ['http://localhost:5000'];
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
    // console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();