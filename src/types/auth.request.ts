import { Response, NextFunction } from "express";
import { Request } from "express";
import { IProject } from "@/modules/projects/project.model";
import { ICompany } from "@/modules/users/company/company.model";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    fullName?: string;
    role: string;
    permissions: string[];
    [key: string]: any;
  };
  project?: IProject;
  projectRole?: string;
  company?: ICompany;
  companyRole?: string;
  activeCompanyId?: string; // ID of the company user is acting as
  activeCompany?: ICompany; // Full object of the company user is acting as
  actingAsIndividual?: boolean; // Flag if user is in individual context
}

export type AuthenticatedRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export type RequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => any;
