import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('app.port') ?? 3001;
  const frontendUrl = configService.get<string>('app.frontendUrl') ?? 'http://localhost:3000';
  const configuredCorsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigins = new Set(
    [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000', ...configuredCorsOrigins].filter(Boolean),
  );

  const isAllowedOrigin = (origin: string) =>
    allowedOrigins.has(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
    /^https:\/\/[\w-]+\.onrender\.com$/.test(origin) ||
    /^https:\/\/[\w-]+(?:-[\w-]+)*\.vercel\.app$/.test(origin);

  app.setGlobalPrefix('api/v1');
  app.enableVersioning();
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      // Reflect allowed origins; never throw — throwing skips ACAO headers and breaks browsers.
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}

void bootstrap();
