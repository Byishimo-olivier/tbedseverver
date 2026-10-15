import { BudgetApprovalStatus } from "@/types/enums";
import { z } from "zod";

export const createBudgetSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    fiscalYear: z.number().int().min(2000),
    materialsBudget: z.number().min(0),
    laborBudget: z.number().min(0),
    equipmentBudget: z.number().min(0),
    fuelBudget: z.number().min(0),
    overheadsBudget: z.number().min(0),
    notes: z.string().optional(),
  }),
});

export const updateBudgetApprovalStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      BudgetApprovalStatus.PENDING,
      BudgetApprovalStatus.APPROVED,
      BudgetApprovalStatus.REJECTED,
    ]),
    comments: z.string().optional(),
  }),
});

export const updateBudgetSchema = createBudgetSchema.partial();
