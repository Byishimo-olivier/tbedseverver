import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { AppError, ErrorType } from "@/utils/exceptions";
import { ICompany } from "@/modules/users/company/company.model";
import { CompanyUserRole } from "@/types/enums";
import { User } from "@/modules/users/user.model";


export interface AuthRequest extends Request {
  user?: any;
  project?: any;
  projectRole?: string;
  company?: ICompany; //for company-specific routes
  companyRole?: CompanyUserRole; // Existing: for company-specific routes
  activeCompanyId?: string; // ID of the company user is acting as
  activeCompany?: ICompany; //  Full object of the company user is acting as
  actingAsIndividual?: boolean; // Flag if user is in individual context
}

export const authenticate = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      throw new AppError(
          "Authentication required",
          401,
          ErrorType.AUTHENTICATION
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      role?: string;
      activeContext?: string;
      iat: number;
      exp: number;
    };

    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError("User not found", 404, ErrorType.NOT_FOUND);
    }

    if (!user.isEmailVerified) {
      throw new AppError(
          "Please verify your email to continue.",
          403,
          ErrorType.AUTHORIZATION
      );
    }

    // Role and permissions come from the token (set during login based on context)
    (req as AuthRequest).user = {
      ...user.toObject(),
      id: user._id.toString(),
      contextRole: decoded.role, // Role from token (context-specific, e.g., company role)
      role: user.role || "user", // Global role ('admin' or 'user')
      activeContext: decoded.activeContext, // Company/project context
    };

    next();
  } catch (error) {
    if (
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.TokenExpiredError
    ) {
      next(
          new AppError("Invalid or expired token", 401, ErrorType.AUTHENTICATION)
      );
    } else if (error instanceof AppError) {
      next(error);
    } else {
      const message =
          error instanceof Error ? error.message : "Authentication failed";
      next(new AppError(message, 401, ErrorType.AUTHENTICATION));
    }
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError("Unauthorized access", 403, ErrorType.AUTHORIZATION);
    }
    next();
  };
};

export const isAuthenticated = (
  req: AuthRequest, // Changed to AuthRequest for consistency, though user is not set here
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "No token provided or token is malformed",
        401,
        ErrorType.AUTHENTICATION
      );
    }
    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new AppError("No token provided", 401, ErrorType.AUTHENTICATION);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
    };
    req.body.userId = decoded.id; // Pass user ID in request body
    next();
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      next(
        new AppError("Invalid or expired token", 401, ErrorType.AUTHENTICATION)
      );
    } else if (error instanceof AppError) {
      next(error);
    } else {
      next(
        new AppError("Authentication failed", 401, ErrorType.AUTHENTICATION)
      );
    }
  }
};
