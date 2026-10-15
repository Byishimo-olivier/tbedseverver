import { BudgetApprovalStatus } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface IBudget extends Document {
  projectId: mongoose.Types.ObjectId;
  fiscalYear: number;
  materialsBudget: number;
  laborBudget: number;
  equipmentBudget: number;
  fuelBudget: number;
  overheadsBudget: number;
  totalPlannedBudget: number;
  notes: string;
  comments: string;
  approvalStatus: BudgetApprovalStatus;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const budgetSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    fiscalYear: { type: Number, required: true },
    materialsBudget: { type: Number, required: true },
    laborBudget: { type: Number, required: true },
    equipmentBudget: { type: Number, required: true },
    fuelBudget: { type: Number, required: true },
    overheadsBudget: { type: Number, required: true },
    totalPlannedBudget: { type: Number, required: true },
    notes: { type: String },
    comments: { type: String },
    approvalStatus: {
      type: String,
      enum: Object.values(BudgetApprovalStatus),
      default: BudgetApprovalStatus.PENDING,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

export const Budget = mongoose.model<IBudget>("Budget", budgetSchema);
