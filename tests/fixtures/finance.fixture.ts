import {
  ExpenseCategory,
  BudgetApprovalStatus,
  InvoiceType,
  InvoiceStatus,
  PaymentTerms,
  UnitOfMeasurement,
  BoQCategory,
  ReportingPeriod,
} from '@/types/enums';

// Budget fixtures
export const validBudgetData = {
  fiscalYear: new Date().getFullYear(),
  materialsBudget: 150000,
  laborBudget: 200000,
  equipmentBudget: 75000,
  fuelBudget: 25000,
  overheadsBudget: 50000,
  notes: 'Annual project budget allocation',
};

export const budgetApprovalStatuses = {
  pending: BudgetApprovalStatus.PENDING,
  approved: BudgetApprovalStatus.APPROVED,
  rejected: BudgetApprovalStatus.REJECTED,
};

// Expense fixtures
export const validExpenseData = {
  date: new Date().toISOString(),
  category: ExpenseCategory.MATERIALS,
  amount: 15000,
  description: 'Purchase of construction materials',
};

export const expenseCategories = {
  materials: ExpenseCategory.MATERIALS,
  labor: ExpenseCategory.LABOR,
  equipment: ExpenseCategory.EQUIPMENT,
  fuel: ExpenseCategory.FUEL,
  overheads: ExpenseCategory.OVERHEADS,
};

export const sampleExpenses = {
  materials: {
    date: new Date().toISOString(),
    category: ExpenseCategory.MATERIALS,
    amount: 25000,
    description: 'Cement and steel purchase',
  },
  labor: {
    date: new Date().toISOString(),
    category: ExpenseCategory.LABOR,
    amount: 50000,
    description: 'Monthly labor wages',
  },
  equipment: {
    date: new Date().toISOString(),
    category: ExpenseCategory.EQUIPMENT,
    amount: 15000,
    description: 'Crane rental',
  },
};

// Invoice fixtures
export const validInvoiceData = {
  type: InvoiceType.SERVICE_BASED,
  workPeriod: {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  },
  paymentTerms: PaymentTerms.NET_30,
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  paymentDetails: {
    bankName: 'Test Bank',
    accountNumber: '1234567890',
    accountName: 'Test Company',
  },
};

export const invoiceTypes = {
  boq_based: InvoiceType.BOQ_BASED,
  service_based: InvoiceType.SERVICE_BASED,
};

export const invoiceStatuses = {
  pending: InvoiceStatus.PENDING,
  approved: InvoiceStatus.APPROVED,
  paid: InvoiceStatus.PAID,
  voided: InvoiceStatus.VOID,
};

// BoQ fixtures
export const validBoQSection = {
  sectionName: BoQCategory.FOUNDATION,
  items: [
    {
      description: 'Excavation for foundation',
      unit: UnitOfMeasurement.CUBIC_METER,
      quantity: 500,
      rate: 25,
    },
    {
      description: 'Concrete for foundation',
      unit: UnitOfMeasurement.CUBIC_METER,
      quantity: 200,
      rate: 150,
    },
  ],
};

export const boqCategories = {
  excavation: BoQCategory.EXCAVATION,
  foundation: BoQCategory.FOUNDATION,
  walling: BoQCategory.WALLING,
  plastering: BoQCategory.PLASTERING,
  painting: BoQCategory.PAINTING,
  mep: BoQCategory.MEP,
  landscape: BoQCategory.LANDSCAPE,
};

export const sampleBoQSections = [
  {
    sectionName: BoQCategory.EXCAVATION,
    items: [
      { description: 'Site clearing', unit: UnitOfMeasurement.SQUARE_METER, quantity: 1000, rate: 5 },
      { description: 'Earth excavation', unit: UnitOfMeasurement.CUBIC_METER, quantity: 500, rate: 20 },
    ],
  },
  {
    sectionName: BoQCategory.FOUNDATION,
    items: [
      { description: 'Foundation concrete', unit: UnitOfMeasurement.CUBIC_METER, quantity: 150, rate: 180 },
      { description: 'Steel reinforcement', unit: UnitOfMeasurement.KILOGRAM, quantity: 5000, rate: 2.5 },
    ],
  },
  {
    sectionName: BoQCategory.WALLING,
    items: [
      { description: 'Brick masonry', unit: UnitOfMeasurement.SQUARE_METER, quantity: 2000, rate: 45 },
    ],
  },
];

// Material Usage fixtures
export const validMaterialUsageData = {
  date: new Date().toISOString(),
  reportingPeriod: ReportingPeriod.WEEKLY,
  items: [
    {
      quantity: 50,
      location: 'Block A - Foundation',
      purpose: 'Foundation concrete work',
    },
  ],
};

export const reportingPeriods = {
  daily: ReportingPeriod.DAILY,
  weekly: ReportingPeriod.WEEKLY,
  monthly: ReportingPeriod.MONTHLY,
};