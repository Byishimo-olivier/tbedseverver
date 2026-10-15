// src/modules/finance/models/materialUsage.model.ts
import { ReportingPeriod } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface IMaterialUsage extends Document {
  projectId: mongoose.Types.ObjectId;
  date: Date;
  reportingPeriod: ReportingPeriod;
  items: {
    materialId: mongoose.Types.ObjectId;
    quantity: number;
    location: string;
    purpose: string;
  }[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const materialUsageSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    date: { type: Date, required: true },
    reportingPeriod: {
      type: String,
      enum: Object.values(ReportingPeriod),
      required: true,
    },
    items: [
      {
        materialId: {
          type: Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true,
        },
        quantity: { type: Number, required: true },
        location: { type: String, required: true },
        purpose: { type: String, required: true },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

export const MaterialUsage = mongoose.model<IMaterialUsage>(
  "MaterialUsage",
  materialUsageSchema
);
