// src/modules/finance/models/boq.model.ts
import { BoQCategory, UnitOfMeasurement } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

// Interface for individual line items
export interface IBoQLineItem extends Document {
  description: string;
  unit: UnitOfMeasurement;
  quantity: number;
  rate: number;
  amount: number; // Calculated: quantity * rate
  completedQuantity?: number; // Optional: for tracking progress
}

// Interface for sections within the BOQ
export interface IBoQSection extends Document {
  sectionName: BoQCategory;
  items: IBoQLineItem[];
  subTotal: number; // Calculated: sum of item amounts in this section
}

// Main BOQ interface
export interface IBoQ extends Document {
  projectId: mongoose.Types.ObjectId;
  sections: IBoQSection[];
  grandTotal: number; // Calculated: sum of all section sub-totals
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

// Schema for individual line items within a section
const BoQLineItemSchema = new Schema({
  description: { type: String, required: true, trim: true },
  unit: {
    type: String,
    enum: Object.values(UnitOfMeasurement),
    required: true,
  },
  quantity: { type: Number, required: true, default: 0 },
  rate: { type: Number, required: true, default: 0 },
  amount: { type: Number, default: 0 }, // Calculated automatically
  completedQuantity: { type: Number, default: 0 }, // Optional for tracking progress
});

// Schema for the major sections of the BOQ
const BoQSectionSchema = new Schema({
  sectionName: {
    type: String,
    enum: Object.values(BoQCategory),
    required: true,
  },
  items: [BoQLineItemSchema],
  subTotal: { type: Number, default: 0 }, // Calculated automatically
});

// The main BOQ schema that holds the entire project details
const boqSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    sections: [BoQSectionSchema],
    grandTotal: { type: Number, default: 0 }, // Calculated automatically
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true, 
  }
);

// --- CALCULATION MIDDLEWARE ---

/**
 * Mongoose 'pre-save' hook for the main BOQ document.
 * This function orchestrates the calculation of all amounts, sub-totals,
 * and the grand total before the document is persisted to the database.
 */
boqSchema.pre("save", function (next) {
  let grandTotal = 0;

  // Iterate over each section to calculate its sub-total
  this.sections.forEach((section) => {
    let sectionSubTotal = 0;

    // Iterate over each item in the section to calculate its amount
    section.items.forEach((item) => {
      // Calculate and set the amount for the individual item
      item.amount = item.quantity * item.rate;
      // Add the item's amount to the section's sub-total
      sectionSubTotal += item.amount;
    });

    // Set the calculated sub-total for the section
    section.subTotal = sectionSubTotal;
    // Add the section's sub-total to the grand total
    grandTotal += section.subTotal;
  });

  // Set the final calculated grand total for the entire BOQ
  this.grandTotal = grandTotal;

  // Proceed to the next middleware/save operation
  next();
});

export const BoQ = mongoose.model<IBoQ>("BoQ", boqSchema);