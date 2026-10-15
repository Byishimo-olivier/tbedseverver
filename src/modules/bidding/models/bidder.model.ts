import mongoose, { Schema, Document } from "mongoose";
import { BidderStatus, CompanyType } from "@/types/enums";

export interface IBidderExperience {
  projectName: string;
  clientName: string;
  projectValue: number;
  completionDate: Date;
  description: string;
  role: string; // e.g., "Main Contractor", "Subcontractor", "Consultant"
}

export interface IBidderQualification {
  certificationType: string;
  certificateNumber: string;
  issuingAuthority: string;
  issueDate: Date;
  expiryDate?: Date;
  filePath: string;
}

export interface IBidder extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User account
  companyId: mongoose.Types.ObjectId; // Reference to Company account
  companyName: string;
  companyType: CompanyType;
  registrationNumber: string;
  taxId: string;
  
  // Contact Information
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Financial Information
  annualTurnover: number;
  bankName: string;
  bankAccountNumber: string;
  
  // Experience and Qualifications
  experience: IBidderExperience[];
  qualifications: IBidderQualification[];
  
  // Profile Status
  status: BidderStatus;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  verifiedBy?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  
  // Profile Documents
  profileDocuments: {
    filePath: string;
    documentType: "COMPANY_PROFILE" | "FINANCIAL_STATEMENT" | "REGISTRATION_CERT" | "TAX_CERT" | "OTHER";
    description: string;
    uploadedAt: Date;
  }[];
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const bidderExperienceSchema = new Schema({
  projectName: { type: String, required: true },
  clientName: { type: String, required: true },
  projectValue: { type: Number, required: true, min: 0 },
  completionDate: { type: Date, required: true },
  description: { type: String, required: true },
  role: { type: String, required: true }
});

const bidderQualificationSchema = new Schema({
  certificationType: { type: String, required: true },
  certificateNumber: { type: String, required: true },
  issuingAuthority: { type: String, required: true },
  issueDate: { type: Date, required: true },
  expiryDate: { type: Date },
  filePath: { type: String, required: true }
});

const addressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true }
});

const profileDocumentSchema = new Schema({
  filePath: { type: String, required: true },
  documentType: { 
    type: String, 
    enum: ["COMPANY_PROFILE", "FINANCIAL_STATEMENT", "REGISTRATION_CERT", "TAX_CERT", "OTHER"],
    required: true 
  },
  description: { type: String, required: false },
  uploadedAt: { type: Date, default: Date.now }
});

const bidderSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: false },
  companyName: { type: String, required: true },
  companyType: { type: String, enum: Object.values(CompanyType), required: true },
  registrationNumber: { type: String, required: true, unique: true },
  taxId: { type: String, required: true },
  
  // Contact Information
  contactPerson: { type: String, required: true },
  contactEmail: { type: String, required: true },
  contactPhone: { type: String, required: true },
  address: { type: addressSchema, required: true },
  
  // Financial Information
  annualTurnover: { type: Number, required: true, min: 0 },
  bankName: { type: String, required: true },
  bankAccountNumber: { type: String, required: true },
  
  // Experience and Qualifications
  experience: [bidderExperienceSchema],
  qualifications: [bidderQualificationSchema],
  
  // Profile Status
  status: { type: String, enum: Object.values(BidderStatus), default: BidderStatus.ACTIVE },
  verificationStatus: { 
    type: String, 
    enum: ["PENDING", "VERIFIED", "REJECTED"], 
    default: "PENDING" 
  },
  verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  verifiedAt: { type: Date },
  
  // Profile Documents
  profileDocuments: [profileDocumentSchema],
  
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, {
  timestamps: true
});

export const Bidder = mongoose.model<IBidder>("Bidder", bidderSchema);