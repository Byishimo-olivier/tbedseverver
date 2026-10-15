import mongoose, { Schema, Document } from "mongoose";
import { TenderStatus, TenderType, BidOpeningStatus, TenderDocumentType } from "@/types/enums";

export interface ITenderDocument {
  filePath: string;
  description: string;
  documentType: TenderDocumentType;
  uploadedAt: Date;
}

export interface ITenderEligibilityCriteria {
  minimumExperience: number; // years
  minimumTurnover: number; // monetary value
  requiredLicenses: string[];
  requiredCertifications: string[];
  geographicalRestrictions?: string[];
}

export interface ITender extends Document {
  projectId: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  tenderNumber: string;
  title: string;
  description: string;
  type: TenderType;
  status: TenderStatus;
  
  // Key Dates
  publicationDate: Date;
  preBidMeetingDate?: Date;
  clarificationDeadline: Date;
  submissionDeadline: Date;
  
  // Eligibility and Requirements
  eligibilityCriteria: ITenderEligibilityCriteria;
  estimatedBudget?: number; // Internal use only
  
  // Documents
  documents: ITenderDocument[];
  boqId?: mongoose.Types.ObjectId; // Reference to the project's BoQ
  
  // Management
  tenderManager: mongoose.Types.ObjectId; // User responsible
  evaluationCommittee: mongoose.Types.ObjectId[]; // Users in evaluation committee
  
  // Bid Opening
  bidOpeningStatus: BidOpeningStatus;
  bidOpeningOfficer?: mongoose.Types.ObjectId;
  bidOpeningDate?: Date;
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const tenderDocumentSchema = new Schema({
  filePath: { type: String, required: true },
  description: { type: String, required: false },
  documentType: { 
    type: String, 
    enum: Object.values(TenderDocumentType),
    required: true 
  },
  uploadedAt: { type: Date, default: Date.now }
});

const eligibilityCriteriaSchema = new Schema({
  minimumExperience: { type: Number, required: true, min: 0 },
  minimumTurnover: { type: Number, required: true, min: 0 },
  requiredLicenses: [{ type: String }],
  requiredCertifications: [{ type: String }],
  geographicalRestrictions: [{ type: String }]
});

const tenderSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: false , index: true },
  tenderNumber: { type: String, required: false, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: Object.values(TenderType), required: true },
  status: { type: String, enum: Object.values(TenderStatus), default: TenderStatus.DRAFT },
  
  // Key Dates
  publicationDate: { type: Date },
  preBidMeetingDate: { type: Date },
  clarificationDeadline: { type: Date, required: true },
  submissionDeadline: { type: Date, required: true },
  bidOpeningDate: { type: Date, required: true },
  
  // Eligibility and Requirements
  eligibilityCriteria: { type: eligibilityCriteriaSchema, required: true },
  estimatedBudget: { type: Number, min: 0 },
  
  // Documents
  documents: [tenderDocumentSchema],
  boqId: { type: Schema.Types.ObjectId, ref: "BoQ" },
  
  // Management
  tenderManager: { type: Schema.Types.ObjectId, ref: "User", required: true },
  evaluationCommittee: [{ type: Schema.Types.ObjectId, ref: "User" }],
  
  // Bid Opening
  bidOpeningStatus: { 
    type: String, 
    enum: Object.values(BidOpeningStatus), 
    default: BidOpeningStatus.PENDING 
  },
  bidOpeningOfficer: { type: Schema.Types.ObjectId, ref: "User" },
  
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, {
  timestamps: true
});

// Enable virtuals in JSON/Object outputs
tenderSchema.set("toJSON", { virtuals: true });
tenderSchema.set("toObject", { virtuals: true });

// Virtual: BoQ for this tender's project
tenderSchema.virtual("boq", {
  ref: "BoQ",
  localField: "projectId",
  foreignField: "projectId",
  justOne: true,
});

// Generate unique tender number
tenderSchema.pre('save', async function(next) {
  if (this.isNew && !this.tenderNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Tender').countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });
    this.tenderNumber = `TNK/${year}/${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Validation: Ensure dates are in logical order
tenderSchema.pre('save', function(next) {
  if (this.bidOpeningDate <= this.submissionDeadline) {
    return next(new Error('Bid opening date must be after submission deadline'));
  }
  if (this.submissionDeadline <= this.clarificationDeadline) {
    return next(new Error('Submission deadline must be after clarification deadline'));
  }
  next();
});

export const Tender = mongoose.model<ITender>("Tender", tenderSchema);