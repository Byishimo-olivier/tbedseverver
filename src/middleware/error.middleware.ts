// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from "express";
import { AppError, ErrorType } from "../utils/exceptions";
import { logger } from "../utils/logger";
import { MulterError } from "multer";

interface ErrorResponse {
  success: boolean;
  message: string;
  error: {
    type: ErrorType;
    details?: any;
    stack?: string;
  };
}

const SENSITIVE_FIELDS = new Set([
  "password",
  "newPassword",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
]);

const sanitizeForLog = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitizeForLog);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_FIELDS.has(key) ? "[REDACTED]" : sanitizeForLog(item),
      ])
    );
  }

  return value;
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error("Error:", {
    path: req.path,
    method: req.method,
    error: err,
    body: sanitizeForLog(req.body),
    params: req.params,
    query: req.query,
  });

  const isDevelopment = process.env.NODE_ENV === "development";

  if (err instanceof MulterError) {
    const response: ErrorResponse = {
      success: false,
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "File is too large. Maximum size is 5MB."
          : err.message,
      error: {
        type: ErrorType.VALIDATION,
        details: {
          field: err.field,
          code: err.code,
        },
      },
    };
    if (isDevelopment) {
      response.error.stack = err.stack;
    }
    res.status(400).json(response);
    return;
  }

  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      message: err.message,
      error: {
        type: err.type,
        details: err.details,
      },
    };

    if (isDevelopment) {
      response.error.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unexpected errors
  const response: ErrorResponse = {
    success: false,
    message: isDevelopment ? err.message : "Internal server error",
    error: {
      type: ErrorType.INTERNAL,
    },
  };

  if (isDevelopment) {
    response.error.stack = err.stack;
  }

  res.status(500).json(response);
};

// Global error handlers for uncaught exceptions and unhandled rejections
export const setupErrorHandlers = () => {
  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: any) => {
    logger.error("Unhandled Rejection:", reason);
    process.exit(1);
  });
};
