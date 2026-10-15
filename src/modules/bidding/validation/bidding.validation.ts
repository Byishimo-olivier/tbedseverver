import { z } from "zod";
import {
  TenderType,
  CompanyType,
  UnitOfMeasurement,
} from "@/types/enums";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

const tenderDocumentSchema = z.object({
  filePath: z.string().optional(),
  description: z.string().optional(),
  documentType: z.enum(["BOQ", "TECHNICAL_SPEC", "DRAWINGS", "TERMS", "FORMS", "ADDENDUM", "OTHER"]),
});

const technicalDocumentSchema = z.object({
  documentType: z.enum(["METHODOLOGY", "WORK_PLAN", "TEAM_CV", "EQUIPMENT", "SCHEDULE", "OTHER"]),
  description: z.string().optional(),
  filePath: z.string().optional(),
});

const financialDocumentSchema = z.object({
  documentType: z.enum(["BOQ", "PRICE_BREAKDOWN", "CASH_FLOW", "BOND", "OTHER"]),
  description: z.string().optional(),
  filePath: z.string().optional(),
});

const eligibilityCriteriaSchema = z.object({
  minimumExperience: z.number().min(0),
  minimumTurnover: z.number().min(0),
  requiredLicenses: z.array(z.string()),
  requiredCertifications: z.array(z.string()),
  geographicalRestrictions: z.array(z.string()).optional(),
});

export const createTenderSchema = z.object({
  body: z.object({
    projectId: objectId,
    title: z.string().min(5),
    description: z.string().min(10),
    type: z.nativeEnum(TenderType),
    clarificationDeadline: z.string().datetime(),
    submissionDeadline: z.string().datetime(),
    bidOpeningDate: z.string().datetime(),
    eligibilityCriteria: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            throw new Error("Invalid JSON format for eligibilityCriteria");
          }
        }
        return val;
      },
      eligibilityCriteriaSchema
    ),
    tenderManager: objectId,
    evaluationCommittee: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return [];
          }
        }
        return val;
      },
      z.array(objectId).optional()
    ),
    boqId: objectId.optional(),
    estimatedBudget: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          const parsed = parseFloat(val);
          if (isNaN(parsed)) {
            throw new Error("Invalid number format for estimatedBudget");
          }
          return parsed;
        }
        return val;
      },
      z.number().min(0).optional()
    ),
    documents: z.preprocess(
      (val) => safeJson(val, "documents"),
      z.array(tenderDocumentSchema).optional()
    ),
  }),
});

// const safeJson = (val: unknown, field: string) => {
//   if (typeof val !== "string") return val;
//   try {
//     return JSON.parse(val);
//   } catch {
//     throw new Error(`Invalid JSON format for ${field}`);
//   }
// };

export const updateTenderSchema = z.object({
  body: z.object({
    projectId: objectId.optional(),
    title: z.string().min(5).optional(),
    description: z.string().min(10).optional(),
    type: z.nativeEnum(TenderType).optional(),
    clarificationDeadline: z.string().datetime().optional(),
    submissionDeadline: z.string().datetime().optional(),
    bidOpeningDate: z.string().datetime().optional(),
    eligibilityCriteria: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            throw new Error("Invalid JSON format for eligibilityCriteria");
          }
        }
        return val;
      },
      eligibilityCriteriaSchema.optional()
    ),
    tenderManager: objectId.optional(),
    evaluationCommittee: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return [];
          }
        }
        return val;
      },
      z.array(objectId).optional()
    ),
    boqId: objectId.optional(),
    estimatedBudget: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          const parsed = parseFloat(val);
          if (isNaN(parsed)) {
            throw new Error("Invalid number format for estimatedBudget");
          }
          return parsed;
        }
        return val;
      },
      z.number().min(0).optional()
    ),
    documents: z.preprocess(
      (val) => {
        if (val === undefined || val === null || val === "") return undefined;
        return safeJson(val, "documents");
      },
      z.array(tenderDocumentSchema).optional()
    ),
    replaceDocuments: z
      .preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean().optional())
      .optional(),
  }),
});

const flexibleDateTime = z.preprocess((val) => {
  if (typeof val === "string") {
    // If date-only (YYYY-MM-DD), append midnight UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return `${val}T00:00:00.000Z`;
    }
  }
  return val;
}, z.string().datetime("Invalid datetime"));

const bidderExperienceSchema = z.object({
  projectName: z.string(),
  clientName: z.string(),
  projectValue: z.number().min(0),
  completionDate: flexibleDateTime, // was z.string().datetime()
  description: z.string(),
  role: z.string(),
});

const bidderQualificationSchema = z.object({
  certificationType: z.string(),
  certificateNumber: z.string(),
  issuingAuthority: z.string(),
  issueDate: flexibleDateTime,      // was z.string().datetime()
  expiryDate: flexibleDateTime.optional(), // was z.string().datetime().optional()
  filePath: z.string().optional(),  // make optional so controller can add it after upload
});


