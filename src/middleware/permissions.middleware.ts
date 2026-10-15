import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/types/auth.request";
import { AppError, ErrorType } from "@/utils/exceptions";
import { IProject, Project } from "@/modules/projects/project.model";
import mongoose from "mongoose";
import { CompanyUserRole, UserRole } from "@/types/enums";
import { Company } from "@/modules/users/company/company.model";
import { Budget } from "@/modules/finance/models/budget.model";
import { Expense } from "@/modules/finance/models/expense.model";
import { Invoice } from "@/modules/finance/models/invoice.model";
import { PurchaseOrder } from "@/modules/procurement/purchaseOrder.model";
import { MaterialRequest } from "@/modules/procurement/materialRequest.model";
import {
  ProgressTracking,
  ProjectStageModel,
} from "@/modules/timeline/timeline.model";
import { GRN } from "@/modules/finance/models/grn.model";
import { InventoryItem } from "@/modules/finance/models/inventory.model";
import { BoQ } from "@/modules/finance/models/boq.model";
import { Tender } from "@/modules/bidding/models/tender.model";
import { Bid } from "@/modules/bidding/models/bid.model";
import {getPermissionsForRole, hasPermission} from "@/config/permissions";
import {AuthRequest} from "@/middleware/auth.middleware";

// export const getUserProjectRole = (
//   userId: string,
//   project: IProject
// ): UserRole | null => {
//   const userIdString = userId.toString();
//
//   // Check if user is project owner
//   if (project.createdBy.toString() === userIdString) {
//     return UserRole.OWNER;
//   }
//
// // Find the user in the new team array
//   const teamMember = project.team.find(
//     (member) => member.user.toString() === userIdString
//   );
//
//   return teamMember ? teamMember.role : null;
// };

export const isUserInProject = (userId: string, project: IProject): boolean => {
  return getUserProjectRole(userId, project) !== null;
};

// Middleware to check if user is project owner
export const requireProjectOwnership = () => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new AppError(
          "User not authenticated",
          401,
          ErrorType.AUTHENTICATION
        );
      }

      // Get project ID from request params or body
      const projectId =
        req.params.projectId || req.params.id || req.body.projectId;

      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new AppError("Invalid project ID", 400, ErrorType.VALIDATION);
      }

      const project = await Project.findById(projectId);
      if (!project) {
        throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
      }

      // Allow company admin to act as owner for company projects
      if (project.companyId) {
        const company = await Company.findById(project.companyId);
        if (company) {
          const memberInfo = company.members.find(
            (member) => member.userId.toString() === req.user!.id
          );
          if (memberInfo && memberInfo.role === CompanyUserRole.ADMIN) {
            req.project = project;
            req.projectRole = "Owner"; // Grant owner-level access
            return next();
          }
        }
      }

      if (project.createdBy.toString() !== req.user.id) {
        throw new AppError(
          "Only the project owner can perform this action.",
          403,
          ErrorType.AUTHORIZATION
        );
      }

      req.project = project;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to check if user is part of project team
export const requireProjectMembership = () => {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new AppError(
          "User not authenticated",
          401,
          ErrorType.AUTHENTICATION
        );
      }

      // Get project ID from request params or body
      const projectId =
        req.params.projectId || req.params.id || req.body.projectId;

      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new AppError("Invalid project ID", 400, ErrorType.VALIDATION);
      }

      const project = await Project.findById(projectId);
      if (!project) {
        throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
      }

      // First, handle special access for company admins on company projects
      if (project.companyId) {
        const company = await Company.findById(project.companyId);
        if (company) {
          const memberInfo = company.members.find(
            (member) => member.userId.toString() === req.user!.id
          );

          if (memberInfo && memberInfo.role === CompanyUserRole.ADMIN) {
            req.project = project;
            req.projectRole = "Owner"; // Grant owner-level access
            return next();
          }
        }
      }

      // Determine the user's direct role in the project
      const userProjectRole = getUserProjectRole(req.user!.id, project);

      if (userProjectRole) {
        req.project = project;
        req.projectRole = userProjectRole;

        const projectPermissions = getPermissionsForRole(userProjectRole);
        const basePermissions = req.user.permissions || [];
        // The Set ensures no duplicate permissions
        req.user.permissions = [
          ...new Set([...basePermissions, ...projectPermissions]),
        ];
        return next();
      }

      // If userProjectRole is null, they are not on the team at all
      throw new AppError(
        "You are not part of this project team",
        403,
        ErrorType.AUTHORIZATION
      );
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Get user's role in a project
 */
