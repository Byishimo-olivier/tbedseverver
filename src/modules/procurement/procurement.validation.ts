import {
  Department,
  ExpenseCategory,
  PaymentTerms,
  PriorityLevel,
  UnitOfMeasurement,
} from "@/types/enums";
import { z } from "zod";

export const createMaterialRequestSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    requesterName: z.string().min(2),
    department: z.nativeEnum(Department),
    requestDate: z.string().optional(), // Date string, defaults to now if omitted
    materialDetails: z.array(
      z.object({
        materialName: z.string().min(1),
        quantity: z.number().min(1),
        unit: z.nativeEnum(UnitOfMeasurement),
        requiredByDate: z.string(),
        specifications: z.string().optional(),
        estimatedCost: z.number().min(0),
        category: z.nativeEnum(ExpenseCategory),
      })
    ),
    purpose: z.string().min(5),
    priorityLevel: z.nativeEnum(PriorityLevel),
  }),
});

// Create Purchase Order Schema
export const createPurchaseOrderSchema = z.object({
    body: z.object({
        projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
        materialRequestId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
        poNumber: z.string().min(1),
        supplierDetails: z.string().min(2),
        orderDate: z.string().optional(),
        deliveryDate: z.string(),
        materialList: z.array(
            z.object({
                materialName: z.string().min(1),
                quantity: z.number().min(1),
                unit: z.nativeEnum(UnitOfMeasurement),
                category: z.nativeEnum(ExpenseCategory),
                unitPrice: z.number().min(0),
            })
        ).optional().default([]),
        totalCost: z.number().min(0),
        paymentTerms: z.nativeEnum(PaymentTerms),
        specialInstructions: z.string().optional(),
        notificationTime: z.string().datetime().optional(),
        fileDescription: z.string().optional(),
    }).superRefine((data, ctx) => {
        const hasItems = data.materialList && data.materialList.length > 0;
        const hasRequestId = !!data.materialRequestId;

        if (!hasItems && !hasRequestId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Either materialList or materialRequestId must be provided.",
                path: ["materialList"],
            });
        }
        if (hasItems && hasRequestId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Provide either materialList or materialRequestId, but not both.",
                path: ["materialList"],
            });
        }
    }),
    file: z.any().optional(),
});
