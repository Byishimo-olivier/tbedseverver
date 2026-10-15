import { CompanyUserRole } from "@/types/enums";

export interface CompanyPermission {
  action: string;
  description: string;
  roles: CompanyUserRole[];
}

export const CompanyPermissions = {
  // Company Profile Management
  COMPANY_CREATE: {
    action: "company:create",
    description: "Create a new company",
    roles: [CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR],
  },
  COMPANY_VIEW: {
    action: "company:view",
    description: "View company details",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.MEMBER,
    ],
  },
  COMPANY_UPDATE: {
    action: "company:update",
    description: "Update company details",
    roles: [CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR],
  },
  COMPANY_DELETE: {
    action: "company:delete",
    description: "Delete company",
    roles: [CompanyUserRole.ADMIN],
  },

  // Member Management
  COMPANY_INVITE_MEMBER: {
    action: "company:invite-member",
    description: "Invite members to the company",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
    ],
  },
  COMPANY_MANAGE_MEMBERS: {
    action: "company:manage-members",
    description: "Remove members or change their roles in the company",
    roles: [CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR],
  },
  COMPANY_VIEW_MEMBERS: {
    action: "company:view-members",
    description: "View company members",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },

  // Project Association
  COMPANY_ASSOCIATE_PROJECT: {
    action: "company:associate-project",
    description: "Create or associate projects with the company",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_VIEW_PROJECTS: {
    action: "company:view-projects",
    description: "View projects associated with the company",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.MEMBER,
    ],
  },
  COMPANY_DISSOCIATE_PROJECT: {
    action: "company:dissociate-project",
    description: "Remove project association from company",
    roles: [CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR],
  },

  // Project Creation & Management (Company Level)
  COMPANY_CREATE_PROJECT: {
    action: "company:create-project",
    description: "Create new projects under the company",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
    ],
  },
  COMPANY_MANAGE_PROJECT_TEAM: {
    action: "company:manage-project-team",
    description: "Manage project team members",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },

  // Budget & Finance (Company Level)
  COMPANY_VIEW_BUDGET: {
    action: "company:view-budget",
    description: "View company and project budgets",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_CREATE_BUDGET: {
    action: "company:create-budget",
    description: "Create budgets for projects",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.FINANCE_MANAGER,
    ],
  },
  COMPANY_UPDATE_BUDGET: {
    action: "company:update-budget",
    description: "Update project budgets",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.FINANCE_MANAGER,
    ],
  },
  COMPANY_APPROVE_BUDGET: {
    action: "company:approve-budget",
    description: "Approve budget changes",
    roles: [CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR],
  },

  // Expenses (Company Level)
  COMPANY_VIEW_EXPENSE: {
    action: "company:view-expense",
    description: "View company expenses",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_CREATE_EXPENSE: {
    action: "company:create-expense",
    description: "Create expense records",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_APPROVE_EXPENSE: {
    action: "company:approve-expense",
    description: "Approve expenses",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.FINANCE_MANAGER,
    ],
  },

  // Invoices (Company Level)
  COMPANY_VIEW_INVOICE: {
    action: "company:view-invoice",
    description: "View invoices",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_CREATE_INVOICE: {
    action: "company:create-invoice",
    description: "Create invoices",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.FINANCE_MANAGER,
    ],
  },
  COMPANY_APPROVE_INVOICE: {
    action: "company:approve-invoice",
    description: "Approve invoices",
    roles: [CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR],
  },

  // Procurement (Company Level)
  COMPANY_VIEW_MATERIAL_REQUEST: {
    action: "company:view-material-request",
    description: "View material requests",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
    ],
  },
  COMPANY_CREATE_MATERIAL_REQUEST: {
    action: "company:create-material-request",
    description: "Create material requests",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
    ],
  },
  COMPANY_APPROVE_MATERIAL_REQUEST: {
    action: "company:approve-material-request",
    description: "Approve material requests",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.PROCUREMENT_MANAGER,
    ],
  },

  // Purchase Orders (Company Level)
  COMPANY_VIEW_PURCHASE_ORDER: {
    action: "company:view-purchase-order",
    description: "View purchase orders",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_CREATE_PURCHASE_ORDER: {
    action: "company:create-purchase-order",
    description: "Create purchase orders",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.PROCUREMENT_MANAGER,
    ],
  },
  COMPANY_APPROVE_PURCHASE_ORDER: {
    action: "company:approve-purchase-order",
    description: "Approve purchase orders",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.PROCUREMENT_MANAGER,
    ],
  },

  // BOQ (Company Level)
  COMPANY_VIEW_BOQ: {
    action: "company:view-boq",
    description: "View BOQ items",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.MEMBER,
    ],
  },
  COMPANY_CREATE_BOQ: {
    action: "company:create-boq",
    description: "Create BOQ items",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_UPDATE_BOQ_PROGRESS: {
    action: "company:update-boq-progress",
    description: "Update BOQ progress",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
    ],
  },

  // Inventory (Company Level)
  COMPANY_VIEW_INVENTORY: {
    action: "company:view-inventory",
    description: "View inventory",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.MEMBER,
    ],
  },
  COMPANY_MANAGE_INVENTORY: {
    action: "company:manage-inventory",
    description: "Manage inventory items",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
    ],
  },

  // Timeline & Progress (Company Level)
  COMPANY_VIEW_TIMELINE: {
    action: "company:view-timeline",
    description: "View project timelines",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
    ],
  },
  COMPANY_CREATE_PROJECT_STAGE: {
    action: "company:create-project-stage",
    description: "Create project stages",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_UPDATE_PROGRESS_TRACKING: {
    action: "company:update-progress-tracking",
    description: "Update progress tracking",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.SITE_ENGINEER,
    ],
  },

  // Tendering & Bidding (Company Level)
  COMPANY_CREATE_TENDER: {
    action: "company:create-tender",
    description: "Create tenders",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROCUREMENT_MANAGER,
    ],
  },
  COMPANY_MANAGE_TENDER: {
    action: "company:manage-tender",
    description: "Manage tender details",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROCUREMENT_MANAGER,
    ],
  },
  COMPANY_VIEW_TENDER: {
    action: "company:view-tender",
    description: "View tender details",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROCUREMENT_MANAGER,
      CompanyUserRole.FINANCE_MANAGER,
    ],
  },
  COMPANY_EVALUATE_BIDS: {
    action: "company:evaluate-bids",
    description: "Evaluate and score bids",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.PROCUREMENT_MANAGER,
    ],
  },
  COMPANY_AWARD_TENDER: {
    action: "company:award-tender",
    description: "Award tenders",
    roles: [CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR],
  },

  // Reports (Company Level)
  COMPANY_VIEW_REPORTS: {
    action: "company:view-reports",
    description: "View company and project reports",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.FINANCE_MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_GENERATE_REPORTS: {
    action: "company:generate-reports",
    description: "Generate custom reports",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.FINANCE_MANAGER,
    ],
  },

  // Documents (Company Level)
  COMPANY_VIEW_DOCUMENTS: {
    action: "company:view-documents",
    description: "View company documents",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
      CompanyUserRole.MEMBER,
    ],
  },
  COMPANY_UPLOAD_DOCUMENTS: {
    action: "company:upload-documents",
    description: "Upload company documents",
    roles: [
      CompanyUserRole.ADMIN,
      CompanyUserRole.MANAGING_DIRECTOR,
      CompanyUserRole.MANAGER,
      CompanyUserRole.PROJECT_MANAGER,
    ],
  },
  COMPANY_MANAGE_DOCUMENTS: {
    action: "company:manage-documents",
    description: "Manage company documents",
    roles: [CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR],
  },
};

