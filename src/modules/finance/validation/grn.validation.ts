import { z } from "zod";

export const createGRNSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    purchaseOrderId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    receivedDate: z.string().datetime(),
    items: z.array(
      z.object({
        materialId: z.string().regex(/^[0-9a-fA-F]{24}$/),
        quantity: z.number().min(0),
        receivedQuantity: z.number().min(0),
        remarks: z.string().optional(),
      })
    ),
  }),
});
