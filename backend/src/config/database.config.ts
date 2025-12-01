import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Default remote Postgres URL (hard-coded fallback)
// NOTE: Environment variables (DATABASE_URL) still take precedence over this.
const DEFAULT_DATABASE_URL =
  'postgresql://rpg_blog_user:d91zLUvjum5q7Ny08zBwBqnKiPmemGLj@dpg-d4m9j2npm1nc73cpgvl0-a.singapore-postgres.render.com/rpg_blog';

// Helper function to parse DATABASE_URL (for Railway, Render, etc.)
const getDbConfig = () => {
  // Support DATABASE_URL format (postgresql://user:password@host:port/database)
  const dbUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        username: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
      };
    } catch (error) {
      console.warn('Failed to parse DATABASE_URL, falling back to individual variables:', error);
    }
  }

  // Fallback to individual environment variables (kept mainly for local overrides)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'rpg_blog',
  };
};

const dbConfig = getDbConfig();

// Determine if SSL should be enabled (for hosted providers like Render)
const isSslEnabled =
  process.env.DATABASE_SSL === 'true' ||
  process.env.NODE_ENV === 'production' ||
  (!!process.env.DATABASE_URL &&
    /render\.com|railway\.app|amazonaws\.com|herokuapp\.com/i.test(
      process.env.DATABASE_URL,
    ));

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in development
  logging: process.env.NODE_ENV === 'development',
  // Enable SSL/TLS when connecting to hosted Postgres providers that require it
  ssl: isSslEnabled
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
  // Some TypeORM/pg setups expect SSL inside "extra"
  extra: isSslEnabled
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : undefined,
};

