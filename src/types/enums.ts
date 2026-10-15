/**
 * Application-wide enums for consistent value usage
 */

// Project related enums
export enum ProjectType {
  CAPITAL = "Capital",
  MAINTENANCE = "Maintenance",
}

export enum CompanyType {
  CONTRACTING = "Contracting",
  CONSULTING = "Consulting",
  SUPPLYING = "Supplying",
  MANUFACTURING = "Manufacturing",
  SERVICE = "Service",
  OTHER = "Other",
}

export enum ProjectStatus {
  PLANNING = "Planning",
  IN_PROGRESS = "In Progress",
  ON_HOLD = "On Hold",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
}

// Finance related enums
export enum ExpenseCategory {
  MATERIALS = "materials",
  LABOR = "labor",
  EQUIPMENT = "equipment",
  FUEL = "fuel",
  OVERHEADS = "overheads",
}

export enum InvoiceStatus {
  PENDING = "pending",
  APPROVED = "approved",
  PAID = "paid",
  VOID = "void",
}

export enum InvoiceType {
  BOQ_BASED = "BoQ Based",
  SERVICE_BASED = "Service Based",
}

export enum BudgetApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum ExpenseApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum ReportingPeriod {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export enum DocumentStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum GRNStatus {
  COMPLETE = "complete",
  PARTIAL = "partial",
}

// Units of measurement
export enum UnitOfMeasurement {
  METER = "m",
  SQUARE_METER = "m²",
  CUBIC_METER = "m³",
  KILOGRAM = "kg",
  LITER = "l",
  PIECE = "pc",
  UNIT = "unit",
  TON = "ton",
  HOUR = "hour",
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  BAG = "bag",
  BUNDLE = "bundle",
  SET = "set",
  BOX = "box",
}

export enum BoQCategory {
  EXCAVATION = "Excavation",
  FOUNDATION = "Foundation",
  WALLING = "Walling",
  PLASTERING = "Plastering",
  PAINTING = "Painting",
  IT = "IT",
  MEP = "MEP",
  LANDSCAPE = "Landscape",
  GENERAL = "General",
  OTHER = "Other",
}

// Payment related enums
export enum PaymentTerms {
  IMMEDIATE = "Immediate",
  NET_15 = "Net 15",
  NET_30 = "Net 30",
  NET_60 = "Net 60",
  NET_90 = "Net 90",
  UPON_COMPLETION = "Upon completion",
  MILESTONE_BASED = "Milestone based",
}

// Priority levels
export enum PriorityLevel {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

// Project stages
export enum ProjectStage {
  PRELIMINARIES = "Preliminaries",
  DESIGN = "Design",
  ENGINEERING = "Engineering",
  PROCUREMENT = "Procurement",
  MOBILIZATION = "Mobilization",
  CONSTRUCTION = "Construction",
  TESTING = "Testing and Commissioning",
  HANDOVER = "Handover",
}

//Project stage status
export enum ProjectStageStatus {
  PENDING = "Pending",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
}

// Departments
export enum Department {
  ENGINEERING = "Engineering",
  PROCUREMENT = "Procurement",
  FINANCE = "Finance",
  OPERATIONS = "Operations",
  MANAGEMENT = "Management",
  QUALITY_ASSURANCE = "Quality Assurance",
  HEALTH_SAFETY = "Health and Safety",
}

// User roles
export enum UserRole {
  OWNER = "Owner",
  PROJECT_MANAGER = "ProjectManager",
  SITE_ENGINEER = "SiteEngineer",
  PROCUREMENT_OFFICER = "ProcurementOfficer",
  FINANCE_OFFICER = "FinanceOfficer",
  QA_QC_OFFICER = "QA_QCOfficer",
  HSE_OFFICER = "HSEOOfficer",
}

export enum MembershipTier {
  BASIC = "basic",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

// rate
export enum RateType {
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

// Company
export enum CompanyUserRole {
  ADMIN = "CompanyAdmin",
  MANAGER = "CompanyManager",
  MEMBER = "CompanyMember",
  MANAGING_DIRECTOR = "ManagingDirector",
  PROJECT_MANAGER = "ProjectManager",
  SITE_ENGINEER = "SiteEngineer",
  PROCUREMENT_MANAGER = "ProcurementManager",
  FINANCE_MANAGER = "FinanceManager",
}

export enum TenderType {
  CONSTRUCTION = "Construction",
  CONSULTANCY = "Consultancy",
  SUPPLY = "Supply",
  MAINTENANCE = "Maintenance",
  DESIGN_BUILD = "Design & Build"
}

export enum TenderStatus {
  DRAFT = "Draft",
  PUBLISHED = "Published",
  CLOSED = "Closed",
  AWARDED = "Awarded",
  CANCELLED = "Cancelled"
}

export enum BidOpeningStatus {
  PENDING = "Pending",
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed"
}

export enum TenderDocumentType {
  BOQ = "BOQ",
  TECHNICAL_SPEC = "Technical Specification",
  DRAWINGS = "Drawings",
  TERMS = "Terms",
  FORMS = "Forms",
  ADDENDUM = "Addendum",
  OTHER = "Other",
}

export enum BidderStatus {
  ACTIVE = "Active",
  SUSPENDED = "Suspended",
  BLACKLISTED = "Blacklisted"
}

export enum BidStatus {
  DRAFT = "Draft",
  SUBMITTED = "Submitted",
  UNDER_EVALUATION = "Under Evaluation",
  EVALUATED = "Evaluated",
  AWARDED = "Awarded",
  REJECTED = "Rejected",
  WITHDRAWN = "Withdrawn"
}

export enum BidEvaluationStatus {
  PENDING = "Pending",
  TECHNICAL_REVIEW = "Technical Review",
  FINANCIAL_REVIEW = "Financial Review",
  COMPLETED = "Completed"
}

export enum ClarificationStatus {
  PENDING = "Pending",
  RESPONDED = "Responded",
  CLOSED = "Closed"
}
