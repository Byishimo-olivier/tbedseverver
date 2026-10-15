import mongoose, { Document, Schema } from "mongoose";
import { UserRole } from "@/types/enums";

export interface IProjectInvitation extends Document {
  projectId: mongoose.Types.ObjectId;
  email: string;
  role: UserRole;
  token: string;
  expired: boolean;
  accepted: boolean;
  createdAt: Date;
  expiresAt: Date;
}

const projectInvitationSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  email: { type: String, required: true },
  role: { type: String, required: true, enum: Object.values(UserRole) },
  token: { type: String, required: true },
  expired: { type: Boolean, default: false },
  accepted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// Create a unique index on projectId and email
projectInvitationSchema.index({ projectId: 1, email: 1 }, { unique: true });

export const ProjectInvitation = mongoose.model<IProjectInvitation>(
  "ProjectInvitation",
  projectInvitationSchema
);
