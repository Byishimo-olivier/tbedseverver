// src/modules/finance/models/grn.model.ts
import { GRNStatus } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface IGRN extends Document {
  projectId: mongoose.Types.ObjectId;
  purchaseOrderId: mongoose.Types.ObjectId;
  grnNumber: string;
  receivedDate: Date;
  items: {
    materialId: mongoose.Types.ObjectId;
    quantity: number;
    receivedQuantity: number;
    pendingQuantity: number;
    remarks: string;
  }[];
  status: GRNStatus;
  documents: { filePath: string; description: string }[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const grnSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
    },
    grnNumber: { type: String, required: true, unique: true },
    receivedDate: { type: Date, required: true },
    items: [
      {
        materialId: {
          type: Schema.Types.ObjectId,
          ref: "InventoryItem",
          required: true,
        },
        quantity: { type: Number, required: true },
        receivedQuantity: { type: Number, required: true },
        pendingQuantity: { type: Number },
        remarks: { type: String },
      },
    ],
    status: {
      type: String,
      enum: Object.values(GRNStatus),
      required: true,
    },
    documents: [
      {
        filePath: { type: String },
        description: { type: String },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

export const GRN = mongoose.model<IGRN>("GRN", grnSchema);
