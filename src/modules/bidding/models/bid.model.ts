import mongoose, { Schema, Document } from "mongoose";
import { BidStatus, BidEvaluationStatus, UnitOfMeasurement } from "@/types/enums";

export interface IBidBoQItem {
  boqItemId?: mongoose.Types.ObjectId; // Optional: for pricing existing BoQ
  description?: string; // Required for manual entry
  unit?: UnitOfMeasurement; // Required for manual entry
  quantity?: number; // Required for manual entry
  unitRate: number;
  totalAmount: number;
}

export interface IBidTechnicalProposal {
  methodology: string;
  workPlan: string;
  teamStructure: string;
  equipmentList: string;
  projectSchedule: string;
  documents: {
    filePath: string;
    description: string;
    documentType: "METHODOLOGY" | "WORK_PLAN" | "TEAM_CV" | "EQUIPMENT" | "SCHEDULE" | "OTHER";
  }[];
}

export interface IBidFinancialProposal {
  totalBidPrice: number;
  boqItems?: IBidBoQItem[];
  priceBreakdown: {
    materials: number;
    labor: number;
    equipment: number;
    overheads: number;
    profit: number;
  };
  cashFlowProjection?: string; // File path to cash flow document
  documents: {
    filePath: string;
    description: string;
    documentType: "BOQ" | "PRICE_BREAKDOWN" | "CASH_FLOW" | "BOND" | "OTHER";
  }[];
}

export interface IBidEvaluation {
  technicalScore?: number;
  technicalMaxScore?: number;
  technicalComments?: string;
  financialScore?: number;
  financialMaxScore?: number;
  financialComments?: string;
  overallScore?: number;
  overallRank?: number;
  evaluatedBy?: mongoose.Types.ObjectId;
  evaluatedAt?: Date;
  status: BidEvaluationStatus;
}

export interface IBid extends Document {
  tenderId: mongoose.Types.ObjectId;
  bidderId: mongoose.Types.ObjectId;
  bidNumber: string;
  
  // Submission Details
  submissionDate: Date;
  status: BidStatus;
  
  // Proposals
  technicalProposal: IBidTechnicalProposal;
  financialProposal: IBidFinancialProposal;
  
  // Security & Validation
  isSealed: boolean; // Financial proposal sealed until bid opening
  sealedUntil?: Date;
  digitalSignature?: string;
  submissionHash?: string; // For integrity verification
  
  // Additional Documents
  otherDocuments: {
    filePath: string;
    description: string;
    documentType: string;
  }[];
  
  // Evaluation
  evaluation: IBidEvaluation;
  
  // Award Information
  isAwarded: boolean;
  awardDate?: Date;
  contractValue?: number;
  
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  
  // Methods
  shouldBeUnsealed(): boolean;
}

// Schema definitions
const bidBoQItemSchema = new Schema({
  boqItemId: { type: Schema.Types.ObjectId, ref: "BoQItem" },
  description: { type: String },
  unit: { type: String, enum: Object.values(UnitOfMeasurement) },
  quantity: { type: Number },
  unitRate: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 }
}, { _id: false });

const technicalDocumentSchema = new Schema({
  filePath: { type: String, required: true },
  description: { type: String, required: false },
  documentType: { 
    type: String, 
    enum: ["METHODOLOGY", "WORK_PLAN", "TEAM_CV", "EQUIPMENT", "SCHEDULE", "OTHER"],
    required: true 
  }
});

const technicalProposalSchema = new Schema({
  methodology: { type: String, required: true },
  workPlan: { type: String, required: true },
  teamStructure: { type: String, required: true },
  equipmentList: { type: String, required: true },
  projectSchedule: { type: String, required: true },
  documents: [technicalDocumentSchema]
});

const financialDocumentSchema = new Schema({
  filePath: { type: String, required: true },
  description: { type: String, required: false },
  documentType: { 
    type: String, 
    enum: ["BOQ", "PRICE_BREAKDOWN", "CASH_FLOW", "BOND", "OTHER"],
    required: true 
  }
});

const priceBreakdownSchema = new Schema({
  materials: { type: Number, required: true, min: 0 },
  labor: { type: Number, required: true, min: 0 },
  equipment: { type: Number, required: true, min: 0 },
  overheads: { type: Number, required: true, min: 0 },
  profit: { type: Number, required: true, min: 0 }
});

