import {
  ProjectStage,
  ProjectStageStatus,
  ReportingPeriod,
} from "@/types/enums";
import { z } from "zod";

const progressDocumentSchema = z.object({
  filePath: z.string().optional(),
  description: z.string().min(1, "Description is required"),
});

export const createProjectStageSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    stage: z.nativeEnum(ProjectStage),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    status: z.nativeEnum(ProjectStageStatus),
    alertSettings: z.object({
      email: z.boolean().default(true),
      sms: z.boolean().default(false),
    }),
  }),
});

export const createProgressTrackingSchema = z.object({
  body: z.object({
    projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    reportingPeriod: z.nativeEnum(ReportingPeriod),
    stageProgress: z.array(
      z.object({
        stage: z.nativeEnum(ProjectStage),
        progressPercentage: z.number().min(0).max(100),
      })
    ),
    comments: z.string().optional(),
    supportingDocumentation: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z.array(progressDocumentSchema).optional()
    ),
    delayDocumentation: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z.array(progressDocumentSchema).optional()
    ),
    correctiveActions: z.array(z.string()).optional(),
  }),
});

export const updateProjectStageSchema = z.object({
  body: createProjectStageSchema.shape.body.partial(),
});

export const updateProgressTrackingSchema = z.object({
  body: createProgressTrackingSchema.shape.body.partial(),
});
