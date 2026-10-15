import { AppError, ErrorType } from "./exceptions";
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/auth.request";

export const ensureAuthenticated = (
  req: AuthenticatedRequest,
  _res: Response,
  _next: NextFunction
) => {
  if (!req.user?.id) {
    throw new AppError("User not authenticated", 401, ErrorType.AUTHENTICATION);
  }
  return req.user;
};
