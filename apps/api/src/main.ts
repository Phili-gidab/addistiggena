import { mkdirSync } from 'fs';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { UPLOAD_DIR } from './uploads/uploads.controller';

async function bootstrap() {
  mkdirSync(UPLOAD_DIR, { recursive: true });
  // rawBody: payment webhook HMACs are verified over the exact bytes the gateway sent
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  // CORS: reflect-any-origin is a dev convenience only; production pins to the web app.
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = [process.env.WEB_PUBLIC_URL].filter((o): o is string => !!o);
  app.enableCors({ origin: isProd ? allowedOrigins : true, credentials: true });
  // Uploads (ID scans, certificates) are served ONLY via the authenticated
  // FilesController - never as public static assets.
  const port = process.env.PORT ? Number(process.env.PORT) : 4001;
  await app.listen(port);
  console.log(`Addis Tiggena API listening on http://localhost:${port}`);
}
bootstrap();