const getUserProjectRole = (
    userId: string,
    project: IProject
): UserRole | null => {
  const userIdString = userId.toString();

  // Check if user is project owner
  if (project.createdBy.toString() === userIdString) {
    return UserRole.OWNER;
  }

  // Find the user in the team array
  const teamMember = project.team.find(
      (member) => member.user.toString() === userIdString
  );

  return teamMember ? teamMember.role : null;
};

/**
 * Middleware factory that ensures the current user has the specified permission(s)
 * on the active project.
 *
 * This middleware:
 * 1. Loads the project from activeContext
 * 2. Determines the user's role in the project
 * 3. Checks if that role has the required permission(s)
 * 4. Grants access to company admins for company projects
 * 5. Sets req.project and req.projectRole for downstream use
 *
 * @param permissions - Array of permission strings required (e.g., ['budget:create'])
 * @param options - Additional options
 * @returns Express middleware function
 *
 * @example
 * router.post('/budgets',
 *   authenticate,
 *   setActiveContext,
 *   requireProjectPermission(['budget:create']),
 *   createBudget
 * );
 */
export const requireProjectPermission = (
    permissions: string[],
    options?: {
      // Allow owner to bypass permission check
      allowOwnerOverride?: boolean;
      // Custom error message
      errorMessage?: string;
    }
) => {
  return async (
      req: AuthRequest,
      _res: Response,
      next: NextFunction
  ) => {
    try {
      // 1. Check authentication
      if (!req.user) {
        throw new AppError(
            "User not authenticated",
            401,
            ErrorType.AUTHENTICATION
        );
      }

      // 2. Check if activeContext exists and has projectId
      // Get project ID from request params or body
      const projectId =
          req.params.projectId || req.params.id || req.body.projectId;

      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new AppError("Invalid project ID", 400, ErrorType.VALIDATION);
      }
      if (!projectId) {
        throw new AppError(
            "Active project context not set. Ensure setActiveContext middleware runs before requireProjectPermission.",
            500,
            ErrorType.AUTHORIZATION
        );
      }

      // 3. Validate projectId
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new AppError("Invalid project ID", 400, ErrorType.VALIDATION);
      }

      // 4. Fetch the project
      const project = await Project.findById(projectId);
      if (!project) {
        throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
      }

      // 5. Check if this is a company project and user is company admin
      if (project.companyId) {
        const company = await Company.findById(project.companyId);
        if (company) {
          const memberInfo = company.members.find(
              (member) => member.userId.toString() === req.user!.id
          );

          // Company admin gets owner-level access
          if (memberInfo && memberInfo.role === CompanyUserRole.ADMIN) {
            req.project = project;
            req.projectRole = UserRole.OWNER;

            // Add all permissions to user
            const ownerPermissions = getPermissionsForRole(UserRole.OWNER);
            const basePermissions = req.user.permissions || [];
            req.user.permissions = [
              ...new Set([...basePermissions, ...ownerPermissions]),
            ];

            return next();
          }
        }
      }

      // 6. Determine user's role in the project
      const userProjectRole = getUserProjectRole(req.user.id, project);

      if (!userProjectRole) {
        throw new AppError(
            "You are not a member of this project",
            403,
            ErrorType.AUTHORIZATION
        );
      }

      // 7. Set project context
      req.project = project;
      req.projectRole = userProjectRole;

      // 8. Owner override (if enabled)
      if (
          options?.allowOwnerOverride !== false &&
          userProjectRole === UserRole.OWNER
      ) {
        // Add all owner permissions
        const ownerPermissions = getPermissionsForRole(UserRole.OWNER);
        const basePermissions = req.user.permissions || [];
        req.user.permissions = [
          ...new Set([...basePermissions, ...ownerPermissions]),
        ];
        return next();
      }

      // 9. Check if user has all required permissions
      const rolePermissions = getPermissionsForRole(userProjectRole);

      // Add role permissions to user
      const basePermissions = req.user.permissions || [];
      req.user.permissions = [
        ...new Set([...basePermissions, ...rolePermissions]),
      ];

      // Check each required permission
      const missingPermissions = permissions.filter(
          (permission) => !hasPermission(userProjectRole, permission)
      );

      if (missingPermissions.length > 0) {
        throw new AppError(
            options?.errorMessage ||
            `You do not have the required permission(s): ${missingPermissions.join(", ")}. Your role: ${userProjectRole}`,
            403,
            ErrorType.AUTHORIZATION
        );
      }

      // 10. All checks passed
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Convenience middleware that requires ANY ONE of the specified permissions (OR logic)
 *
 * @example
 * router.put('/material-requests/:id',
 *   authenticate,
 *   setActiveContext,
 *   requireAnyProjectPermission(['material-request:update', 'material-request:approve']),
 *   updateMaterialRequest
 * );
 */
export const requireAnyProjectPermission = (
    permissions: string[],
    options?: {
      allowOwnerOverride?: boolean;
      errorMessage?: string;
    }
) => {
  return async (
      req: AuthenticatedRequest,
      _res: Response,
      next: NextFunction
  ) => {
    try {
      if (!req.user) {
        throw new AppError(
            "User not authenticated",
            401,
            ErrorType.AUTHENTICATION
        );
      }

      // Get project ID from request params or body
      const projectId =
          req.params.projectId || req.params.id || req.body.projectId;

      if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new AppError("Invalid project ID", 400, ErrorType.VALIDATION);
      }
      if (!projectId) {
        throw new AppError(
            "Active project context not set",
            500,
            ErrorType.AUTHORIZATION
        );
      }

      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new AppError("Invalid project ID", 400, ErrorType.VALIDATION);
      }

      const project = await Project.findById(projectId);
      if (!project) {
        throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
      }

      // Check company admin access
      if (project.companyId) {
        const company = await Company.findById(project.companyId);
        if (company) {
          const memberInfo = company.members.find(
              (member) => member.userId.toString() === req.user!.id
          );

          if (memberInfo && memberInfo.role === CompanyUserRole.ADMIN) {
            req.project = project;
            req.projectRole = UserRole.OWNER;

            const ownerPermissions = getPermissionsForRole(UserRole.OWNER);
            const basePermissions = req.user.permissions || [];
            req.user.permissions = [
              ...new Set([...basePermissions, ...ownerPermissions]),
            ];

            return next();
          }
        }
      }

      const userProjectRole = getUserProjectRole(req.user.id, project);

      if (!userProjectRole) {
        throw new AppError(
            "You are not a member of this project",
            403,
            ErrorType.AUTHORIZATION
        );
      }

      req.project = project;
      req.projectRole = userProjectRole;

      // Owner override
      if (
          options?.allowOwnerOverride !== false &&
          userProjectRole === UserRole.OWNER
      ) {
        const ownerPermissions = getPermissionsForRole(UserRole.OWNER);
        const basePermissions = req.user.permissions || [];
        req.user.permissions = [
          ...new Set([...basePermissions, ...ownerPermissions]),
        ];
        return next();
      }

      // Check if user has at least ONE of the required permissions
      const hasAnyPermission = permissions.some((permission) =>
          hasPermission(userProjectRole, permission)
      );

      if (!hasAnyPermission) {
        throw new AppError(
            options?.errorMessage ||
            `You need at least one of these permissions: ${permissions.join(", ")}. Your role: ${userProjectRole}`,
            403,
            ErrorType.AUTHORIZATION
        );
      }

      // Add role permissions to user
      const rolePermissions = getPermissionsForRole(userProjectRole);
      const basePermissions = req.user.permissions || [];
      req.user.permissions = [
        ...new Set([...basePermissions, ...rolePermissions]),
      ];

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Convenience middleware that requires ALL specified permissions (AND logic)
 *
 * @example
 * router.post('/projects/:projectId/finalize',
 *   authenticate,
 *   setActiveContext,
 *   requireAllProjectPermissions(['budget:approve', 'quality:approve']),
 *   finalizeProject
 * );
 */
export const requireAllProjectPermissions = (
    permissions: string[],
    options?: {
      allowOwnerOverride?: boolean;
      errorMessage?: string;
    }
) => {
  // This is the same as requireProjectPermission since it already checks ALL permissions
  return requireProjectPermission(permissions, options);
};
/**
 * Middleware to set project context from a budget ID in the route params.
 * It fetches the budget, extracts the projectId, and then uses the existing
 * requireProjectMembership middleware to perform the actual permission check.
 */
export const requireBudgetRole = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const budgetId = req.params.id;
      if (!budgetId || !mongoose.Types.ObjectId.isValid(budgetId)) {
        throw new AppError("Invalid budget ID", 400, ErrorType.VALIDATION);
      }

      const budget = await Budget.findById(budgetId).select("projectId");
      if (!budget) {
        throw new AppError("Budget not found", 404, ErrorType.NOT_FOUND);
      }

      // Set the projectId on the request for the next middleware
      req.params.projectId = budget.projectId.toString();

      // Now, call the standard requireProjectMembership middleware
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from an expense ID in the route params.
 * It fetches the expense, extracts the projectId, and then uses the existing
 * requireProjectMembership middleware to perform the actual permission check.
 */
export const requireExpenseRole = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const expenseId = req.params.id;
      if (!expenseId || !mongoose.Types.ObjectId.isValid(expenseId)) {
        throw new AppError("Invalid expense ID", 400, ErrorType.VALIDATION);
      }

      const expense = await Expense.findById(expenseId).select("projectId");
      if (!expense) {
        throw new AppError("Expense not found", 404, ErrorType.NOT_FOUND);
      }

      // Set the projectId on the request for the next middleware
      req.params.projectId = expense.projectId.toString();

      // Now, call the standard requireProjectMembership middleware
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from an invoice ID in the route params.
 * It fetches the invoice, extracts the projectId, and then uses the existing
 * requireProjectMembership middleware to perform the actual permission check.
 */
export const requireInvoiceRole = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const invoiceId = req.params.id;
      if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
        throw new AppError("Invalid invoice ID", 400, ErrorType.VALIDATION);
      }

      const invoice = await Invoice.findById(invoiceId).select("projectId");
      if (!invoice) {
        throw new AppError("Invoice not found", 404, ErrorType.NOT_FOUND);
      }

      // Set the projectId on the request for the next middleware
      req.params.projectId = invoice.projectId.toString();

      // Now, call the standard requireProjectMembership middleware
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from a Purchase Order ID in the route params.
 * It fetches the PO, extracts the projectId, and then uses the existing
 * requireProjectMembership middleware to perform the actual permission check.
 */
export const requirePurchaseOrderRole = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const poId = req.params.id;
      if (!poId || !mongoose.Types.ObjectId.isValid(poId)) {
        throw new AppError(
          "Invalid Purchase Order ID",
          400,
          ErrorType.VALIDATION
        );
      }

      const purchaseOrder = await PurchaseOrder.findById(poId).select(
        "projectId"
      );
      if (!purchaseOrder) {
        throw new AppError(
          "Purchase Order not found",
          404,
          ErrorType.NOT_FOUND
        );
      }

      req.params.projectId = purchaseOrder.projectId.toString();
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from a Material Request ID in the route params.
 * It fetches the request, extracts the projectId, and then uses the existing
 * requireProjectMembership middleware to perform the actual permission check.
 */
export const requireMaterialRequestRole = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const requestId = req.params.id;
      if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
        throw new AppError(
          "Invalid Material Request ID",
          400,
          ErrorType.VALIDATION
        );
      }

      const materialRequest = await MaterialRequest.findById(requestId).select(
        "projectId"
      );
      if (!materialRequest) {
        throw new AppError(
          "Material Request not found",
          404,
          ErrorType.NOT_FOUND
        );
      }

      req.params.projectId = materialRequest.projectId.toString();
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from a Project Stage ID in the route params.
 * It fetches the stage, extracts the projectId, and then uses the existing
 * project membership middleware to perform the actual permission check.
 */
