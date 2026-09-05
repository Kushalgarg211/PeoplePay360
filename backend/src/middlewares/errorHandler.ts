import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  errors?:     unknown;
}

export const createError = (message: string, statusCode = 500, errors?: unknown): AppError => {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.errors = errors;
  return err;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const message    = err.message   ?? 'Internal Server Error';

  console.error(`[ERROR] ${statusCode} — ${message}`, err.errors ?? '');

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && err.errors ? { errors: err.errors } : {}),
  });
};
