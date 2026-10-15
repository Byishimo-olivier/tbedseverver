import mongoose from 'mongoose';
import { Project } from '@/modules/projects/project.model';
import { Budget } from '@/modules/finance/models/budget.model';
import { Expense } from '@/modules/finance/models/expense.model';
// import { Invoice } from '@/modules/finance/models/invoice.model';
import { BoQ } from '@/modules/finance/models/boq.model';
import { InventoryItem } from '@/modules/finance/models/inventory.model';
import { GRN } from '@/modules/finance/models/grn.model';
// import { MaterialRequest } from '@/modules/procurement/materialRequest.model';
import { PurchaseOrder } from '@/modules/procurement/purchaseOrder.model';
// import { Tender } from '@/modules/bidding/models/tender.model';
import {
  ProjectStatus,
  ProjectType,
  ExpenseCategory,
  BoQCategory,
  UnitOfMeasurement,
  DocumentStatus, PaymentTerms, GRNStatus
} from '@/types/enums';
import {Upload} from "@/modules/file/upload.model";

export const seedTestProject = async (userId: string, overrides: Partial<any> = {}) => {
  const projectData = {
    name: 'Test Construction Project',
    projectCode: `PROJ-${Date.now()}`,
    projectDescription: 'A test project for unit testing purposes',
    status: ProjectStatus.PLANNING,
    type: ProjectType.CAPITAL,
    budget: 100000,
    createdBy: userId,
    updatedBy: userId,
    team: [{ user: userId, role: 'Owner' }],
    ...overrides,
  };

  const project = new Project(projectData);
  await project.save();
  return project;
};

export const seedTestBudget = async (projectId: string, userId: string, overrides: Partial<any> = {}) => {
  const budgetData = {
    projectId,
    fiscalYear: new Date().getFullYear(),
    materialsBudget: 30000,
    laborBudget: 40000,
    equipmentBudget: 15000,
    fuelBudget: 5000,
    overheadsBudget: 10000,
    createdBy: userId,
    updatedBy: userId,
    ...overrides,
  };

  const budget = new Budget(budgetData);
  await budget.save();
  return budget;
};

export const seedTestExpense = async (projectId: string, userId: string, overrides: Partial<any> = {}) => {
  const expenseData = {
    projectId,
    date: new Date(),
    category: ExpenseCategory.MATERIALS,
    amount: 5000,
    description: 'Test expense for materials',
    createdBy: userId,
    updatedBy: userId,
    ...overrides,
  };

  const expense = new Expense(expenseData);
  await expense.save();
  return expense;
};

export const seedTestBoQ = async (projectId: string, userId: string, overrides: Partial<any> = {}) => {
  const boqData = {
    projectId,
    sections: [
      {
        sectionName: BoQCategory.FOUNDATION,
        items: [
          {
            description: 'Concrete foundation work',
            unit: UnitOfMeasurement.CUBIC_METER,
            quantity: 100,
            rate: 150,
          },
        ],
      },
    ],
    createdBy: userId,
    updatedBy: userId,
    ...overrides,
  };

  const boq = new BoQ(boqData);
  await boq.save();
  return boq;
};

export const seedTestInventoryItem = async (projectId: string, userId: string, overrides: Partial<any> = {}) => {
  const inventoryData = {
    projectId,
    name: 'Test Material',
    materialCode: `MAT-${Date.now()}`,
    unit: UnitOfMeasurement.KILOGRAM,
    category: ExpenseCategory.MATERIALS,
    unitPrice: 50,
    currentStock: 100,
    minimumStock: 10,
    createdBy: userId,
    updatedBy: userId,
    ...overrides,
  };

  const item = new InventoryItem(inventoryData);
  await item.save();
  return item;
};

export const seedTestUpload = async (
  userId: string,
  overrides: Partial<any> = {}
) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const uploadData = {
    userId: userObjectId,
    fileName: `test-document-${Date.now()}.pdf`,
    filePath: `uploads/test-${Date.now()}.pdf`,
    fileType: 'application/pdf',
    fileSize: 1024,
    description: 'Test document description',
    status: DocumentStatus.PENDING,
    ...overrides,
  };

  const upload = new Upload(uploadData);
  await upload.save();
  return upload;
};

export const seedTestPurchaseOrder = async (
  projectId: string,
  userId: string,
  overrides: Partial<any> = {}
) => {
  const projectObjectId = new mongoose.Types.ObjectId(projectId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const poData = {
    projectId: projectObjectId,
    poNumber: `PO-${Date.now()}`,
    supplierDetails: 'Test Supplier Company - Contact: 123456789',
    orderDate: new Date(),
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    materialList: [
      {
        materialName: 'Test Material',
        quantity: 10,
        unit: UnitOfMeasurement.PIECE,
        category: ExpenseCategory.MATERIALS,
        unitPrice: 100,
      },
    ],
    totalCost: 1000,
    paymentTerms: PaymentTerms.NET_30,
    createdBy: userObjectId,
    updatedBy: userObjectId,
    ...overrides,
  };

  const po = new PurchaseOrder(poData);
  await po.save();
  return po;
};

export const seedTestGRN = async (
  projectId: string,
  purchaseOrderId: string,
  userId: string,
  overrides: Partial<any> = {}
) => {
  const projectObjectId = new mongoose.Types.ObjectId(projectId);
  const poObjectId = new mongoose.Types.ObjectId(purchaseOrderId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  const grnData = {
    projectId: projectObjectId,
    purchaseOrderId: poObjectId,
    grnNumber: `GRN-${Date.now()}`,
    receivedDate: new Date(),
    items: [
      {
        materialId: new mongoose.Types.ObjectId(),
        quantity: 10,
        receivedQuantity: 10,
        pendingQuantity: 0,
        remarks: 'All items received',
      },
    ],
    status: GRNStatus.COMPLETE,
    documents: [],
    createdBy: userObjectId,
    updatedBy: userObjectId,
    ...overrides,
  };

  const grn = new GRN(grnData);
  await grn.save();
  return grn;
};

// Helper to seed a complete document workflow for testing
export const seedTestDocumentWithUpload = async (
  projectId: string,
  userId: string
) => {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const upload = await seedTestUpload(userId, {
    description: 'Project test document',
  });

  // Add document reference to project
  project.documents.push({
    filePath: upload.filePath,
    description: upload.description,
  });
  await project.save();

  return { project, upload };
};

export const clearCollection = async (collectionName: string) => {
  const collection = mongoose.connection.collections[collectionName];
  if (collection) {
    await collection.deleteMany({});
  }
};

export const clearAllCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};