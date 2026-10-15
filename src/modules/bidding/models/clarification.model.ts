import mongoose, { Schema, Document } from "mongoose";
import { ClarificationStatus } from "@/types/enums";

export interface IClarification extends Document {
  tenderId: mongoose.Types.ObjectId;
  questionBy: mongoose.Types.ObjectId; // Bidder who asked
  question: string;
  questionDate: Date;
  
  response?: string;
  responseBy?: mongoose.Types.ObjectId; // Tender manager who responded
  responseDate?: Date;
  
  status: ClarificationStatus;
  isPublic: boolean; // Whether response is visible to all bidders
  
  // Attachments
  questionAttachments: {
    filePath: string;
    description: string;
  }[];
  
  responseAttachments: {
    filePath: string;
    description: string;
  }[];
}

const attachmentSchema = new Schema({
  filePath: { type: String, required: true },
  description: { type: String, required: true }
});

const clarificationSchema = new Schema({
  tenderId: { type: Schema.Types.ObjectId, ref: "Tender", required: true },
  questionBy: { type: Schema.Types.ObjectId, ref: "Bidder", required: true },
  question: { type: String, required: true },
  questionDate: { type: Date, default: Date.now },
  
  response: { type: String },
  responseBy: { type: Schema.Types.ObjectId, ref: "User" },
  responseDate: { type: Date },
  
  status: { 
    type: String, 
    enum: Object.values(ClarificationStatus), 
    default: ClarificationStatus.PENDING 
  },
  isPublic: { type: Boolean, default: true },
  
  // Attachments
  questionAttachments: [attachmentSchema],
  responseAttachments: [attachmentSchema]
}, {
  timestamps: true
});

export const Clarification = mongoose.model<IClarification>("Clarification", clarificationSchema);