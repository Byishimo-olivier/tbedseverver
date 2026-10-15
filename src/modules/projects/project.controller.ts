import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { projectService } from "./project.service";
import { uploadService } from "../file/upload.service";
import { AuthRequest } from "@/middleware/auth.middleware";
import { successResponse } from "@/utils/response";
import { companyService } from "../users/company/company.service";
import { CompanyUserRole, UserRole } from "@/types/enums";
import {
  CompanyPermissions,
  getCompanyPermissionsForRole,
} from "@/config/company-permissions";
import { AppError, ErrorType } from "@/utils/exceptions";

export class ProjectController {
  async createProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      let project;
      const userId = req.user!.id;

      // Check if this is a company project
      if (req.activeCompany) {
        // Create as company project
        project = await companyService.createCompanyProject(
            req.activeCompany.id,
            req.body,
            userId
        );
      } else if (req.body.companyId && !req.activeCompany) {
        // This case implies an admin explicitly creating a project for a company
        // without being in that company's "active context".
        // companyService.createCompanyProject should verify permissions.
        project = await companyService.createCompanyProject(
            req.body.companyId,
            req.body,
            userId
        );
      } else {
        // Create as individual project
        project = await projectService.createProject(req.body, userId);
      }

      // Optional file
      if (req.file) {
        const description = req.body.description || "Project document";
        const upload = await uploadService.saveFileDetails(
            req.user,
            req.file,
            description,
            project._id.toString()
        );
        project.documents.push({
          filePath: upload.filePath,
          description: upload.description,
        });
        await project.save();
      }

      res
          .status(201)
          .json(successResponse(project, "Project created successfully"));
    } catch (error) {
      next(error);
    }
  }

  async getProjectDocuments(
      req: AuthRequest,
      res: Response,
      next: NextFunction
  ) {
    try {
      const { projectId } = req.params;
      if (!Types.ObjectId.isValid(projectId)) {
        return next(
            new AppError("Invalid project ID format", 400, ErrorType.VALIDATION)
        );
      }
      const { type, startDate, endDate } = req.query;

      const documents = await projectService.getProjectDocuments(
          projectId,
          req.projectRole as UserRole,
          {
            type: type as string,
            startDate: startDate as string,
            endDate: endDate as string,
          }
      );

      res.json(
          successResponse(documents, "Project documents retrieved successfully")
      );
    } catch (error) {
      next(error);
    }
  }

  async reviewDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { documentId, status, comments } = req.body;
      await projectService.reviewDocument(
          documentId,
          status,
          comments,
          req.user!.id
      );
      res.json(successResponse(null, "Document review status updated."));
    } catch (error) {
      next(error);
    }
  }

  async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        return next(
            new AppError("Invalid project ID format", 400, ErrorType.VALIDATION)
        );
      }
      const project = await projectService.getProjectById(id);
      res.json(successResponse(project));
    } catch (error) {
      next(error);
    }
  }

  async getUserProjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      if (req.activeCompany && req.companyRole) {
        // Company context - check permissions
        const userPermissions = getCompanyPermissionsForRole(req.companyRole);

        if (
            !userPermissions.includes(
                CompanyPermissions.COMPANY_VIEW_PROJECTS.action
            )
        ) {
          return next(
              new AppError(
                  "Insufficient permissions to view company projects.",
                  403,
                  ErrorType.AUTHORIZATION
              )
          );
        }

        let projects;

        // Roles that can see ALL company projects
        const canSeeAllProjects = [
          CompanyUserRole.ADMIN,
          CompanyUserRole.MANAGING_DIRECTOR,
          CompanyUserRole.MANAGER,
        ].includes(req.companyRole);

        if (canSeeAllProjects) {
          // These roles can see all company projects
          projects = await companyService.getCompanyProjects(
              req.activeCompany.id
          );
        } else {
          // Other roles only see projects they're assigned to
          projects = await projectService.getProjectsByUserIdAndCompany(
              userId,
              req.activeCompany.id
          );
        }

        res.json(successResponse(projects));
      } else {
        // Individual context - no company role required
        const projects = await projectService.getProjectsByUserId(userId, true);
        res.json(successResponse(projects));
      }
    } catch (error) {
      next(error);
    }
  }

  async getProjectMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      if (!Types.ObjectId.isValid(projectId)) {
        return next(
          new AppError("Invalid project ID format", 400, ErrorType.VALIDATION)
        );
      }

      const members = await projectService.getProjectMembers(projectId);
      res.json(successResponse(members, "Project members retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  async getAllProjects(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const projects = await projectService.getAllProjects();
      res.json(successResponse(projects));
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        return next(
            new AppError("Invalid project ID format", 400, ErrorType.VALIDATION)
        );
      }
      const project = await projectService.getProjectById(id);
      if (!project) {
        throw new Error("Project not found");
      }

      // Update project fields
      Object.assign(project, req.body);

      // Optional file on update
      if (req.file) {
        const description = req.body.description || "Updated project document";
        const upload = await uploadService.saveFileDetails(
            req.user,
            req.file,
            description
        );
        project.documents.push({
          filePath: upload.filePath,
          description: upload.description,
        });
      }

      await project.save();
      res.json(successResponse(project, "Project updated successfully"));
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!Types.ObjectId.isValid(id)) {
        return next(
            new AppError("Invalid project ID format", 400, ErrorType.VALIDATION)
        );
      }
      await projectService.deleteProject(id);
      res.json(successResponse(null, "Project deleted successfully"));
    } catch (error) {
      next(error);
    }
  }

  async deleteProjectDocument(
      req: AuthRequest,
      res: Response,
      next: NextFunction
  ) {
    try {
      const { projectId } = req.params;
      if (!Types.ObjectId.isValid(projectId)) {
        return next(
            new AppError("Invalid project ID format", 400, ErrorType.VALIDATION)
        );
      }
      const { documentId, documentType, documentPath } = req.body;

      await projectService.deleteProjectDocument(
          projectId,
          documentId,
          documentType,
          documentPath
      );

      res.json(successResponse(null, "Document deleted successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
