import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);
  // Render injeta PORT automaticamente. API_PORT é fallback local.
  const port = Number(process.env.PORT) || config.get<number>('API_PORT', 4000);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = config.get<string>('CORS_ORIGINS', 'http://localhost:3000');

  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(',').map((s) => s.trim()),
    credentials: true,
  });

  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 API rodando na porta ${port} (prefix: /${prefix})`, 'Bootstrap');
}

bootstrap();
