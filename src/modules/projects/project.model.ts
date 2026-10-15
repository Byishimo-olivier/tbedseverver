import { ProjectStatus, ProjectType, UserRole } from "@/types/enums";
import mongoose, { Schema, Document } from "mongoose";

export interface IProjectMember{
  user: mongoose.Types.ObjectId;
  role: UserRole;
}

export interface IProject extends Document {
  name: string;
  projectDescription: string;
  projectCode: string;
  status: ProjectStatus;
  type: ProjectType;
  team: IProjectMember[];
  documents: { filePath: string; description: string }[];
  progress: number;
  budget: number;
  companyId?: mongoose.Types.ObjectId; // Optional field for company association
  lastReportSentAt?: {
    daily?: Date;
    weekly?: Date;
    monthly?: Date;
  };
  lastProgressReportSentAt: {
    daily: { type: Date };
    weekly: { type: Date };
    monthly: { type: Date };
  };
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    projectCode: { type: String, unique: true },
    projectDescription: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      required: true,
    },
    type: { type: String, enum: Object.values(ProjectType), required: true },
    team: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: false },
        role: { type: String, enum: Object.values(UserRole), required: false },
      }
    ],
    documents: [{ filePath: { type: String }, description: { type: String } }],
    progress: { type: Number, default: 0 },
    budget: { type: Number, required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    lastReportSentAt: {
      daily: { type: Date },
      weekly: { type: Date },
      monthly: { type: Date },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate unique project code
projectSchema.pre("save", async function (next) {
  // Only generate projectCode if it doesn't exist
  if (!this.projectCode) {
    // Get project type acronym
    const typePrefix = this.type === "Capital" ? "CAP" : "MNT";

    // Get current date components
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");

    // Get count of existing projects
    const projectCount = await mongoose.model("Project").countDocuments();
    const sequence = (projectCount + 1).toString().padStart(4, "0");

    // Generate a random suffix
    const randomSuffix = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    // Create candidate project code
    let candidateCode = `PROJ-${typePrefix}-${year}${month}-${sequence}-${randomSuffix}`;

    // Check if the code already exists
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (codeExists && attempts < maxAttempts) {
      const existingProject = await mongoose
        .model("Project")
        .findOne({ projectCode: candidateCode });

      if (!existingProject) {
        codeExists = false;
      } else {
        // Generate a new random suffix and try again
        const newRandomSuffix = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");

        candidateCode = `PROJ-${typePrefix}-${year}${month}-${sequence}-${newRandomSuffix}`;
        attempts++;
      }
    }

    this.projectCode = candidateCode;
  }

  next();
});

export const Project = mongoose.model<IProject>("Project", projectSchema);
