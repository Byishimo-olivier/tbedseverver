import mongoose, { Schema, Document } from "mongoose";

export enum TransactionType {
  RECEIVED = "received",
  ISSUED = "issued",
  ADJUSTED = "adjusted",
  RETURNED = "returned",
}

export interface IInventoryTransaction extends Document {
  inventoryItemId: mongoose.Types.ObjectId;
  quantity: number;
  type: TransactionType;
  sourceDocument: {
    type: string; // "GRN", "ISSUE", "ADJUSTMENT", etc.
    id: mongoose.Types.ObjectId;
  };
  projectId?: mongoose.Types.ObjectId;
  remarks?: string;
  balanceAfter: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const inventoryTransactionSchema = new Schema(
  {
    inventoryItemId: {
      type: Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    quantity: { type: Number, required: true },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
    },
    sourceDocument: {
      type: { type: String, required: true },
      id: { type: Schema.Types.ObjectId, required: true },
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    remarks: { type: String },
    balanceAfter: { type: Number, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

export const InventoryTransaction = mongoose.model<IInventoryTransaction>(
  "InventoryTransaction",
  inventoryTransactionSchema
);
