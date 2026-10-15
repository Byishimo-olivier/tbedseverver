// src/utils/validation.ts
import { AppError, ErrorType } from './exceptions';

export const createValidationError = (errors: any[]) => {
  return new AppError(
    'Validation failed',
    400,
    ErrorType.VALIDATION,
    errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }))
  );
};