export const requireProjectStageContext = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const stageId = req.params.id;
      if (!stageId || !mongoose.Types.ObjectId.isValid(stageId)) {
        throw new AppError(
          "Invalid Project Stage ID",
          400,
          ErrorType.VALIDATION
        );
      }

      const projectStage = await ProjectStageModel.findById(stageId).select(
        "projectId"
      );
      if (!projectStage) {
        throw new AppError("Project Stage not found", 404, ErrorType.NOT_FOUND);
      }

      req.params.projectId = projectStage.projectId.toString();
      // By default, we check for membership. Ownership can be checked by the next middleware.
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from a Progress Tracking ID in the route params.
 * It fetches the tracking record, extracts the projectId, and then uses the existing
 * project membership middleware to perform the actual permission check.
 */
export const requireProgressTrackingContext = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const trackingId = req.params.id;
      if (!trackingId || !mongoose.Types.ObjectId.isValid(trackingId)) {
        throw new AppError(
          "Invalid Progress Tracking ID",
          400,
          ErrorType.VALIDATION
        );
      }

      const progressTracking = await ProgressTracking.findById(
        trackingId
      ).select("projectId");
      if (!progressTracking) {
        throw new AppError(
          "Progress Tracking not found",
          404,
          ErrorType.NOT_FOUND
        );
      }

      req.params.projectId = progressTracking.projectId.toString();
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from a BoQ Item ID in the route params.
 * It fetches the BoQ item, extracts the projectId, and then uses the existing
 * project membership middleware to perform the actual permission check.
 */
