import { ReportingPeriod } from "@/types/enums";
import { z } from "zod";

export const createMaterialUsageSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    date: z.string().datetime(),
    reportingPeriod: z.nativeEnum(ReportingPeriod),
    items: z.array(
      z.object({
        materialId: z.string().regex(/^[0-9a-fA-F]{24}$/),
        quantity: z.number().min(0),
        location: z.string().min(1),
        purpose: z.string().min(1),
      })
    ),
  }),
});
