import { ExpenseApprovalStatus, ExpenseCategory } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface IExpense extends Document {
  projectId: mongoose.Types.ObjectId;
  date: Date;
  category: ExpenseCategory;
  amount: number;
  description: string;
  documents: { filePath: string; description: string }[];
  approvalStatus: ExpenseApprovalStatus;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const expenseSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: Date, required: true },
    category: {
      type: String,
      enum: Object.values(ExpenseCategory),
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    documents: [{ filePath: { type: String }, description: { type: String } }],
    approvalStatus: {
      type: String,
      enum: Object.values(ExpenseApprovalStatus),
      default: ExpenseApprovalStatus.PENDING,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

export const Expense = mongoose.model<IExpense>("Expense", expenseSchema);
