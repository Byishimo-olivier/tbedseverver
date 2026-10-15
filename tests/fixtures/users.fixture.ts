import { UserRole, CompanyUserRole } from '@/types/enums';

export const validUserData = {
  email: 'testuser@example.com',
  password: 'Password123!',
  fullName: 'Test User',
};

export const validLoginCredentials = {
  email: 'testuser@example.com',
  password: 'Password123!',
};

export const invalidLoginCredentials = {
  email: 'testuser@example.com',
  password: 'WrongPassword123!',
};

export const userRoles = {
  owner: UserRole.OWNER,
  projectManager: UserRole.PROJECT_MANAGER,
  siteEngineer: UserRole.SITE_ENGINEER,
  procurementOfficer: UserRole.PROCUREMENT_OFFICER,
  financeOfficer: UserRole.FINANCE_OFFICER,
  qaQcOfficer: UserRole.QA_QC_OFFICER,
  hseOfficer: UserRole.HSE_OFFICER,
};

export const companyUserRoles = {
  admin: CompanyUserRole.ADMIN,
  managingDirector: CompanyUserRole.MANAGING_DIRECTOR,
  manager: CompanyUserRole.MANAGER,
  projectManager: CompanyUserRole.PROJECT_MANAGER,
  financeManager: CompanyUserRole.FINANCE_MANAGER,
};

export const sampleUsers = {
  projectManager: {
    email: 'pm@example.com',
    password: 'Password123!',
    fullName: 'Project Manager',
    role: UserRole.PROJECT_MANAGER,
  },
  siteEngineer: {
    email: 'engineer@example.com',
    password: 'Password123!',
    fullName: 'Site Engineer',
    role: UserRole.SITE_ENGINEER,
  },
  financeOfficer: {
    email: 'finance@example.com',
    password: 'Password123!',
    fullName: 'Finance Officer',
    role: UserRole.FINANCE_OFFICER,
  },
  procurementOfficer: {
    email: 'procurement@example.com',
    password: 'Password123!',
    fullName: 'Procurement Officer',
    role: UserRole.PROCUREMENT_OFFICER,
  },
};