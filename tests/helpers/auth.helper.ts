import jwt, {SignOptions} from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '@/modules/users/user.model';
import { UserRole, CompanyUserRole } from '@/types/enums';
import { Company } from '@/modules/users/company/company.model';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

export const createTestUser = async (overrides: Partial<any> = {}) => {
  const timestamp = Date.now();
  const userData = {
    email: `test-${timestamp}@example.com`,
    password: 'Password123!',
    fullName: 'Test User',
    role: UserRole.PROJECT_MANAGER,
    isEmailVerified: true,
    ...overrides,
  };

  const user = new User(userData);
  await user.save();
  return user;
};

export const createTestAdmin = async (overrides: Partial<any> = {}) => {
  return createTestUser({
    fullName: 'Admin User',
    role: UserRole.OWNER,
    ...overrides,
  });
};

export const createTestCompany = async (ownerId: string, overrides: Partial<any> = {}) => {
  const timestamp = Date.now();
  const companyData = {
    name: `Test Company ${timestamp}`,
    registrationNumber: `REG-${timestamp}`,
    type: 'Construction',
    address: '123 Test Street',
    email: `company-${timestamp}@example.com`,
    contactNumber: '+1234567890',
    members: [
      {
        userId: ownerId,
        role: CompanyUserRole.ADMIN,
        joinedAt: new Date(),
      },
    ],
    ...overrides,
  };

  const company = new Company(companyData);
  await company.save();
  return company;
};

export const generateTestToken = (
    userId: string,
    role: string = UserRole.PROJECT_MANAGER,
    expiresIn: string = '1h'
) => {
  const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET || 'test-jwt-secret-key',
      options
  );
};

export const generateExpiredToken = (userId: string, role: string = UserRole.PROJECT_MANAGER) => {
  const options: SignOptions = { expiresIn: '-1h' as jwt.SignOptions['expiresIn'] };
  return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET || 'test-jwt-secret-key',
      options
  );
};