import {
  Department,
  ExpenseCategory,
  PriorityLevel,
  UnitOfMeasurement,
} from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface IMaterialRequest extends Document {
  projectId: mongoose.Types.ObjectId;
  requesterName: string;
  department: Department;
  requestDate: Date;
  materialDetails: {
    materialName: string;
    quantity: number;
    unit: UnitOfMeasurement;
    requiredByDate: Date;
    specifications: string;
    estimatedCost: number;
    category: ExpenseCategory;
  }[];
  purpose: string;
  priorityLevel: PriorityLevel;
}

const materialRequestSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  requesterName: { type: String, required: true },
  department: { type: String, enum: Object.values(Department), required: true },
  requestDate: { type: Date, default: Date.now },
  materialDetails: [
    {
      materialName: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: {
        type: String,
        enum: Object.values(UnitOfMeasurement),
        required: true,
      },
      requiredByDate: { type: Date, required: true },
      specifications: { type: String },
      estimatedCost: { type: Number, required: true },
      category: {
        type: String,
        enum: Object.values(ExpenseCategory),
        required: true,
      },
    },
  ],
  purpose: { type: String, required: true },
  priorityLevel: {
    type: String,
    enum: Object.values(PriorityLevel),
    required: true,
  },
});

export const MaterialRequest = mongoose.model<IMaterialRequest>(
  "MaterialRequest",
  materialRequestSchema
);
