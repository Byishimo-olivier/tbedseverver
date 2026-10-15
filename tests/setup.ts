import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import cron from "node-cron";

// Load test environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Set defaults for required env vars
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
}
process.env.NODE_ENV = 'test';

// Mock the notification service to prevent real emails/SMS during tests
jest.mock('@/modules/notifications/notifcation.service', () => ({
  notificationService: {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendTemplateEmail: jest.fn().mockResolvedValue(undefined),
    sendSMS: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    send2FACode: jest.fn().mockResolvedValue(undefined),
    sendProjectStageAlert: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Cloudinary to prevent real file operations during tests
jest.mock('@/modules/file/upload.service', () => ({
  uploadService: {
    saveFileDetails: jest.fn().mockResolvedValue({
      _id: new (require('mongoose').Types.ObjectId)(),
      filePath: 'http://localhost:3000/uploads/mock-file.pdf',
      fileName: 'mock-file.pdf',
      fileType: 'application/pdf',
      fileSize: 1234,
    }),
    deleteFileByPath: jest.fn().mockResolvedValue(undefined),
  },
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Stop all scheduled cron tasks
  const tasks = cron.getTasks();
  tasks.forEach((task) => task.stop());
  
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  
  // Clear all mocks before each test
  jest.clearAllMocks();
});