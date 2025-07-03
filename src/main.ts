import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RolesGuard } from './auth/roles.guard';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new RolesGuard(reflector)
  );
  app.enableCors({
    origin: 'http://localhost:3000', // Allow your frontend origin
    credentials: true, // If you want to allow cookies
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
