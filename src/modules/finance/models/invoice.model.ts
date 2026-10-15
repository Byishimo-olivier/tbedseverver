import { InvoiceType, PaymentTerms } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";
import { BoQ, IBoQLineItem } from "./boq.model";

export enum InvoiceStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REJECTED = "rejected",
  PAID = "paid",
  VOID = "void",
}

export interface IInvoiceItem {
  boqItemId?: mongoose.Types.ObjectId;
  claimedQuantity?: number;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  // Rate at the time of invoicing for historical accuracy
  rate?: number;
  amount: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  type: InvoiceType;
  projectId: mongoose.Types.ObjectId;
  issuerId: mongoose.Types.ObjectId;
  invoiceDate: Date;
  workPeriod: {
    start: Date;
    end: Date;
  };
  status: InvoiceStatus;
  invoiceItems: IInvoiceItem[];
  totalAmount: number; // Calculated field
  documents: { filePath: string; description: string }[];
  paymentTerms: PaymentTerms;
  dueDate: Date;
  paymentDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  approvalWorkflow: {
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    comments?: string;
  };
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const invoiceItemSchema = new Schema(
  {
    boqItemId: { type: Schema.Types.ObjectId, ref: "BoQItem.sections.items" },
    claimedQuantity: { type: Number, min: 0 },
    description: { type: String },
    quantity: { type: Number, min: 0 },
    unitPrice: { type: Number, min: 0 },
    rate: { type: Number },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const invoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: Object.values(InvoiceType),
      required: true,
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    issuerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invoiceDate: { type: Date, default: Date.now },
    workPeriod: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
    },
    invoiceItems: [invoiceItemSchema],
    totalAmount: { type: Number, default: 0 },
    documents: [
      {
        filePath: { type: String },
        description: { type: String },
      },
    ],
    paymentTerms: {
      type: String,
      enum: Object.values(PaymentTerms),
      required: true,
    },
    dueDate: { type: Date, required: true },
    paymentDetails: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true },
    },
    approvalWorkflow: {
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
      comments: { type: String },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate total amount
invoiceSchema.pre<IInvoice>("save", async function (next) {
  if (this.isModified("invoiceItems")) {
    let total = 0;

    if (this.type === InvoiceType.BOQ_BASED) {
      const boq = await BoQ.findOne({ projectId: this.projectId });
      if (!boq) {
        return next(
          new Error(`BoQ not found for project ID: ${this.projectId}`)
        );
      }

      const boqItemsMap = new Map<string, IBoQLineItem>();
      boq.sections.forEach((section) => {
        section.items.forEach((item) => {
          boqItemsMap.set(item._id.toString(), item);
        });
      });

      for (const item of this.invoiceItems) {
        if (!item.boqItemId) {
          return next(new Error(`BoQ item ID is missing for a BOQ-based invoice item.`));
        }
        const boqLineItem = boqItemsMap.get(item.boqItemId.toString());
        if (!boqLineItem) {
          return next(
            new Error(`BoQ Item with id ${item.boqItemId} not found in project's BoQ.`)
          );
        }
        item.rate = boqLineItem.rate;
        item.amount = (item.claimedQuantity || 0) * boqLineItem.rate;
        total += item.amount;
      }
    } else if (this.type === InvoiceType.SERVICE_BASED) {
      for (const item of this.invoiceItems) {
        item.amount = (item.quantity || 0) * (item.unitPrice || 0);
        total += item.amount;
      }
    }
    this.totalAmount = total;
  }
  next();
});

export const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema);
