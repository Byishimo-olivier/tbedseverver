// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Schema, ZodError } from 'zod';
import { AppError, ErrorType } from '../utils/exceptions';

export const validateRequest = (schema: Schema) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return next(
          new AppError(
            'Validation error', 
            400, 
            ErrorType.VALIDATION,
            formattedErrors
          )
        );
      }
      next(
        new AppError(
          'Validation error', 
          400, 
          ErrorType.VALIDATION
        )
      );
    }
  };
};