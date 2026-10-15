import { Response, NextFunction } from "express";
import { AppError, ErrorType } from "../utils/exceptions";
import { AuthenticatedRequest } from "../types/auth.request";
import { logger } from "../utils/logger";

export const requirePermission = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logger.warn(
        `User ${req.user?.id} lacks required permissions: ${requiredPermissions}`
      );
      throw new AppError(
        "Insufficient permissions",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    next();
  };
};

export const requireMembership = (requiredTier: string) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const userTier = req.user?.membershipTier || "basic";
    const tiers = ["basic", "premium", "enterprise"];

    if (tiers.indexOf(userTier) < tiers.indexOf(requiredTier)) {
      throw new AppError(
        "Membership tier not sufficient",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    next();
  };
};
