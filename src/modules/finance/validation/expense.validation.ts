import { ExpenseApprovalStatus, ExpenseCategory } from "@/types/enums";
import { z } from "zod";

export const createExpenseSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    date: z.string().datetime(),
    category: z.nativeEnum(ExpenseCategory),
    amount: z.union([
      z.number().min(0),
      z.string().transform((val) => {
        const parsed = Number(val);
        if (isNaN(parsed)) {
          throw new Error("Invalid number");
        }
        return parsed;
      }),
    ]),
    description: z.string(),
  }),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const updateExpenseApprovalStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      ExpenseApprovalStatus.PENDING,
      ExpenseApprovalStatus.APPROVED,
      ExpenseApprovalStatus.REJECTED,
    ]),
    comments: z.string().optional(),
  }),
});