export const requireBoqItemContext = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const boqItemId = req.params.id;
      if (!boqItemId || !mongoose.Types.ObjectId.isValid(boqItemId)) {
        throw new AppError("Invalid BoQ Item ID", 400, ErrorType.VALIDATION);
      }

      // Find the BoQ document that contains the line item
      const boq = await BoQ.findOne({ "sections.items._id": boqItemId }).select(
        "projectId"
      );
      if (!boq) {
        throw new AppError(
          "BoQ Item not found in any project",
          404,
          ErrorType.NOT_FOUND
        );
      }

      req.params.projectId = boq.projectId.toString();
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from a GRN ID in the route params.
 * It fetches the GRN, extracts the projectId, and then uses the existing
 * project membership middleware to perform the actual permission check.
 */
export const requireGrnContext = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const grnId = req.params.id;
      if (!grnId || !mongoose.Types.ObjectId.isValid(grnId)) {
        throw new AppError("Invalid GRN ID", 400, ErrorType.VALIDATION);
      }

      const grn = await GRN.findById(grnId).select("projectId");
      if (!grn) {
        throw new AppError("GRN not found", 404, ErrorType.NOT_FOUND);
      }

      req.params.projectId = grn.projectId.toString();
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from a Document (Upload) ID in the request body.
 * It fetches the document, extracts the projectId, and then uses the existing
 * requireProjectMembership middleware to perform the actual permission check.
 */