export const registerBidderSchema = z.object({
  body: z
    .object({
      companyId: objectId.optional(),
      companyName: z.string().optional(),
      companyType: z.nativeEnum(CompanyType).optional(),
      registrationNumber: z.string().optional(),
      taxId: z.string(),
      contactPerson: z.string(),
      contactEmail: z.string().email(),
      contactPhone: z.string(),
      address: z
        .object({
          street: z.string(),
          city: z.string(),
          state: z.string(),
          postalCode: z.string(),
          country: z.string(),
        })
        .optional(),
      annualTurnover: z.number().min(0),
      bankName: z.string(),
      bankAccountNumber: z.string(),
      experience: z.array(bidderExperienceSchema).optional(),
      qualifications: z.array(bidderQualificationSchema).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.companyId) {
        if (!data.companyName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Company name is required if not linking to an existing company",
            path: ["companyName"],
          });
        }
        if (!data.companyType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Company type is required if not linking to an existing company",
            path: ["companyType"],
          });
        }
        if (!data.registrationNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Registration number is required if not linking to an existing company",
            path: ["registrationNumber"],
          });
        }
        if (!data.address) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Address is required if not linking to an existing company",
            path: ["address"],
          });
        }
      }
    }),
});

const pricedBoQItemSchema = z.object({
  boqItemId: objectId,
  unitRate: z.number().min(0),
});

const manualBoQItemSchema = z.object({
  description: z.string().min(1),
  unit: z.nativeEnum(UnitOfMeasurement),
  quantity: z.number().min(0),
  unitRate: z.number().min(0),
});

const safeJson = (val: unknown, field: string) => {
  if (typeof val !== "string") return val;
  try {
    return JSON.parse(val);
  } catch (error) {
    console.error(`Failed to parse JSON for ${field}:`, val);
    throw new Error(`Invalid JSON format for ${field}`);
  }
};

// Update the financial proposal preprocessing
const financialProposalPreprocess = (val: unknown) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch (error) {
      console.error("Failed to parse financialProposal:", val);
      throw new Error("Invalid JSON format for financialProposal");
    }
  }
  return val;
};

export const submitBidSchema = z.object({
  body: z.object({
    tenderId: objectId,
    technicalProposal: z.preprocess(
      (val) => safeJson(val, "technicalProposal"),
      z.object({
        methodology: z.string(),
        workPlan: z.string(),
        teamStructure: z.string(),
        equipmentList: z.string(),
        projectSchedule: z.string(),
        documents: z.array(technicalDocumentSchema).optional(),
      })
    ),
    financialProposal: z.preprocess(
      financialProposalPreprocess,
      z.object({
        totalBidPrice: z.preprocess(
          (val) => {
            if (typeof val === "string") {
              const parsed = parseFloat(val);
              if (isNaN(parsed)) {
                throw new Error("Invalid number format for totalBidPrice");
              }
              return parsed;
            }
            return val;
          },
          z.number().min(0, "Total bid price must be greater than or equal to 0")
        ),
        pricedBoqItems: z.array(pricedBoQItemSchema).optional(),
        manualBoqItems: z.array(manualBoQItemSchema).optional(),
        priceBreakdown: z.object({
          materials: z.preprocess(
            (val) => (typeof val === "string" ? parseFloat(val) : val),
            z.number().min(0)
          ),
          labor: z.preprocess(
            (val) => (typeof val === "string" ? parseFloat(val) : val),
            z.number().min(0)
          ),
          equipment: z.preprocess(
            (val) => (typeof val === "string" ? parseFloat(val) : val),
            z.number().min(0)
          ),
          overheads: z.preprocess(
            (val) => (typeof val === "string" ? parseFloat(val) : val),
            z.number().min(0)
          ),
          profit: z.preprocess(
            (val) => (typeof val === "string" ? parseFloat(val) : val),
            z.number().min(0)
          ),
        }),
        documents: z.array(financialDocumentSchema).optional(),
      }).superRefine((data, ctx) => {
        const hasPricedBoq = data.pricedBoqItems && data.pricedBoqItems.length > 0;
        const hasManualBoq = data.manualBoqItems && data.manualBoqItems.length > 0;
        const hasBoqDocument = data.documents?.some(doc => doc.documentType === 'BOQ');

        if (!hasPricedBoq && !hasManualBoq && !hasBoqDocument) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A bid must contain either a priced BoQ, manually entered BoQ items, or an uploaded BoQ document.",
            path: ["pricedBoqItems"],
          });
        }
      })
    ),
    otherDocuments: z.array(z.object({
      documentType: z.string(),
      description: z.string().optional(),
      filePath: z.string().optional(),
    })).optional(),
  }),
});

export const askClarificationSchema = z.object({
  body: z.object({
    tenderId: objectId,
    question: z.string().min(10),
    bidderId: objectId, // This should be derived from the authenticated user
  }),
});

export const answerClarificationSchema = z.object({
  body: z.object({
    response: z.string().min(10),
  }),
});

export const manageCommitteeMemberSchema = z.object({
  body: z.object({
    userId: z.string().min(1, "User ID or email is required"),
  }),
});