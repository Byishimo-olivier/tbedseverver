import mongoose, { Document, Schema } from "mongoose";
import {UserRole } from "@/types/enums";

export interface ICompanyInvitation extends Document {
  companyId: mongoose.Types.ObjectId;
  email: string;
  role: UserRole;
  token: string;
  expired: boolean;
  accepted: boolean;
  createdAt: Date;
  expiresAt: Date;
}

const companyInvitationSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  email: { type: String, required: true },
  role: { type: String, required: true, enum: Object.values(UserRole) },
  token: { type: String, required: true },
  expired: { type: Boolean, default: false },
  accepted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// Create a unique index on companyId and email
companyInvitationSchema.index({ companyId: 1, email: 1 }, { unique: true });

export const CompanyInvitation = mongoose.model<ICompanyInvitation>(
  "CompanyInvitation",
  companyInvitationSchema
);
