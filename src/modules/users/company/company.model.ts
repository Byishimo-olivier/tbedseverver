import { PlanId } from "@/config/plans";
import { CompanyType } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface ICompany extends Document {
  name: string;
  registrationNumber: string;
  type: CompanyType;
  address: string;
  email: string;
  contactNumber: string;
  website?: string;
  ownerId: mongoose.Types.ObjectId;
  plan:PlanId,
  subscriptionId?: string;
  subscriptionStatus: string;
  subscriptionStartDate?:Date;
  subscriptionEndDate?:Date;
  trialEnds: Date;
  members: {
    userId: mongoose.Types.ObjectId;
    role: string;
  }[];
  experience?: {
    description: string;
    years?: number;
    documentProof?: string;
  }[];
  certifications?: {
    name: string;
    issuingBody: string;
    issueDate: Date;
    expiryDate?: Date;
    documentProof?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema(
  {
    name: { type: String, required: true },
    registrationNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: Object.values(CompanyType), required: true },
    address: { type: String, required: true },
    email: { type: String, required: true },
    contactNumber: { type: String, required: true },
    website: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    plan: {
      type: String,
      enum: Object.values(PlanId),
      default: PlanId.BASIC,
    },
    subscriptionId: {
      type: String,
      index: true,
      sparse: true,
    },
    subscriptionStatus: {
      type: String, //active', 'canceled', 'past_due', 'inactive'
      default: "inactive",
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    trialEnds:{
      type:Date,
    },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: { type: String, required: true },
      },
    ],
    experience: [
      {
        description: { type: String, required: true },
        years: { type: Number },
        documentProof: { type: String }, // Path to uploaded document
      },
    ],
    certifications: [
      {
        name: { type: String, required: true },
        issuingBody: { type: String, required: true },
        issueDate: { type: Date, required: true },
        expiryDate: { type: Date },
        documentProof: { type: String }, // Path to uploaded document
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Company = mongoose.model<ICompany>("Company", companySchema);
