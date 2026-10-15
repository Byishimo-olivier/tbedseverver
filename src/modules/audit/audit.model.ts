import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId: string;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const auditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true, enum: ["CREATE", "UPDATE", "DELETE", "ACCESS"] },
  resource: { type: String, required: true },
  resourceId: { type: String, required: true },
  previousData: { type: Schema.Types.Mixed },
  newData: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Prevent tampering: make audit logs immutable
auditLogSchema.pre("updateOne", function () { throw new Error("Audit logs are immutable"); });
auditLogSchema.pre("findOneAndUpdate", function () { throw new Error("Audit logs are immutable"); });
auditLogSchema.pre("findOneAndDelete", function () { throw new Error("Audit logs are immutable"); });

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);