export const requireDocumentContext = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const documentId = req.body.documentId || req.params.documentId;
      if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
        throw new AppError("Invalid document ID", 400, ErrorType.VALIDATION);
      }

      // First check in Upload collection
      const { Upload } = await import("@/modules/file/upload.model");
      const upload = await Upload.findById(documentId).select("projectId");
      
      if (!upload) {
        throw new AppError("Document not found", 404, ErrorType.NOT_FOUND);
      }

      if (!upload.projectId) {
        throw new AppError("Document is not associated with a project", 400, ErrorType.VALIDATION);
      }

      req.params.projectId = upload.projectId.toString();
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to set project context from an Inventory Item ID in the route params.
 * It fetches the item, extracts the projectId, and then uses the existing
 * project membership middleware to perform the actual permission check.
 */
export const requireInventoryContext = () => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const itemId = req.params.id;
      if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
        throw new AppError(
          "Invalid Inventory Item ID",
          400,
          ErrorType.VALIDATION
        );
      }

      const inventoryItem = await InventoryItem.findById(itemId).select(
        "projectId"
      );
      if (!inventoryItem) {
        throw new AppError(
          "Inventory Item not found",
          404,
          ErrorType.NOT_FOUND
        );
      }

      req.params.projectId = inventoryItem.projectId.toString();
      return requireProjectMembership()(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to ensure the authenticated user is the creator of the tender.
 * It fetches the tender by ID from params and compares the createdBy field.
 */
export const requireTenderCreator = () => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const tenderId = req.params.tenderId || req.body.tenderId || req.params.id;
      if (!tenderId || !mongoose.Types.ObjectId.isValid(tenderId)) {
        throw new AppError("Invalid or missing Tender ID", 400, ErrorType.VALIDATION);
      }
      const tender = await Tender.findById(tenderId).select("createdBy");
      if (!tender) {
        throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
      }
      if (tender.createdBy.toString() !== req.user!.id) {
        throw new AppError("You do not have permission to modify this tender.", 403, ErrorType.AUTHORIZATION);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to ensure the authenticated user is part of the tender's evaluation committee
 * OR is the tender creator (creator automatically has evaluator access).
 */
export const requireTenderEvaluator = (options: { isBid?: boolean } = {}) => {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      let tenderId = req.params.tenderId;

      if (!tenderId) {
        if (options.isBid) {
          const bidId = req.params.id || req.params.bidId;
          if (!bidId || !mongoose.Types.ObjectId.isValid(bidId)) {
            throw new AppError("Invalid or missing Bid ID", 400, ErrorType.VALIDATION);
          }
          const bid = await Bid.findById(bidId).select("tenderId");
          if (!bid) {
            throw new AppError("Bid not found", 404, ErrorType.NOT_FOUND);
          }
          tenderId = bid.tenderId.toString();
        } else {
          tenderId = req.params.id;
        }
      }

      if (!tenderId || !mongoose.Types.ObjectId.isValid(tenderId)) {
        throw new AppError("Invalid or missing Tender ID", 400, ErrorType.VALIDATION);
      }

      const tender = await Tender.findById(tenderId)
        .select("evaluationCommittee createdBy");
      if (!tender) {
        throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
      }

      const userId = req.user!.id;
      const isCreator = tender.createdBy.toString() === userId;
      const isCommitteeMember = tender.evaluationCommittee.some(
        (id) => id.toString() === userId
      );

      if (!isCreator && !isCommitteeMember) {
        throw new AppError(
          "You are neither the tender creator nor an evaluation committee member.",
          403,
          ErrorType.AUTHORIZATION
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
