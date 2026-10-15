import { z } from "zod";
import { CompanyType, UserRole } from "@/types/enums";

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(2, "Company name must be at least 2 characters"),
    registrationNumber: z.string().min(1, "Registration number is required"),
    type: z.nativeEnum(CompanyType, {
      errorMap: () => ({
        message: "Invalid company type",
      }),
    }),
    address: z.string().min(1, "Address is required"),
    email: z.string().email("Invalid email address"),
    contactNumber: z
      .string()
      .min(10, "Contact number must be at least 10 characters"),
    website: z.preprocess(
  (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
  z.string().url().optional()
),
    experience: z
      .array(
        z.object({
          description: z.string(),
          years: z.number(),
          documentProof: z.string().optional(),
        })
      ),
    certifications: z
      .array(
        z.object({
          name: z.string(),
          issuingBody: z.string(),
          issueDate: z.string().datetime(),
          expiryDate: z.string().datetime(),
          documentProof: z.string().optional(),
        })
      )
  }),
});

export const updateCompanySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    registrationNumber: z.string().optional(),
    type: z.nativeEnum(CompanyType).optional(),
    address: z.string().optional(),
    email: z.string().email("Invalid email address").optional(),
    contactNumber: z.string().min(10).optional(),
    website: z.string().url().optional(),
    experience: z
      .array(
        z.object({
          description: z.string(),
          years: z.number().optional(),
          documentProof: z.string().optional(),
        })
      )
      .optional(),
    certifications: z
      .array(
        z.object({
          name: z.string(),
          issuingBody: z.string(),
          issueDate: z.string().datetime(),
          expiryDate: z.string().datetime().optional(),
          documentProof: z.string().optional(),
        })
      )
      .optional(),
  }),
});

export const inviteMemberSchema = z.object({
  body: z.object({
    companyId: z
      .string()
      .regex(
        /^[0-9a-fA-F]{24}$/,
        "Company ID must be a valid MongoDB ObjectId"
      ),

    email: z.string().email("Please provide a valid email address"),

    role: z.nativeEnum(UserRole, {
      errorMap: () => ({
        message: "Invalid company role",
      }),
    }),
  }),
});

export const updateMemberRoleSchema = z.object({
  // Add this schema
  body: z.object({
    role: z.nativeEnum(UserRole),
  }),
});
