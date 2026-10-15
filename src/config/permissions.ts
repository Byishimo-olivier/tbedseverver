import {UserRole} from "@/types/enums";

export interface Permission {
  action: string;
  description: string;
  roles: UserRole[];
}

export const Permissions = {
  // Project permissions
  CREATE_PROJECT: {
    action: "project:create",
    description: "Create new projects",
    roles: [UserRole.OWNER],
  },
  UPDATE_PROJECT: {
    action: "project:update",
    description: "Update project details",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  VIEW_PROJECT: {
    action: "project:view",
    description: "View project details",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  DELETE_PROJECT: {
    action: "project:delete",
    description: "Delete projects",
    roles: [UserRole.OWNER],
  },
  MANAGE_PROJECT_TEAM: {
    action: "project:manage-team",
    description: "Invite and manage project team members",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  VIEW_PROJECT_REPORTS: {
    action: "project:view-reports",
    description: "View project reports",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },

  // Budget permissions
  CREATE_BUDGET: {
    action: "budget:create",
    description: "Create project budgets",
    roles: [UserRole.OWNER, UserRole.FINANCE_OFFICER],
  },
  UPDATE_BUDGET: {
    action: "budget:update",
    description: "Update project budgets",
    roles: [UserRole.OWNER, UserRole.FINANCE_OFFICER],
  },
  VIEW_BUDGET: {
    action: "budget:view",
    description: "View project budgets",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,

    ],
  },
  APPROVE_BUDGET: {
    action: "budget:approve",
    description: "Approve budget changes",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },

  // Expense permissions
  CREATE_EXPENSE: {
    action: "expense:create",
    description: "Record project expenses",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.FINANCE_OFFICER,
      UserRole.PROCUREMENT_OFFICER,
    ],
  },
  UPDATE_EXPENSE: {
    action: "expense:update",
    description: "Update project expenses",
    roles: [UserRole.OWNER, UserRole.FINANCE_OFFICER],
  },
  DELETE_EXPENSE: {
    action: "expense:delete",
    description: "Delete project expenses",
    roles: [UserRole.OWNER, UserRole.FINANCE_OFFICER],
  },
  VIEW_EXPENSE: {
    action: "expense:view",
    description: "View project expenses",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  APPROVE_EXPENSE: {
    action: "expense:approve",
    description: "Approve expenses",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.FINANCE_OFFICER],
  },

  // Invoice permissions
  CREATE_INVOICE: {
    action: "invoice:create",
    description: "Create invoices",
    roles: [UserRole.OWNER, UserRole.FINANCE_OFFICER],
  },
  UPDATE_INVOICE: {
    action: "invoice:update",
    description: "Update invoices",
    roles: [UserRole.OWNER, UserRole.FINANCE_OFFICER],
  },
  UPDATE_INVOICE_STATUS: {
    action: "invoice:update-status",
    description: "Update invoice status",
    roles: [UserRole.OWNER, UserRole.FINANCE_OFFICER],
  },
  VIEW_INVOICE: {
    action: "invoice:view",
    description: "View invoices",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  APPROVE_INVOICE: {
    action: "invoice:approve",
    description: "Approve invoices for payment",
    roles: [UserRole.OWNER, UserRole.FINANCE_OFFICER],
  },

  // Material requests permissions
  CREATE_MATERIAL_REQUEST: {
    action: "material-request:create",
    description: "Create material requests",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
    ],
  },
  UPDATE_MATERIAL_REQUEST: {
    action: "material-request:update",
    description: "Update material requests",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
    ],
  },
  DELETE_MATERIAL_REQUEST: {
    action: "material-request:delete",
    description: "Delete material requests",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  APPROVE_MATERIAL_REQUEST: {
    action: "material-request:approve",
    description: "Approve material requests",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.PROCUREMENT_OFFICER],
  },
  VIEW_MATERIAL_REQUEST: {
    action: "material-request:view",
    description: "View material requests",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },

  // Purchase order permissions
  CREATE_PURCHASE_ORDER: {
    action: "purchase-order:create",
    description: "Create purchase orders",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },
  UPDATE_PURCHASE_ORDER: {
    action: "purchase-order:update",
    description: "Update purchase orders",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },
  DELETE_PURCHASE_ORDER: {
    action: "purchase-order:delete",
    description: "Delete purchase orders",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },
  VIEW_PURCHASE_ORDER: {
    action: "purchase-order:view",
    description: "View purchase orders",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  APPROVE_PURCHASE_ORDER: {
    action: "purchase-order:approve",
    description: "Approve purchase orders",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },

  // BOQ (Bill of Quantities) permissions
  CREATE_BOQ: {
    action: "boq:create",
    description: "Create BOQ items",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  UPDATE_BOQ: {
    action: "boq:update",
    description: "Update BOQ items",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  UPDATE_BOQ_PROGRESS: {
    action: "boq:update-progress",
    description: "Update BOQ progress",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
    ],
  },
  VIEW_BOQ: {
    action: "boq:view",
    description: "View BOQ items",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
    ],
  },
  DELETE_BOQ: {
    action: "boq:delete",
    description: "Delete BOQ items",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },

  // Goods Received Note (GRN) permissions
  CREATE_GRN: {
    action: "grn:create",
    description: "Create Goods Received Notes",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },
  UPDATE_GRN: {
    action: "grn:update",
    description: "Update Goods Received Notes",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },
  VIEW_GRN: {
    action: "grn:view",
    description: "View Goods Received Notes",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  DELETE_GRN: {
    action: "grn:delete",
    description: "Delete Goods Received Notes",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },

  // Inventory permissions
  MANAGE_INVENTORY: {
    action: "inventory:manage",
    description: "Manage inventory items",
    roles: [
      UserRole.OWNER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
    ],
  },
  VIEW_INVENTORY: {
    action: "inventory:view",
    description: "View inventory",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  RECORD_MATERIAL_USAGE: {
    action: "material-usage:record",
    description: "Record material usage",
    roles: [UserRole.OWNER, UserRole.SITE_ENGINEER],
  },
  VIEW_MATERIAL_USAGE: {
    action: "material-usage:view",
    description: "View material usage records",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  GENERATE_MATERIAL_USAGE_REPORT: {
    action: "material-usage:generate-report",
    description: "Generate material usage reports",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.PROCUREMENT_OFFICER,
    ],
  },

  // Timeline permissions
  CREATE_PROJECT_STAGE: {
    action: "timeline:create-stage",
    description: "Create project stages",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  UPDATE_PROJECT_STAGE: {
    action: "timeline:update-stage",
    description: "Update project stages",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER],
  },
  DELETE_PROJECT_STAGE: {
    action: "timeline:delete-stage",
    description: "Delete project stages",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  UPDATE_PROGRESS_TRACKING: {
    action: "timeline:update-progress",
    description: "Update progress tracking",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER],
  },
  DELETE_PROGRESS_TRACKING: {
    action: "timeline:delete-progress",
    description: "Delete progress tracking",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  VIEW_TIMELINE: {
    action: "timeline:view",
    description: "View project timeline",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },

  // Quality control permissions
  CREATE_QUALITY_REPORT: {
    action: "quality:create-report",
    description: "Create quality reports",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.QA_QC_OFFICER,
      UserRole.SITE_ENGINEER,
    ],
  },
  UPDATE_QUALITY_REPORT: {
    action: "quality:update-report",
    description: "Update quality reports",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.QA_QC_OFFICER],
  },
  VIEW_QUALITY_REPORT: {
    action: "quality:view-report",
    description: "View quality reports",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  APPROVE_QUALITY: {
    action: "quality:approve",
    description: "Approve quality standards",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.QA_QC_OFFICER],
  },
  DELETE_QUALITY_REPORT: {
    action: "quality:delete-report",
    description: "Delete quality reports",
    roles: [UserRole.OWNER, UserRole.QA_QC_OFFICER],
  },

  // HSE (Health, Safety & Environment) permissions
  CREATE_HSE_REPORT: {
    action: "hse:create-report",
    description: "Create HSE incident/inspection reports",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.HSE_OFFICER,
      UserRole.SITE_ENGINEER,
    ],
  },
  UPDATE_HSE_REPORT: {
    action: "hse:update-report",
    description: "Update HSE reports",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.HSE_OFFICER],
  },
  VIEW_HSE_REPORT: {
    action: "hse:view-report",
    description: "View HSE reports",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  DELETE_HSE_REPORT: {
    action: "hse:delete-report",
    description: "Delete HSE reports",
    roles: [UserRole.OWNER, UserRole.HSE_OFFICER],
  },
  MANAGE_HSE_COMPLIANCE: {
    action: "hse:manage-compliance",
    description: "Manage HSE compliance and protocols",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.HSE_OFFICER],
  },
  CONDUCT_HSE_INSPECTION: {
    action: "hse:conduct-inspection",
    description: "Conduct HSE site inspections",
    roles: [UserRole.HSE_OFFICER, UserRole.PROJECT_MANAGER, UserRole.SITE_ENGINEER],
  },

  // Documentation permissions
  UPLOAD_DOCUMENT: {
    action: "document:upload",
    description: "Upload project documents",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  VIEW_DOCUMENT: {
    action: "document:view",
    description: "View project documents",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  UPDATE_DOCUMENT: {
    action: "document:update",
    description: "Update project documents",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  DELETE_DOCUMENT: {
    action: "document:delete",
    description: "Delete project documents",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  REVIEW_DOCUMENT: {
    action: "document:review",
    description: "Approve or reject project documents",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.QA_QC_OFFICER],
  },

  // Bidding/Tender Permissions
  CREATE_TENDER: {
    action: "bidding:create-tender",
    description: "Create a new tender",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.PROCUREMENT_OFFICER],
  },
  MANAGE_TENDERS: {
    action: "bidding:create-tender",
    description: "Create a new tender",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  UPDATE_TENDER: {
    action: "bidding:update-tender",
    description: "Update tender details",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER, UserRole.PROCUREMENT_OFFICER],
  },
  DELETE_TENDER: {
    action: "bidding:delete-tender",
    description: "Delete a tender",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },
  VIEW_TENDER: {
    action: "bidding:view-tender",
    description: "View tender details",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  SUBMIT_BID: {
    action: "bidding:submit-bid",
    description: "Submit a bid for a tender",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },
  VIEW_BID: {
    action: "bidding:view-bid",
    description: "View bid details",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  UPDATE_BID: {
    action: "bidding:update-bid",
    description: "Update a bid",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },
  DELETE_BID: {
    action: "bidding:delete-bid",
    description: "Delete a bid",
    roles: [UserRole.OWNER, UserRole.PROCUREMENT_OFFICER],
  },
  EVALUATE_BIDS: {
    action: "bidding:evaluate-bids",
    description: "Evaluate and score bids",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.PROCUREMENT_OFFICER,
    ],
  },
  AWARD_TENDER: {
    action: "bidding:award-tender",
    description: "Award a tender to a winning bidder",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },

  // User management permissions
  VIEW_USER: {
    action: "user:view",
    description: "View user information",
    roles: [
      UserRole.OWNER,
      UserRole.PROJECT_MANAGER,
      UserRole.SITE_ENGINEER,
      UserRole.PROCUREMENT_OFFICER,
      UserRole.FINANCE_OFFICER,
      UserRole.QA_QC_OFFICER,
      UserRole.HSE_OFFICER,
    ],
  },
  MANAGE_USERS: {
    action: "user:manage",
    description: "Add, remove, or update user roles",
    roles: [UserRole.OWNER, UserRole.PROJECT_MANAGER],
  },

};

// Helper function to get all permissions for a role
export const getPermissionsForRole = (role: UserRole): string[] => {
  return Object.values(Permissions)
      .filter((permission) => permission.roles.includes(role))
      .map((permission) => permission.action);
};

// Helper function to check if a role has a specific permission
export const hasPermission = (role: UserRole, action: string): boolean => {
  const permission = Object.values(Permissions).find(
      (p) => p.action === action
  );
  return permission ? permission.roles.includes(role) : false;
};

// Helper function to get permissions grouped by category
export const getPermissionsByCategory = (role: UserRole) => {
  const allPermissions = getPermissionsForRole(role);

  const categories: Record<string, string[]> = {};

  allPermissions.forEach((permission) => {
    const [category] = permission.split(":");
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(permission);
  });

  return categories;
};

// Role hierarchy helper - useful for checking if one role supersedes another
export const roleHierarchy: Record<UserRole, number> = {
  [UserRole.OWNER]: 7,
  [UserRole.PROJECT_MANAGER]: 6,
  [UserRole.FINANCE_OFFICER]: 5,
  [UserRole.PROCUREMENT_OFFICER]: 4,
  [UserRole.QA_QC_OFFICER]: 3,
  [UserRole.SITE_ENGINEER]: 3,
  [UserRole.HSE_OFFICER]: 3,
};

export const hasHigherOrEqualRole = (
    role1: UserRole,
    role2: UserRole
): boolean => {
  return roleHierarchy[role1] >= roleHierarchy[role2];
};