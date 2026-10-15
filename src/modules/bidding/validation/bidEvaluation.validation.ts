import { z } from "zod";

export const submitTechnicalScoreSchema = z.object({
  body: z.object({
    score: z.number().min(0),
    maxScore: z.number().min(0),
    comments: z.string().optional(),
  }),
});