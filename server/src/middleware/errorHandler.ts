import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('[Error Logger]', {
    path: req.path,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || 'SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
  });
};
