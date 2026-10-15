import {
  ExpenseCategory,
  PaymentTerms,
  UnitOfMeasurement,
} from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface IPurchaseOrder extends Document {
  projectId: mongoose.Types.ObjectId;
  poNumber: string;
  supplierDetails: string;
  orderDate: Date;
  deliveryDate: Date;
  materialRequestId?: mongoose.Types.ObjectId; // Optional field for linking to a material request
  materialList: {
    materialName: string;
    quantity: number;
    unit: UnitOfMeasurement;
    category: ExpenseCategory;
    unitPrice: number;
  }[];
  expenseRecorded: boolean;
  totalCost: number;
  paymentTerms: PaymentTerms;
  specialInstructions?: string;
  // Optional document upload path if not input manually
  documentFilePath?: string;
}

const purchaseOrderSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  poNumber: { type: String, required: true },
  supplierDetails: { type: String, required: true },
  orderDate: { type: Date, default: Date.now },
  deliveryDate: { type: Date, required: true },
  materialRequestId: {
    type: Schema.Types.ObjectId,
    ref: "MaterialRequest",
    required: false, // Optional field for linking to a material request
  },
  materialList: [
    {
      materialName: { type: String, required: true },
      quantity: { type: Number, required: true },
      unit: {
        type: String,
        enum: Object.values(UnitOfMeasurement),
        required: true,
      },
      category: {
        type: String,
        enum: Object.values(ExpenseCategory),
        required: true,
      },
      unitPrice: { type: Number, required: true }, // Add this field
    },
  ],
  expenseRecorded: { type: Boolean, required: true, default: false },
  totalCost: { type: Number, required: true },
  paymentTerms: {
    type: String,
    enum: Object.values(PaymentTerms),
    required: true,
  },
  specialInstructions: { type: String },
  documentFilePath: { type: String },
});

export const PurchaseOrder = mongoose.model<IPurchaseOrder>(
  "PurchaseOrder",
  purchaseOrderSchema
);
