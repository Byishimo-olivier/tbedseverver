import { Response, NextFunction } from "express";
import { companyService } from "./company.service";
import { AuthRequest } from "@/middleware/auth.middleware";
import { successResponse } from "@/utils/response";
import { logger } from "@/utils/logger";
import { uploadService } from "@/modules/file/upload.service";

export class CompanyController {
  async createCompany(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const companyData = { ...req.body };
    
    // Handle uploaded files if present
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Process experience documents
      if (files.experienceDocuments && companyData.experience) {
        for (let i = 0; i < companyData.experience.length; i++) {
          if (files.experienceDocuments[i]) {
            const upload = await uploadService.saveFileDetails(
              req.user,
              files.experienceDocuments[i],
              `Experience document ${i + 1}`
            );
            companyData.experience[i].documentProof = upload.filePath;
          }
        }
      }
      
      // Process certification documents
      if (files.certificationDocuments && companyData.certifications) {
        for (let i = 0; i < companyData.certifications.length; i++) {
          if (files.certificationDocuments[i]) {
            const upload = await uploadService.saveFileDetails(
              req.user,
              files.certificationDocuments[i],
              `Certification document ${i + 1}`
            );
            companyData.certifications[i].documentProof = upload.filePath;
          }
        }
      }
    }

    const company = await companyService.createCompany(companyData, req.user.id);
    res.status(201).json(successResponse(company, "Company created successfully"));
  } catch (error) {
    logger.error("Error creating company:", error);
    next(error);
  }
}

  async getCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const company = await companyService.getCompanyById(req.params.id);
      res.json(successResponse(company, "Company retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving company:", error);
      next(error);
    }
  }

  async getUserCompanies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const companies = await companyService.getUserCompanies(req.user.id);
      res.json(successResponse(companies, "Companies retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving user companies:", error);
      next(error);
    }
  }

  async updateCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {

      const companyData = { ...req.body };
    
    // Handle uploaded files if present
    if (req.files) {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Process experience documents
      if (files.experienceDocuments && companyData.experience) {
        for (let i = 0; i < companyData.experience.length; i++) {
          if (files.experienceDocuments[i]) {
            const upload = await uploadService.saveFileDetails(
              req.user,
              files.experienceDocuments[i],
              `Experience document ${i + 1}`
            );
            companyData.experience[i].documentProof = upload.filePath;
          }
        }
      }
      
      // Process certification documents
      if (files.certificationDocuments && companyData.certifications) {
        for (let i = 0; i < companyData.certifications.length; i++) {
          if (files.certificationDocuments[i]) {
            const upload = await uploadService.saveFileDetails(
              req.user,
              files.certificationDocuments[i],
              `Certification document ${i + 1}`
            );
            companyData.certifications[i].documentProof = upload.filePath;
          }
        }
      }
    }
      const company = await companyService.updateCompany(
        req.params.id,
        req.body,
        req.user.id
      );
      res.json(successResponse(company, "Company updated successfully"));
    } catch (error) {
      logger.error("Error updating company:", error);
      next(error);
    }
  }

  async inviteMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { companyId, email, role } = req.body;

      const invitation = await companyService.inviteToCompany(
        companyId,
        email,
        role,
        req.user.id
      );

      res
        .status(201)
        .json(
          successResponse(
            { email: invitation.email, role: invitation.role },
            "Invitation sent successfully"
          )
        );
    } catch (error) {
      logger.error("Error creating company invitation:", error);
      next(error);
    }
  }

  async acceptInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      const result = await companyService.acceptInvitation(token, req.user.id);

      res.json(
        successResponse(
          {
            companyId: result.company._id,
            companyName: result.company.name,
            role: result.role,
          },
          "You have successfully joined the company"
        )
      );
    } catch (error) {
      logger.error("Error accepting company invitation:", error);
      next(error);
    }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { companyId, memberId } = req.params;
      const company = await companyService.removeMemberFromCompany(
        companyId,
        memberId,
        req.user.id
      );
      res.json(
        successResponse(company, "Member removed successfully from company")
      );
    } catch (error) {
      logger.error("Error removing member from company:", error);
      next(error);
    }
  }

  async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { companyId, memberId } = req.params;
      const { role } = req.body;
      const company = await companyService.updateMemberRole(
        companyId,
        memberId,
        role,
        req.user.id
      );
      res.json(successResponse(company, "Member role updated successfully"));
    } catch (error) {
      logger.error("Error updating member role in company:", error);
      next(error);
    }
  }

  async leaveCompany(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      await companyService.leaveCompany(companyId, req.user.id);
      res.json(successResponse(null, "You have successfully left the company"));
    } catch (error) {
      logger.error("Error leaving company:", error);
      next(error);
    }
  }

  async getCompanyMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { companyId } = req.params;
      const members = await companyService.getCompanyMembers(
        companyId,
        req.user.id
      );
      res.json(
        successResponse(members, "Company members retrieved successfully")
      );
    } catch (error) {
      logger.error("Error retrieving company members:", error);
      next(error);
    }
  }

  async getCompanyProjects(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { companyId } = req.params;
      const projects = await companyService.getCompanyProjects(companyId);
      res.json(
        successResponse(projects, "Company projects retrieved successfully")
      );
    } catch (error) {
      logger.error("Error retrieving company projects:", error);
      next(error);
    }
  }

  async getPendingInvitations(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { companyId } = req.params;
      const invitations = await companyService.getPendingInvitations(companyId);
      res.json(
        successResponse(
          invitations,
          "Pending company invitations retrieved successfully"
        )
      );
    } catch (error) {
      logger.error("Error retrieving pending company invitations:", error);
      next(error);
    }
  }
}

export const companyController = new CompanyController();