const financialProposalSchema = new Schema({
  totalBidPrice: { type: Number, required: true, min: 0 },
  boqItems: [bidBoQItemSchema],
  priceBreakdown: { type: priceBreakdownSchema, required: true },
  cashFlowProjection: { type: String },
  documents: [financialDocumentSchema]
});

const evaluationSchema = new Schema({
  technicalScore: { type: Number, min: 0 },
  technicalMaxScore: { type: Number, min: 0 },
  technicalComments: { type: String },
  financialScore: { type: Number, min: 0 },
  financialMaxScore: { type: Number, min: 0 },
  financialComments: { type: String },
  overallScore: { type: Number, min: 0 },
  overallRank: { type: Number, min: 1 },
  evaluatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  evaluatedAt: { type: Date },
  status: { 
    type: String, 
    enum: Object.values(BidEvaluationStatus), 
    default: BidEvaluationStatus.PENDING 
  }
});

const otherDocumentSchema = new Schema({
  filePath: { type: String, required: true },
  description: { type: String, required: true },
  documentType: { type: String, required: true }
});

// Main bid schema
const bidSchema = new Schema({
  tenderId: { type: Schema.Types.ObjectId, ref: "Tender", required: true },
  bidderId: { type: Schema.Types.ObjectId, ref: "Bidder", required: true },
  bidNumber: { type: String, required: false, unique: true },
  
  // Submission Details
  submissionDate: { type: Date, default: Date.now },
  status: { type: String, enum: Object.values(BidStatus), default: BidStatus.DRAFT },
  
  // Proposals
  technicalProposal: { type: technicalProposalSchema, required: true },
  financialProposal: { type: financialProposalSchema, required: true },
  
  // Security & Validation
  isSealed: { type: Boolean, default: true },
  sealedUntil: { type: Date },
  digitalSignature: { type: String },
  submissionHash: { type: String },
  
  // Additional Documents
  otherDocuments: [otherDocumentSchema],
  
  // Evaluation
  evaluation: { type: evaluationSchema, default: () => ({}) },
  
  // Award Information
  isAwarded: { type: Boolean, default: false },
  awardDate: { type: Date },
  contractValue: { type: Number, min: 0 },
  
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
}, {
  timestamps: true
});

// Indexes
bidSchema.index({ tenderId: 1, bidderId: 1 }, { unique: true });
bidSchema.index({ status: 1 });
bidSchema.index({ isSealed: 1, sealedUntil: 1 });

// Pre-save middleware: Generate unique bid number
bidSchema.pre('save', async function(next) {
  if (this.isNew && !this.bidNumber) {
    try {
      const tender = await mongoose.model('Tender').findById(this.tenderId);
      if (!tender) {
        return next(new Error('Tender not found'));
      }
      
      const count = await mongoose.model('Bid').countDocuments({ tenderId: this.tenderId });
      this.bidNumber = `${tender.tenderNumber}/BID/${String(count + 1).padStart(3, '0')}`;
    } catch (err) {
      return next(err as any); // fix: cast unknown to expected error type
    }
  }
  next();
});

// Virtual properties
bidSchema.virtual('isSealedStatus').get(function() {
  if (!this.sealedUntil) return this.isSealed;
  return new Date() < this.sealedUntil;
});

// Instance methods
bidSchema.methods.shouldBeUnsealed = function() {
  return this.sealedUntil && new Date() >= this.sealedUntil;
};

// Static methods
bidSchema.statics.unsealExpiredBids = async function() {
  const now = new Date();
  const result = await this.updateMany(
    { 
      isSealed: true, 
      sealedUntil: { $lte: now } 
    },
    { 
      $set: { isSealed: false } 
    }
  );
  return result;
};

const transformFunction = function(doc: any, ret: any, _options: any) {
  // Check if bid is still sealed
  const isCurrentlySealed = doc.sealedUntil ? new Date() < new Date(doc.sealedUntil) : doc.isSealed;
  
  if (isCurrentlySealed) {
    // Remove financial proposal if sealed
    delete ret.financialProposal;
    // Add a flag to indicate it's sealed
    ret.isFinancialProposalSealed = true;
  } else {
    ret.isFinancialProposalSealed = false;
  }
  
  return ret;
};

// Configure JSON and Object output
bidSchema.set('toJSON', { 
  virtuals: true,
  transform: transformFunction
});

bidSchema.set('toObject', { 
  virtuals: true,
  transform: transformFunction
});

// Export the model
export const Bid = mongoose.model<IBid>("Bid", bidSchema);