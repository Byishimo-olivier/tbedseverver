// src/utils/exceptions.ts
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  PARSING = 'PARSING',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL = 'INTERNAL'
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public type: ErrorType,
    public details?: any,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}