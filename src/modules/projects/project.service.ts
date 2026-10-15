import { Project, IProject } from "./project.model";
import { AppError, ErrorType } from "@/utils/exceptions";
import mongoose from "mongoose";
import { DocumentStatus, UserRole } from "@/types/enums";
import { ProgressTracking } from "../timeline/timeline.model";
import { PurchaseOrder } from "../procurement/purchaseOrder.model";
import { Expense } from "../finance/models/expense.model";
import { Invoice } from "../finance/models/invoice.model";
import { GRN } from "../finance/models/grn.model";
import { uploadService } from "../file/upload.service";
import { notificationService } from "../notifications/notifcation.service";
import { User } from "../users/user.model";
import { Upload } from "../file/upload.model";
import { pick } from "@/utils/pick";

interface IProjectDocument {
  id: string;
  type: string;
  name: string;
  path: string;
  date: Date;
  source: string; // e.g., 'Goods Received Note', 'Invoice'
  isSensitive: boolean; // To flag financial or sensitive documents
  status: DocumentStatus;
}

export class ProjectService {
  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(
        "Invalid project ID format",
        400,
        ErrorType.VALIDATION
      );
    }
  }

  async createProject(
    projectData: Partial<IProject>,
    userId: string
  ): Promise<IProject> {
    this.validateObjectId(userId);

    const allowedFields = [
      "name", "projectDescription", "status", "type", "budget",
      "startDate", "endDate", "location", "team"
    ];
    const safeData = pick(projectData, allowedFields);

    const project = new Project({
      ...safeData,
      createdBy: userId,
      updatedBy: userId,
      team: safeData.team && safeData.team.length > 0 ? safeData.team : [
        {
          user: new mongoose.Types.ObjectId(userId),
          role: UserRole.OWNER,
        }
      ],
    });
    await project.save();
    return project;
  }

  async getProjectById(id: string): Promise<IProject> {
    this.validateObjectId(id);

    const project = await Project.findById(id).populate(
        "team.user",
        "fullName email profilePicture"
    );

    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    return project;
  }

  async getAllProjects(): Promise<IProject[]> {
    const projects = await Project.find().populate(
        "team.user",
        "fullName email profilePicture"
    );
    return projects;
  }


  async getProjectsByUserIdAndCompany(
    userId: string,
    companyId: string
  ): Promise<IProject[]> {
    this.validateObjectId(userId);
    this.validateObjectId(companyId);

    // Find projects where user is a team member AND it's associated with the company
    const query = {
      companyId: companyId,
      $or: [{ createdBy: userId }, { "team.user": userId }],
    };

    const projects = await Project.find(query)
      .populate("createdBy", "fullName email profilePicture")
      .populate("team.user", "fullName email profilePicture")
      .populate("companyId", "name");

    return projects;
  }

  async getProjectDocuments(
      projectId: string,
      userRole: UserRole,
      filters: {
        type?: string;
        startDate?: string;
        endDate?: string;
        status?: DocumentStatus;
      }
  ): Promise<IProjectDocument[]> {
    this.validateObjectId(projectId);

    const allDocuments: IProjectDocument[] = [];
    const allFilePaths: string[] = [];
    const intermediateDocs: any[] = [];

    const dateQuery: any = {};

    if (filters.startDate) {
      dateQuery.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1); // Include the entire end date
      dateQuery.$lte = endDate;
    }

    const hasDateFilter = Object.keys(dateQuery).length > 0;

    // Define which roles can access sensitive financial/procurement documents
    const canAccessFinancialDocs = [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.FINANCE_OFFICER,
      UserRole.PROCUREMENT_OFFICER,
    ].includes(userRole);

    // Define which roles can access procurement-specific documents
    const canAccessProcurementDocs = [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.SITE_ENGINEER,
    ].includes(userRole);

    // All roles can access general project documents
    const canAccessGeneralDocs = true;

    // Define which roles can access quality and site-related documents
    const canAccessQualityDocs = [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.QA_QC_OFFICER,
      UserRole.SITE_ENGINEER,
    ].includes(userRole);

    // Define which roles can access HSE documents
    const canAccessHSEDocs = [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.HSE_OFFICER,
      UserRole.SITE_ENGINEER,
    ].includes(userRole);

    // --- Source 1: General Project Documents ---
    if (
        canAccessGeneralDocs &&
        (!filters.type || filters.type.toLowerCase() === "project")
    ) {
      const project = await Project.findById(projectId).select(
          "documents createdAt"
      );
      if (project?.documents) {
        for (const doc of project.documents) {
          if (
              doc.filePath &&
              (!hasDateFilter ||
                  ((!dateQuery.$gte || project.createdAt >= dateQuery.$gte) &&
                      (!dateQuery.$lte || project.createdAt <= dateQuery.$lte)))
          ) {
            allFilePaths.push(doc.filePath);
            intermediateDocs.push({
              sourceId: project._id.toString(),
              type: "Project",
              name: doc.description || "Project Document",
              path: doc.filePath,
              date: project.createdAt,
              source: "Project General",
              isSensitive: false,
            });
          }
        }
      }
    }

    // --- Source 2: Goods Received Notes (GRN) ---
    // Financial and procurement officers need access to GRNs
    if (
        canAccessProcurementDocs &&
        (!filters.type || filters.type.toLowerCase() === "grn")
    ) {
      const grnQuery: any = { projectId };
      if (hasDateFilter) grnQuery.receivedDate = dateQuery;
      const grns = await GRN.find(grnQuery).select(
          "grnNumber receivedDate documents createdAt"
      );
      for (const grn of grns) {
        for (const doc of grn.documents) {
          if (doc.filePath) {
            allFilePaths.push(doc.filePath);
            intermediateDocs.push({
              sourceId: grn._id.toString(),
              type: "GRN",
              name: doc.description || `GRN Doc for ${grn.grnNumber}`,
              path: doc.filePath,
              date: grn.receivedDate || grn._id.getTimestamp(),
              source: "Goods Received Note",
              isSensitive: true,
            });
          }
        }
      }
    }

    // --- Source 3: Invoices ---
    // Finance officers, project managers, and procurement need access
    if (
        canAccessFinancialDocs &&
        (!filters.type || filters.type.toLowerCase() === "invoice")
    ) {
      const invoiceQuery: any = { projectId };
      if (hasDateFilter) invoiceQuery.createdAt = dateQuery;
      const invoices = await Invoice.find(invoiceQuery).select(
          "invoiceNumber documents createdAt"
      );
      for (const invoice of invoices) {
        for (const doc of invoice.documents) {
          if (doc.filePath) {
            allFilePaths.push(doc.filePath);
            intermediateDocs.push({
              sourceId: invoice._id.toString(),
              type: "Invoice",
              name:
                  doc.description || `Invoice Doc for ${invoice.invoiceNumber}`,
              path: doc.filePath,
              date: invoice._id.getTimestamp(),
              source: "Invoice",
              isSensitive: true,
            });
          }
        }
      }
    }

    // --- Source 4: Expenses ---
    // Finance officers and project managers need access
    if (
        canAccessFinancialDocs &&
        (!filters.type || filters.type.toLowerCase() === "expense")
    ) {
      const expenseQuery: any = { projectId };
      if (hasDateFilter) expenseQuery.date = dateQuery;
      const expenses = await Expense.find(expenseQuery).select(
          "description documents date"
      );
      for (const expense of expenses) {
        for (const doc of expense.documents) {
          if (doc.filePath) {
            allFilePaths.push(doc.filePath);
            intermediateDocs.push({
              sourceId: expense._id.toString(),
              type: "Expense",
              name: doc.description || expense.description,
              path: doc.filePath,
              date: expense.date,
              source: "Expense Report",
              isSensitive: true,
            });
          }
        }
      }
    }

    // --- Source 5: Purchase Orders (PO) ---
    // Procurement and finance officers need access
    if (
        canAccessProcurementDocs &&
        (!filters.type || filters.type.toLowerCase() === "po")
    ) {
      const poQuery: any = { projectId };
      if (hasDateFilter) poQuery.orderDate = dateQuery;
      const pos = await PurchaseOrder.find(poQuery).select(
          "poNumber documentFilePath orderDate"
      );
      for (const po of pos) {
        if (po.documentFilePath) {
          allFilePaths.push(po.documentFilePath);
          intermediateDocs.push({
            sourceId: po._id.toString(),
            type: "PO",
            name: `PO Document for ${po.poNumber}`,
            path: po.documentFilePath,
            date: po.orderDate,
            source: "Purchase Order",
            isSensitive: true,
          });
        }
      }
    }

    // --- Source 6: Progress Reports ---
    // Site engineers, project managers, QA/QC, and HSE officers need access
    if (
      (canAccessGeneralDocs || canAccessQualityDocs || canAccessHSEDocs) &&
      (!filters.type || filters.type.toLowerCase() === "progress")
    ) {
      const progressQuery: any = { projectId };
      if (hasDateFilter) progressQuery.createdAt = dateQuery;
      const reports = await ProgressTracking.find(progressQuery).select(
        "supportingDocumentation delayDocumentation createdAt"
      );
      
      for (const report of reports) {
        // Handle supportingDocumentation (now array of objects with filePath and description)
        for (const doc of report.supportingDocumentation) {
          if (doc.filePath) {
            allFilePaths.push(doc.filePath);
            intermediateDocs.push({
              sourceId: report._id.toString(),
              type: "Progress",
              name: doc.description || "Supporting Documentation",
              path: doc.filePath,
              date: doc.uploadedAt || report._id.getTimestamp(),
              source: "Progress Report - Supporting",
              isSensitive: false,
            });
          }
        }
        
        // Handle delayDocumentation (now array of objects with filePath and description)
        for (const doc of report.delayDocumentation) {
          if (doc.filePath) {
            allFilePaths.push(doc.filePath);
            intermediateDocs.push({
              sourceId: report._id.toString(),
              type: "Progress",
              name: doc.description || "Delay Documentation",
              path: doc.filePath,
              date: doc.uploadedAt || report._id.getTimestamp(),
              source: "Progress Report - Delay",
              isSensitive: false,
            });
          }
        }
      }
    }

    // // --- Source 7: Quality Reports ---
    // // QA/QC officers, project managers, and site engineers need access
    // if (
    //     canAccessQualityDocs &&
    //     (!filters.type || filters.type.toLowerCase() === "quality")
    // ) {
    //   const qualityQuery: any = { projectId };
    //   if (hasDateFilter) qualityQuery.createdAt = dateQuery;
    //
    //   // Assuming you have a QualityReport model
    //   const qualityReports = await QualityReport.find(qualityQuery).select(
    //       "reportNumber documents createdAt"
    //   );
    //   for (const report of qualityReports) {
    //     for (const doc of report.documents) {
    //       if (doc.filePath) {
    //         allFilePaths.push(doc.filePath);
    //         intermediateDocs.push({
    //           sourceId: report._id.toString(),
    //           type: "Quality",
    //           name: doc.description || `Quality Report ${report.reportNumber}`,
    //           path: doc.filePath,
    //           date: report._id.getTimestamp(),
    //           source: "Quality Report",
    //           isSensitive: false,
    //         });
    //       }
    //     }
    //   }
    // }
    //
    // // --- Source 8: HSE Reports ---
    // // HSE officers, project managers, and site engineers need access
    // if (
    //     canAccessHSEDocs &&
    //     (!filters.type || filters.type.toLowerCase() === "hse")
    // ) {
    //   const hseQuery: any = { projectId };
    //   if (hasDateFilter) hseQuery.createdAt = dateQuery;
    //
    //   // Assuming you have an HSEReport model
    //   const hseReports = await HSEReport.find(hseQuery).select(
    //       "reportNumber incidentType documents createdAt"
    //   );
    //   for (const report of hseReports) {
    //     for (const doc of report.documents) {
    //       if (doc.filePath) {
    //         allFilePaths.push(doc.filePath);
    //         intermediateDocs.push({
    //           sourceId: report._id.toString(),
    //           type: "HSE",
    //           name: doc.description || `HSE Report ${report.reportNumber}`,
    //           path: doc.filePath,
    //           date: report._id.getTimestamp(),
    //           source: "HSE Report",
    //           isSensitive: true, // HSE incidents can be sensitive
    //         });
    //       }
    //     }
    //   }
    // }

    // // --- Source 9: Material Requests ---
    // // Procurement, site engineers, and project managers need access
    // if (
    //     canAccessProcurementDocs &&
    //     (!filters.type || filters.type.toLowerCase() === "material-request")
    // ) {
    //   const materialRequestQuery: any = { projectId };
    //   if (hasDateFilter) materialRequestQuery.createdAt = dateQuery;
    //
    //   const materialRequests = await MaterialRequest.find(materialRequestQuery).select(
    //       "requestNumber documents createdAt"
    //   );
    //   for (const request of materialRequests) {
    //     for (const doc of request.documents) {
    //       if (doc.filePath) {
    //         allFilePaths.push(doc.filePath);
    //         intermediateDocs.push({
    //           sourceId: request._id.toString(),
    //           type: "MaterialRequest",
    //           name: doc.description || `Material Request ${request.requestNumber}`,
    //           path: doc.filePath,
    //           date: request._id.getTimestamp(),
    //           source: "Material Request",
    //           isSensitive: false,
    //         });
    //       }
    //     }
    //   }
    // }

    // Fetch all Upload documents at once and map by filePath
    const uploadQuery: any = { filePath: { $in: allFilePaths } };
    if (filters.status) {
      uploadQuery.status = filters.status;
    }
    const uploads = await Upload.find(uploadQuery).select(
        "_id filePath status"
    );
    const uploadsByPath = new Map(
        uploads.map((u) => [
          u.filePath,
          { id: u._id.toString(), status: u.status },
        ])
    );

    // Build the final documents array with status
    for (const doc of intermediateDocs) {
      const uploadDetails = uploadsByPath.get(doc.path);
      if (uploadDetails) {
        allDocuments.push({
          ...doc,
          id: uploadDetails.id,
          status: uploadDetails.status,
        });
      }
    }

    // Sort documents by date, most recent first
    allDocuments.sort((a, b) => b.date.getTime() - a.date.getTime());

    return allDocuments;
  }

  async getProjectsByUserId(
    userId: string,
    individualOnly: boolean = false
  ): Promise<IProject[]> {
    this.validateObjectId(userId);
    const query: any = {
      $or: [{ createdBy: userId }, { "team.user": userId }],
    };

    if (individualOnly) {
      query.companyId = null; // Only projects with no companyId
    }

    const projects = await Project.find(query)
      .populate("createdBy", "fullName email profilePicture")
      .populate("team.user", "fullName email profilePicture")
      .populate("companyId", "name"); // Populate company name if it exists
    return projects;
  }

  // Fetch project members with their roles and basic user info
 async getProjectMembers(projectId: string): Promise<
   {
      userId: string;
      role: UserRole;
      fullName?: string | null;
      email?: string | null;
      profilePicture?: string | null;
      companyId?: string | null;
    }[]
  > {
    this.validateObjectId(projectId);

    const project = await Project.findById(projectId)
      .populate("team.user", "fullName email profilePicture")
      .populate("companyId", "name")
      .select("team companyId");

    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    const companyId = project.companyId ? project.companyId.toString() : null;

    return (project.team || []).map((member: any) => {
      const user = member.user || {};
      const userId =
        typeof user === "object" && user._id ? user._id.toString() : user.toString();
      return {
        userId,
        role: member.role,
        fullName: user.fullName || null,
        email: user.email || null,
        profilePicture: user.profilePicture || null,
        companyId,
      };
    });
  }

  async deleteProjectDocument(
    projectId: string,
    documentId: string,
    documentType: string,
    documentPath: string
  ): Promise<void> {
    this.validateObjectId(projectId);
    this.validateObjectId(documentId);

    let updateResult;

    switch (documentType.toLowerCase()) {
      case "project":
        updateResult = await Project.updateOne(
          { _id: documentId },
          { $pull: { documents: { filePath: documentPath } } }
        );
        break;
      case "grn":
        updateResult = await GRN.updateOne(
          { _id: documentId, projectId },
          { $pull: { documents: { filePath: documentPath } } }
        );
        break;
      case "invoice":
        updateResult = await Invoice.updateOne(
          { _id: documentId, projectId },
          { $pull: { documents: { filePath: documentPath } } }
        );
        break;
      case "expense":
        updateResult = await Expense.updateOne(
          { _id: documentId, projectId },
          { $pull: { documents: { filePath: documentPath } } }
        );
        break;
      case "po":
        updateResult = await PurchaseOrder.updateOne(
          { _id: documentId, projectId, documentFilePath: documentPath },
          { $unset: { documentFilePath: "" } }
        );
        break;
      case "progress":
        // Updated to handle new document structure with objects
        updateResult = await ProgressTracking.updateOne(
          { _id: documentId, projectId },
          {
            $pull: {
              supportingDocumentation: { filePath: documentPath },
              delayDocumentation: { filePath: documentPath },
            },
          }
        );
        break;
      default:
        throw new AppError(
          "Invalid document type provided",
          400,
          ErrorType.VALIDATION
        );
    }

    if (updateResult && updateResult.modifiedCount > 0) {
      await uploadService.deleteFileByPath(documentPath);
    } else {
      throw new AppError(
        "Document not found or could not be deleted",
        404,
        ErrorType.NOT_FOUND
      );
    }
  }

  async reviewDocument(
    documentId: string,
    status: DocumentStatus,
    reviewComments: string,
    reviewerId: string
  ): Promise<void> {
    this.validateObjectId(documentId);
    const document = await Upload.findById(documentId);
    if (!document) {
      throw new AppError("Document not found", 404, ErrorType.NOT_FOUND);
    }

    const { filePath } = document;

    document.status = status;
    document.reviewComments = reviewComments;
    document.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
    document.reviewedAt = new Date();

    await document.save();

    // If rejected, delete the file and notify the uploader
    if (status === DocumentStatus.REJECTED) {
      const uploader = await User.findById(document.userId);

      // Find which project and document collection holds the reference to delete it
      const projectDoc = await Project.findOne({
        "documents.filePath": filePath,
      });
      const grnDoc = await GRN.findOne({ "documents.filePath": filePath });
      const invoiceDoc = await Invoice.findOne({
        "documents.filePath": filePath,
      });
      const expenseDoc = await Expense.findOne({
        "documents.filePath": filePath,
      });
      const poDoc = await PurchaseOrder.findOne({ documentFilePath: filePath });
      const progressDoc = await ProgressTracking.findOne({
        $or: [
          { supportingDocumentation: filePath },
          { delayDocumentation: filePath },
        ],
      });

      let projectForNotification: IProject | null = null;
      if (projectDoc)
        projectForNotification = await Project.findById(projectDoc._id);
      else if (grnDoc)
        projectForNotification = await Project.findById(grnDoc.projectId);
      else if (invoiceDoc)
        projectForNotification = await Project.findById(invoiceDoc.projectId);
      else if (expenseDoc)
        projectForNotification = await Project.findById(expenseDoc.projectId);
      else if (poDoc)
        projectForNotification = await Project.findById(poDoc.projectId);
      else if (progressDoc)
        projectForNotification = await Project.findById(progressDoc.projectId);

      if (uploader && uploader.email && projectForNotification) {
        await notificationService.sendTemplateEmail(
          uploader.email,
          `Document Requires Revision: ${projectForNotification.name}`,
          "document-rejected", // You will need to create this email template
          {
            userName: uploader.fullName || "User",
            projectName: projectForNotification.name,
            documentDescription: document.description,
            comments: reviewComments,
            projectLink: `${process.env.FRONTEND_URL}/projects/${projectForNotification._id}/documents`,
            year: new Date().getFullYear().toString(),
          }
        );
      }

      // Delete the document reference from the correct model
      if (projectDoc) {
        await this.deleteProjectDocument(
          projectDoc._id.toString(),
          projectDoc._id.toString(),
          "project",
          filePath
        );
      } else if (grnDoc) {
        await this.deleteProjectDocument(
          grnDoc.projectId.toString(),
          grnDoc._id.toString(),
          "grn",
          filePath
        );
      } else if (invoiceDoc) {
        await this.deleteProjectDocument(
          invoiceDoc.projectId.toString(),
          invoiceDoc._id.toString(),
          "invoice",
          filePath
        );
      } else if (expenseDoc) {
        await this.deleteProjectDocument(
          expenseDoc.projectId.toString(),
          expenseDoc._id.toString(),
          "expense",
          filePath
        );
      } else if (poDoc) {
        await this.deleteProjectDocument(
          poDoc.projectId.toString(),
          poDoc._id.toString(),
          "po",
          filePath
        );
      } else if (progressDoc) {
        await this.deleteProjectDocument(
          progressDoc.projectId.toString(),
          progressDoc._id.toString(),
          "progress",
          filePath
        );
      } else {
        // If no reference is found in any project-related collection, just delete the upload record itself.
        await uploadService.deleteFileByPath(filePath);
      }
    }
  }

  async updateProject(
    id: string,
    updateData: Partial<IProject>,
    userId: string
  ): Promise<IProject> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    const project = await Project.findById(id);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    // Transform team data if it exists and is populated
    if (updateData.team && Array.isArray(updateData.team)) {
      updateData.team = updateData.team.map((member: any) => ({
        user: typeof member.user === 'string'
            ? new mongoose.Types.ObjectId(member.user)
            : member.user._id || member.user,
        role: member.role
      }));
    }

    // Apply the updates
    Object.assign(project, { ...updateData, updatedBy: userId });
    await project.save();

    // Return the populated project
    return project.populate([
      { path: "team.user", select: "fullName email profilePicture" },
      { path: "createdBy", select: "fullName email profilePicture" },
      { path: "companyId", select: "name" },
    ]);
  }

  async deleteProject(id: string): Promise<void> {
    this.validateObjectId(id);

    const project = await Project.findByIdAndDelete(id);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }
  }
}

export const projectService = new ProjectService();
