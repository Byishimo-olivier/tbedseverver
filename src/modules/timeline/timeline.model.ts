import {
  ProjectStage,
  ProjectStageStatus,
  ReportingPeriod,
} from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";


export interface IProgressDocument {
  filePath: string;
  description: string;
  uploadedAt: Date;
}

export interface IProjectStage extends Document {
  projectId: mongoose.Types.ObjectId;
  stage: ProjectStage;
  startDate: Date;
  endDate: Date;
  status: ProjectStageStatus;
  alertSettings: {
    email: boolean;
    sms: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IProgressTracking extends Document {
  projectId: mongoose.Types.ObjectId;
  reportingPeriod: ReportingPeriod;
  stageProgress: {
    stage: ProjectStage;
    progressPercentage: number;
  }[];
  comments: string;
  supportingDocumentation: IProgressDocument[];
  delayDocumentation: IProgressDocument[];
  correctiveActions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const progressDocumentSchema = new Schema({
  filePath: { type: String, required: false },
  description: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const projectStageSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  stage: { type: String, enum: Object.values(ProjectStage), required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: Object.values(ProjectStageStatus),
    required: true,
  },
  alertSettings: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
  },
},{
  timestamps: true,
});

const progressTrackingSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  reportingPeriod: {
    type: String,
    enum: Object.values(ReportingPeriod),
    required: true,
  },
  stageProgress: [
    {
      stage: {
        type: String,
        enum: Object.values(ProjectStage),
        required: true,
      },
      progressPercentage: { type: Number, required: true },
    },
  ],
  comments: { type: String },
  supportingDocumentation: [progressDocumentSchema],
  delayDocumentation: [progressDocumentSchema],
  correctiveActions: [{ type: String }],
},{
  timestamps: true,
});

export const ProjectStageModel = mongoose.model<IProjectStage>(
  "ProjectStage",
  projectStageSchema
);
export const ProgressTracking = mongoose.model<IProgressTracking>(
  "ProgressTracking",
  progressTrackingSchema
);