// Helper function to get all permissions for a company role
export const getCompanyPermissionsForRole = (
    role: CompanyUserRole
): string[] => {
  return Object.values(CompanyPermissions)
      .filter((permission) => permission.roles.includes(role))
      .map((permission) => permission.action);
};

// Helper function to check if a company role has a specific permission
export const hasCompanyPermission = (
    role: CompanyUserRole,
    action: string
): boolean => {
  const permission = Object.values(CompanyPermissions).find(
      (p) => p.action === action
  );
  return permission ? permission.roles.includes(role) : false;
};

// Helper function to get permissions grouped by category
export const getCompanyPermissionsByCategory = (role: CompanyUserRole) => {
  const allPermissions = getCompanyPermissionsForRole(role);

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

// Company role hierarchy helper
export const companyRoleHierarchy: Record<CompanyUserRole, number> = {
  [CompanyUserRole.ADMIN]: 8,
  [CompanyUserRole.MANAGING_DIRECTOR]: 7,
  [CompanyUserRole.MANAGER]: 6,
  [CompanyUserRole.PROJECT_MANAGER]: 5,
  [CompanyUserRole.FINANCE_MANAGER]: 4,
  [CompanyUserRole.PROCUREMENT_MANAGER]: 4,
  [CompanyUserRole.SITE_ENGINEER]: 3,
  [CompanyUserRole.MEMBER]: 1,
};

export const hasHigherOrEqualCompanyRole = (
    role1: CompanyUserRole,
    role2: CompanyUserRole
): boolean => {
  return companyRoleHierarchy[role1] >= companyRoleHierarchy[role2];
};