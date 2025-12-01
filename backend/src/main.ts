import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: (origin, callback) => {
      // Log for debugging
      console.log(`[CORS] Request origin: ${origin || 'no origin'}`);
      console.log(`[CORS] NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`[CORS] FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);

      // In development, allow all localhost origins
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          callback(null, true);
          return;
        }
      }
      
      // Production: use specific allowed origins
      const allowedOrigins = [
        process.env.FRONTEND_URL, // e.g. https://readitblogs.vercel.app
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ].filter(Boolean);

      console.log(`[CORS] Allowed origins: ${JSON.stringify(allowedOrigins)}`);

      // Normalize helper to avoid issues with trailing slashes
      const normalizeOrigin = (url: string) => url.replace(/\/+$/, '').toLowerCase();
      const normalizedOrigin = origin ? normalizeOrigin(origin) : origin;

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!normalizedOrigin) {
        console.log(`[CORS] Allowing request with no origin`);
        callback(null, true);
        return;
      }

      const isAllowed = allowedOrigins.some((allowed) => {
        const normalizedAllowed = normalizeOrigin(allowed);
        // Exact match
        if (normalizedAllowed === normalizedOrigin) {
          console.log(`[CORS] Exact match: ${normalizedOrigin}`);
          return true;
        }
        // Allow all *.vercel.app domains
        if (normalizedOrigin.endsWith('.vercel.app')) {
          console.log(`[CORS] Allowing vercel.app domain: ${normalizedOrigin}`);
          return true;
        }
        return false;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS] BLOCKED origin: ${origin} (normalized: ${normalizedOrigin})`);
        console.warn(`[CORS] Allowed origins were: ${JSON.stringify(allowedOrigins)}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Methods',
    ],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT || 3200);
  console.log(`Server is running on: http://localhost:${process.env.PORT || 3200}`);
  console.log(`GraphQL endpoint: http://localhost:${process.env.PORT || 3200}/graphql`);
}
bootstrap();
