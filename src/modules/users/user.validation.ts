import { Department, UserRole } from "@/types/enums";
import { z } from "zod";

export const updateUserSchema = z.object({
  body: z.object({
    fullName: z.string().min(2).optional(),
    companyName: z.string().min(2).optional(),
    contactNumber: z.string().min(10).optional(),
    department: z.nativeEnum(Department).optional(),
    role: z.nativeEnum(UserRole).optional(),
    profilePicture: z.string().url().optional(),
  }),
});
