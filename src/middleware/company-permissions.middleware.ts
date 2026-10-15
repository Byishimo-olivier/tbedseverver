import { Response, NextFunction } from "express";
import { AppError, ErrorType } from "@/utils/exceptions";
import mongoose from "mongoose";
import { CompanyUserRole } from "@/types/enums";
import { Company, ICompany } from "@/modules/users/company/company.model";
import { AuthRequest } from "./auth.middleware";
import { getCompanyPermissionsForRole } from "@/config/company-permissions";

export const getUserCompanyRole = (
  userId: string,
  company: ICompany
): CompanyUserRole | null => {
  // Find the user in company members
  const member = company.members.find(
    (member) => member.userId.toString() === userId
  );

  return member ? (member.role as CompanyUserRole) : null;
};

export const requireCompanyMembership = (
  companyIdParam: string = "companyId"
) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(
          "User not authenticated",
          401,
          ErrorType.AUTHENTICATION
        );
      }

      const companyId = req.body[companyIdParam] || req.params[companyIdParam];

      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new AppError("Invalid company ID", 400, ErrorType.VALIDATION);
      }

      // Efficiently find the company only if the current user is a member
      const company = await Company.findOne({
        _id: companyId,
        "members.userId": req.user.id,
      });

      if (!company) {
        throw new AppError(
          "Company not found or you are not a member.",
          404,
          ErrorType.NOT_FOUND
        );
      }

      const member = company.members.find(
        (m) => m.userId.toString() === req.user!.id
      )!;

      req.company = company;
      req.companyRole = member.role as CompanyUserRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireCompanyAdmin = (companyIdParam: string = "companyId") => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(
          "User not authenticated",
          401,
          ErrorType.AUTHENTICATION
        );
      }

      const companyId = req.body[companyIdParam] || req.params[companyIdParam];

      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new AppError("Invalid company ID", 400, ErrorType.VALIDATION);
      }

      const company = await Company.findById(companyId);

      if (!company) {
        throw new AppError("Company not found.", 404, ErrorType.NOT_FOUND);
      }

      const member = company.members.find(
        (m) => m.userId.toString() === req.user!.id
      );

      if (!member) {
        throw new AppError(
          "You are not a member of this company.",
          403,
          ErrorType.AUTHORIZATION
        );
      }

      if (member.role !== CompanyUserRole.ADMIN) {
        throw new AppError(
          "You must be a company admin to perform this action.",
          403,
          ErrorType.AUTHORIZATION
        );
      }

      req.company = company;
      req.companyRole = member.role as CompanyUserRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireCompanyRole = (
  roles: CompanyUserRole[],
  companyIdParam: string = "companyId"
) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(
          "User not authenticated",
          401,
          ErrorType.AUTHENTICATION
        );
      }

      const companyId = req.body[companyIdParam] || req.params[companyIdParam];

      if (!companyId || !mongoose.Types.ObjectId.isValid(companyId)) {
        throw new AppError("Invalid company ID", 400, ErrorType.VALIDATION);
      }

      const company = await Company.findById(companyId);

      if (!company) {
        throw new AppError("Company not found.", 404, ErrorType.NOT_FOUND);
      }

      const member = company.members.find(
        (m) => m.userId.toString() === req.user!.id
      );

      if (!member) {
        throw new AppError(
          "You are not a member of this company.",
          403,
          ErrorType.AUTHORIZATION
        );
      }

      if (!roles.includes(member.role as CompanyUserRole)) {
        throw new AppError(
          "You do not have the required role for this action.",
          403,
          ErrorType.AUTHORIZATION
        );
      }

      req.company = company;
      req.companyRole = member.role as CompanyUserRole;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireCompanyPermission = (requiredPermissions: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    // If user is acting as individual (no company context), skip company permission check
    if (req.actingAsIndividual || (!req.company && !req.companyRole)) {
      return next();
    }

    // Company context validation
    const company = req.company || req.activeCompany;
    const companyRole = req.companyRole;

    if (!company || !req.user || !companyRole) {
      return next(
        new AppError(
          "Company context or user role not found for permission check.",
          500,
          ErrorType.INTERNAL
        )
      );
    }

    // Get user's permissions based on their company role
    const userPermissions = getCompanyPermissionsForRole(companyRole);
    
    // Company Admin has all permissions
    if (companyRole === CompanyUserRole.ADMIN) {
      return next();
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return next(
        new AppError(
          "Insufficient permissions for this company action.",
          403,
          ErrorType.AUTHORIZATION
        )
      );
    }

    next();
  };
};

// Helper middleware for specific role requirements
export const requireCompanyRoles = (allowedRoles: CompanyUserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    // If user is acting as individual, skip company role check
    if (req.actingAsIndividual || !req.companyRole) {
      // For individual context, we might want to allow or deny based on specific logic
      // For now, we'll allow individual users to proceed
      return next();
    }

    if (!allowedRoles.includes(req.companyRole)) {
      return next(
        new AppError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          403,
          ErrorType.AUTHORIZATION
        )
      );
    }

    next();
  };
};