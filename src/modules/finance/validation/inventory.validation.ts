// src/modules/finance/validation/inventory.validation.ts
import { ExpenseCategory, UnitOfMeasurement } from "@/types/enums";
import { z } from "zod";

export const createInventoryItemSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    materialCode: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    unit: z.nativeEnum(UnitOfMeasurement),
    category: z.nativeEnum(ExpenseCategory),
    unitPrice: z.number().min(0),
    minimumStock: z.number().min(0).optional(),
  }),
});

export const updateInventoryItemSchema = z.object({
  body: z.object({
    projectId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    materialCode: z.string().optional(),
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),
    unit: z.nativeEnum(UnitOfMeasurement).optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    unitPrice: z.number().min(0).optional(),
    minimumStock: z.number().min(0).optional(),
  }),
});
