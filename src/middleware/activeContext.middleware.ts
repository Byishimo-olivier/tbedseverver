import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "./auth.middleware";
import { Company } from "@/modules/users/company/company.model";
import { AppError, ErrorType } from "@/utils/exceptions";
import { CompanyUserRole } from "@/types/enums";
import { getCompanyPermissionsForRole } from "@/config/company-permissions";

export const setActiveContext = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(
        new AppError(
          "User not authenticated for context setting.",
          401,
          ErrorType.AUTHENTICATION
        )
      );
    }

    const activeCompanyIdHeader = req.headers["x-active-company-id"] as string;

    if (activeCompanyIdHeader && activeCompanyIdHeader.toLowerCase() !== "individual") {
      if (!mongoose.Types.ObjectId.isValid(activeCompanyIdHeader)) {
        return next(
          new AppError(
            "Invalid X-Active-Company-Id header format.",
            400,
            ErrorType.VALIDATION
          )
        );
      }

      const company = await Company.findById(activeCompanyIdHeader);
      if (!company) {
        return next(
          new AppError(
            "Active company specified in header not found.",
            404,
            ErrorType.NOT_FOUND
          )
        );
      }

      const member = company.members.find(
        (m) => m.userId.toString() === req.user.id
      );

      if (!member) {
        return next(
          new AppError(
            "User is not a member of the specified active company.",
            403,
            ErrorType.AUTHORIZATION
          )
        );
      }

      req.activeCompanyId = company._id.toString();
      req.activeCompany = company;
      req.actingAsIndividual = false;
      req.companyRole = member.role as CompanyUserRole;

      const basePermissions = req.user.permissions || [];
      const companyPermissions = getCompanyPermissionsForRole(req.companyRole);
      const mergedPermissions = [...new Set([...basePermissions, ...companyPermissions])];
      req.user.permissions = mergedPermissions;
    } else {
      // Individual context - clear company-related properties
      req.actingAsIndividual = true;
      req.activeCompanyId = undefined;
      req.activeCompany = undefined;
      req.companyRole = undefined;
    }

    next();
  } catch (error) {
    next(error);
  }
};
