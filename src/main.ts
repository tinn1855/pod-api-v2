import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // #region agent log
  const dbUrl = process.env.DATABASE_URL;
  const dbUrlMasked = dbUrl ? dbUrl.replace(/:[^:@]+@/, ':****@') : 'NOT_SET';
  const dbUrlParts = dbUrl
    ? (() => {
        try {
          const url = new URL(dbUrl);
          return {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || 'default',
            pathname: url.pathname,
            username: url.username || 'NOT_SET',
            hasPassword: !!url.password,
          };
        } catch (e) {
          return { parseError: 'Invalid URL format' };
        }
      })()
    : null;
  fetch('http://127.0.0.1:7242/ingest/a495b76f-9510-48ff-81af-f164daeec251', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'main.ts:7',
      message: 'Environment check at bootstrap',
      data: { dbUrlExists: !!dbUrl, dbUrlMasked: dbUrlMasked, dbUrlParts },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId: 'A',
    }),
  }).catch(() => {});
  // #endregion

  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('POD Management API')
    .setDescription('API documentation for POD Management System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
