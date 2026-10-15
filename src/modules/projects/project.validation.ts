import { ProjectStatus, ProjectType, UserRole } from "@/types/enums";
import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const teamMemberSchema = z.object({
  user: objectId,
  role: z.nativeEnum(UserRole).refine(
    (r) => r !== UserRole.OWNER,
    "Owner role is assigned implicitly to the project creator"
  ),
});

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    projectCode: z.string().optional(),
    projectDescription: z.string().min(10),
    status: z.nativeEnum(ProjectStatus).optional(),
    type: z.nativeEnum(ProjectType).optional(),
    team: z.preprocess(
      (val) => {
        if (val === "" || val === null || val === undefined) return undefined;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z.array(teamMemberSchema).optional()
    ),
    progress: z.number().min(0).max(100).optional(),
    budget: z.number().min(0),
  }),
  file: z.any().optional(),
  description: z.string().optional(),
});

export const updateProjectSchema = z.object({
  body: z
    .object({
      name: z.union([z.string().min(2), z.string().length(0)]).optional(),
      projectDescription: z
        .union([z.string().min(10), z.string().length(0)])
        .optional(),
      projectCode: z.string().optional(),
      status: z.nativeEnum(ProjectStatus).optional(),
      type: z.nativeEnum(ProjectType).optional(),
      team: z.preprocess(
        (val) => {
          if (val === "" || val === null || val === undefined) return undefined;
          if (typeof val === "string") {
            try {
              return JSON.parse(val);
            } catch {
              return val;
            }
          }
          return val;
        },
        z.array(teamMemberSchema).optional()
      ),
      progress: z.preprocess(
        (val) => (val === "" ? undefined : Number(val)),
        z.number().min(0).max(100).optional()
      ),
      budget: z.preprocess(
        (val) => (val === "" ? undefined : Number(val)),
        z.number().min(0).optional()
      ),
    })
    .partial(),
  file: z.any().optional(),
  description: z.string().optional(),
});

export const deleteDocumentSchema = z.object({
    body: z.object({
        documentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid document ID"),
        documentType: z.string().min(1, "Document type is required"),
        documentPath: z.string().min(1, "Document path is required"),
    }),
});
