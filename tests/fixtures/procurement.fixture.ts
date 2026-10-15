import {
  Department,
  ExpenseCategory,
  PriorityLevel,
  UnitOfMeasurement,
  PaymentTerms,
} from '@/types/enums';

// Material Request fixtures
export const validMaterialRequestData = {
  requesterName: 'John Engineer',
  department: Department.ENGINEERING,
  purpose: 'Required for foundation work in Block A',
  priorityLevel: PriorityLevel.HIGH,
  materialDetails: [
    {
      materialName: 'Portland Cement',
      quantity: 100,
      unit: UnitOfMeasurement.BAG,
      requiredByDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      specifications: 'Type I Portland Cement, 50kg bags',
      estimatedCost: 1500,
      category: ExpenseCategory.MATERIALS,
    },
    {
      materialName: 'Steel Reinforcement Bars',
      quantity: 500,
      unit: UnitOfMeasurement.KILOGRAM,
      requiredByDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      specifications: '12mm diameter, Grade 60',
      estimatedCost: 2500,
      category: ExpenseCategory.MATERIALS,
    },
  ],
};

export const departments = {
  engineering: Department.ENGINEERING,
  finance: Department.FINANCE,
  management: Department.MANAGEMENT,
  procurement: Department.PROCUREMENT,
  operations: Department.OPERATIONS,
};

export const priorityLevels = {
  low: PriorityLevel.LOW,
  medium: PriorityLevel.MEDIUM,
  high: PriorityLevel.HIGH,
};

// Purchase Order fixtures
export const validPurchaseOrderData = {
  poNumber: `PO-${Date.now()}`,
  supplierDetails: {
    name: 'ABC Supplies Ltd',
    contact: '+1234567890',
    email: 'sales@abcsupplies.com',
    address: '123 Industrial Zone, City',
  },
  deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  materialList: [
    {
      materialName: 'Portland Cement',
      quantity: 100,
      unit: UnitOfMeasurement.BAG,
      category: ExpenseCategory.MATERIALS,
      unitPrice: 15,
    },
  ],
  totalCost: 1500,
  paymentTerms: PaymentTerms.NET_30,
  specialInstructions: 'Deliver to main gate, notify site manager on arrival',
};

export const paymentTerms = {
  immediate: PaymentTerms.IMMEDIATE,
  net15: PaymentTerms.NET_15,
  net30: PaymentTerms.NET_30,
  net60: PaymentTerms.NET_60,
  net90: PaymentTerms.NET_90,
  uponCompletion: PaymentTerms.UPON_COMPLETION,
  milestoneBased: PaymentTerms.MILESTONE_BASED,
};

// GRN fixtures
export const validGRNData = {
  receivedDate: new Date().toISOString(),
  receivedBy: 'John Receiver',
  items: [
    {
      materialName: 'Portland Cement',
      quantity: 100,
      receivedQuantity: 100,
      unit: UnitOfMeasurement.BAG,
      remarks: 'All bags in good condition',
    },
  ],
  remarks: 'Full delivery received, no damages',
};

export const sampleMaterialRequests = {
  highPriority: {
    ...validMaterialRequestData,
    priorityLevel: PriorityLevel.HIGH,
    purpose: 'Urgent requirement for delayed foundation work',
  },
  lowPriority: {
    ...validMaterialRequestData,
    priorityLevel: PriorityLevel.LOW,
    purpose: 'Stock replenishment for next month',
  },
};