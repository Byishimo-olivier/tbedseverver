// src/modules/finance/models/inventory.model.ts
import { ExpenseCategory, UnitOfMeasurement } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface IInventoryItem extends Document {
  projectId: mongoose.Types.ObjectId;
  materialCode: string;
  name: string;
  description: string;
  unit: UnitOfMeasurement;
  category: ExpenseCategory;
  unitPrice: number;
  currentStock: number;
  minimumStock: number;
  isCustom: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
}

const inventoryItemSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    materialCode: { type: String, required: false, unique: true },
    name: { type: String, required: true },
    description: { type: String },
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
    unitPrice: { type: Number, required: true },
    currentStock: { type: Number, default: 0 },
    minimumStock: { type: Number, default: 0 },
    isCustom: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate unique materialCode
inventoryItemSchema.pre("save", async function (next) {
  // Only generate materialCode if it doesn't exist
  if (!this.materialCode) {
    // Use category acronym as prefix
    let categoryPrefix = this.category.substring(0, 3).toUpperCase();

    // Get current date components
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");

    const timestamp = Date.now().toString().slice(-6);
    let randomSuffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    // Create a candidate materialCode
    let candidateCode = `MAT-${categoryPrefix}-${year}${month}-${timestamp.slice(
      -4
    )}-${randomSuffix}`;

    // Check if the code already exists
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (codeExists && attempts < maxAttempts) {
      const existingItem = await mongoose
        .model("InventoryItem")
        .findOne({ materialCode: candidateCode });
      if (!existingItem) {
        codeExists = false;
      } else {
        randomSuffix = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
        candidateCode = `MAT-${categoryPrefix}-${year}${month}-${timestamp.slice(
          -4
        )}-${randomSuffix}`;
        attempts++;
      }
    }

    this.materialCode = candidateCode;
  }

  next();
});

export const InventoryItem = mongoose.model<IInventoryItem>(
  "InventoryItem",
  inventoryItemSchema
);
