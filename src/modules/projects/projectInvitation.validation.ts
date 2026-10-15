import { z } from "zod";
import { UserRole } from "@/types/enums";

const INVITABLE_ROLES = [
  UserRole.PROJECT_MANAGER,
  UserRole.SITE_ENGINEER,
  UserRole.PROCUREMENT_OFFICER,
  UserRole.FINANCE_OFFICER,
  UserRole.QA_QC_OFFICER,
  UserRole.HSE_OFFICER,
] as const;

export const createInvitationSchema = z.object({
  body: z.object({
    projectId: z
        .string()
        .regex(
            /^[0-9a-fA-F]{24}$/,
            "Project ID must be a valid MongoDB ObjectId"
        ),

    email: z.string().email("Please provide a valid email address"),

    role: z
        .nativeEnum(UserRole, {
          errorMap: () => ({
            message: `Role must be one of: ${INVITABLE_ROLES.join(", ")}`,
          }),
        })
        .refine(
            (val) => INVITABLE_ROLES.includes(val as any),
            {
              message: `Role must be one of: ${INVITABLE_ROLES.join(", ")}. Owner cannot be invited as they are the project creator.`,
            }
        ),

    // Optional: Add a message for the invitation
    message: z.string().max(500).optional(),

    // Optional: Set permissions override (for custom permissions beyond role defaults)
    customPermissions: z.array(z.string()).optional(),
  }),
});

// Type inference from the schema
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// Helper to get human-readable role names for error messages
export const getRoleDisplayName = (role: UserRole): string => {
  const roleMap: Record<UserRole, string> = {
    [UserRole.OWNER]: "Owner",
    [UserRole.PROJECT_MANAGER]: "Project Manager",
    [UserRole.SITE_ENGINEER]: "Site Engineer",
    [UserRole.PROCUREMENT_OFFICER]: "Procurement Officer",
    [UserRole.FINANCE_OFFICER]: "Finance Officer",
    [UserRole.QA_QC_OFFICER]: "QA/QC Officer",
    [UserRole.HSE_OFFICER]: "HSE Officer",
  };
  return roleMap[role] || role;
};
