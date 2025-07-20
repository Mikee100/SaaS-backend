import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
  app.enableCors({
    origin: 'http://localhost:3000', // Allow your frontend origin
    credentials: true, // If you want to allow cookies
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
