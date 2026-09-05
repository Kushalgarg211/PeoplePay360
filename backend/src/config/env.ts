import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT:               parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV:           process.env.NODE_ENV ?? 'development',
  DATABASE_URL:       process.env.DATABASE_URL ?? '',
  JWT_SECRET:         process.env.JWT_SECRET ?? 'fallback_secret_change_me',
  JWT_EXPIRES_IN:     process.env.JWT_EXPIRES_IN ?? '8h',
  CORS_ORIGIN:        process.env.CORS_ORIGIN ?? '*',
  GMAIL_USER:         process.env.GMAIL_USER ?? '',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ?? '',
  APP_URL:            process.env.APP_URL ?? 'http://localhost:5173',
};
 
