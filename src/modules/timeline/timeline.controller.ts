import { Request, Response, NextFunction } from "express";
import { ProjectStageModel, ProgressTracking } from "./timeline.model";
import { Project } from "../projects/project.model";
import { User } from "../users/user.model";
import { successResponse } from "../../utils/response";
import { notificationService } from "../notifications/notifcation.service";
import { AppError, ErrorType } from "../../utils/exceptions";
import path from "path";
import { logger } from "../../utils/logger";
import fs from "fs";
import mongoose from "mongoose";
import { uploadService } from "../file/upload.service";
import { AuthRequest } from "@/middleware/auth.middleware";

export class TimelineController {
  constructor() {
    // Bind all methods to maintain 'this' context
    this.createProjectStage = this.createProjectStage.bind(this);
    this.createProgressTracking = this.createProgressTracking.bind(this);
    this.getProjectStages = this.getProjectStages.bind(this);
    this.getProgressTracking = this.getProgressTracking.bind(this);
    this.updateProjectStage = this.updateProjectStage.bind(this);
    this.updateProgressTracking = this.updateProgressTracking.bind(this);
    this.deleteProjectStage = this.deleteProjectStage.bind(this);
    this.deleteProgressTracking = this.deleteProgressTracking.bind(this);
    this.loadEmailTemplate = this.loadEmailTemplate.bind(this);
    this.formatSMSMessage = this.formatSMSMessage.bind(this);
  }

  /**
   * Parse indexed form fields like supportingDocumentation[0][description] into an array
   */
  private parseIndexedFields(body: any, fieldName: string): { description: string }[] {
    const result: { description: string }[] = [];
    const regex = new RegExp(`^${fieldName}\\[(\\d+)\\]\\[(\\w+)\\]$`);
    
    // Find all matching fields and group by index
    const indexedData: Record<number, Record<string, string>> = {};
    
    for (const key of Object.keys(body)) {
      const match = key.match(regex);
      if (match) {
        const index = parseInt(match[1]);
        const prop = match[2];
        if (!indexedData[index]) {
          indexedData[index] = {};
        }
        indexedData[index][prop] = body[key];
      }
    }
    
    // Convert to array, sorted by index
    const indices = Object.keys(indexedData).map(Number).sort((a, b) => a - b);
    for (const index of indices) {
      result.push({
        description: indexedData[index].description || '',
      });
    }
    
    return result;
  }

  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid ID format", 400, ErrorType.VALIDATION);
    }
  }

  private async loadEmailTemplate(
    templateName: string,
    replacements: { [key: string]: string }
  ): Promise<string> {
    const templatePath = path.join(
      __dirname,
      "../../templates",
      `${templateName}.html`
    );
    let template = fs.readFileSync(templatePath, "utf8");

    for (const key in replacements) {
      template = template.replace(
        new RegExp(`{{${key}}}`, "g"),
        replacements[key]
      );
    }

    return template;
  }

  private formatSMSMessage(
    projectName: string,
    stageName: string,
    status: string
  ): string {
    return (
      `🏗️ Project Update\n\n` +
      `Project: ${projectName}\n` +
      `Stage: ${stageName}\n` +
      `Status: ${status}\n\n` +
      `View details at: ${process.env.FRONTEND_URL}/projects`
    );
  }

  // Convert to arrow function to preserve 'this' context
  public createProjectStage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const projectStage = new ProjectStageModel(req.body);
      await projectStage.save();

      // Get project and owner details
      const project = await Project.findById(projectStage.projectId);
      if (!project) {
        throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
      }

      const owner = await User.findById(project.createdBy);
      console.log(owner);
      if (!owner) {
        throw new AppError("Project owner not found", 404, ErrorType.NOT_FOUND);
      }

      // Send notifications if alert settings are enabled
      if (projectStage.alertSettings.email && owner.email) {
        const emailTemplate = await this.loadEmailTemplate(
          "project-stage-alert",
          {
            logoUrl: `${process.env.FRONTEND_URL}/assets/logo.png`,
            ownerName: owner.fullName,
            projectName: project.name,
            stageName: projectStage.stage,
            stageDescription: `The ${projectStage.stage} stage has been created for your project.`,
            startDate: new Date(projectStage.startDate).toLocaleDateString(),
            endDate: new Date(projectStage.endDate).toLocaleDateString(),
            status: projectStage.status,
            projectUrl: `${process.env.FRONTEND_URL}/projects/${project._id}`,
            year: new Date().getFullYear().toString(),
          }
        );

        await notificationService.sendEmail(
          owner.email,
          "Project Stage Update",
          emailTemplate
        );
      }

      if (projectStage.alertSettings.sms && owner.contactNumber) {
        try {
          const smsMessage = this.formatSMSMessage(
            project.name,
            projectStage.stage,
            projectStage.status
          );

          await notificationService.sendSMS(owner.contactNumber, smsMessage);
          logger.info(
            `SMS notification sent to ${owner.contactNumber} for project stage ${projectStage.stage}`
          );
        } catch (error) {
          logger.error("Failed to send SMS notification:", error);
          // Don't throw here as the stage was already created
        }
      } else {
        logger.info(
          `SMS notification skipped: ${
            !projectStage.alertSettings.sms
              ? "SMS alerts disabled"
              : "No contact number"
          }`
        );
      }

      res
        .status(201)
        .json(
          successResponse(projectStage, "Project stage created successfully")
        );
    } catch (error) {
      next(error);
    }
  };

  public createProgressTracking = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const progressData = { ...req.body };

      // Parse JSON strings if needed
      if (typeof progressData.stageProgress === "string") {
        try {
          progressData.stageProgress = JSON.parse(progressData.stageProgress);
        } catch {
          progressData.stageProgress = [];
        }
      }

      // Handle supportingDocumentation - could be JSON string or indexed fields
      if (typeof progressData.supportingDocumentation === "string") {
        try {
          progressData.supportingDocumentation = JSON.parse(
            progressData.supportingDocumentation
          );
        } catch {
          progressData.supportingDocumentation = [];
        }
      } else if (!Array.isArray(progressData.supportingDocumentation)) {
        progressData.supportingDocumentation = this.parseIndexedFields(req.body, 'supportingDocumentation');
      }

      // Handle delayDocumentation - could be JSON string or indexed fields
      if (typeof progressData.delayDocumentation === "string") {
        try {
          progressData.delayDocumentation = JSON.parse(
            progressData.delayDocumentation
          );
        } catch {
          progressData.delayDocumentation = [];
        }
      } else if (!Array.isArray(progressData.delayDocumentation)) {
        progressData.delayDocumentation = this.parseIndexedFields(req.body, 'delayDocumentation');
      }

      if (typeof progressData.correctiveActions === "string") {
        try {
          progressData.correctiveActions = JSON.parse(
            progressData.correctiveActions
          );
        } catch {
          progressData.correctiveActions = [];
        }
      }

      // Initialize arrays if not present
      const rawSupportingDocs = progressData.supportingDocumentation || [];
      const rawDelayDocs = progressData.delayDocumentation || [];

      // Log for debugging
      logger.info("Parsed supportingDocumentation:", JSON.stringify(rawSupportingDocs));
      logger.info("Parsed delayDocumentation:", JSON.stringify(rawDelayDocs));

      // Map files by their field names
      const supportingFilesByIndex: Record<number, Express.Multer.File> = {};
      const delayFilesByIndex: Record<number, Express.Multer.File> = {};

      files.forEach((file) => {
        const supportingMatch = file.fieldname.match(
          /supportingDocumentation\[(\d+)\]\[file\]/
        );
        if (supportingMatch) {
          supportingFilesByIndex[parseInt(supportingMatch[1])] = file;
        }

        const delayMatch = file.fieldname.match(
          /delayDocumentation\[(\d+)\]\[file\]/
        );
        if (delayMatch) {
          delayFilesByIndex[parseInt(delayMatch[1])] = file;
        }
      });

      // Process supporting documentation uploads - iterate by file indices
      const processedSupportingDocs = [];
      const supportingIndices = Object.keys(supportingFilesByIndex).map(Number);
      
      for (const i of supportingIndices) {
        const file = supportingFilesByIndex[i];
        const doc = rawSupportingDocs[i] || {};
        const description = doc.description || `Supporting document ${i + 1}`;

        const upload = await uploadService.saveFileDetails(
          req.user,
          file,
          description,
          progressData.projectId
        );
        processedSupportingDocs.push({
          filePath: upload.filePath,
          description: description,
          uploadedAt: new Date(),
        });
      }

      // Process delay documentation uploads - iterate by file indices
      const processedDelayDocs = [];
      const delayIndices = Object.keys(delayFilesByIndex).map(Number);
      
      for (const i of delayIndices) {
        const file = delayFilesByIndex[i];
        const doc = rawDelayDocs[i] || {};
        const description = doc.description || `Delay document ${i + 1}`;

        const upload = await uploadService.saveFileDetails(
          req.user,
          file,
          description,
          progressData.projectId
        );
        processedDelayDocs.push({
          filePath: upload.filePath,
          description: description,
          uploadedAt: new Date(),
        });
      }

      // Replace with processed documents
      progressData.supportingDocumentation = processedSupportingDocs;
      progressData.delayDocumentation = processedDelayDocs;

      const progressTracking = new ProgressTracking(progressData);
      await progressTracking.save();

      // Get project for notification
      const project = await Project.findById(progressData.projectId);
      if (project) {
        await this.checkAndSendProgressReport(project, progressTracking);
      }

      res
        .status(201)
        .json(
          successResponse(
            progressTracking,
            "Progress tracking created successfully"
          )
        );
    } catch (error) {
      logger.error("Error creating progress tracking:", error);
      next(error);
    }
  };

  async updateProgressTracking(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const files = (req.files as Express.Multer.File[]) || [];
      const updateData = { ...req.body };

      // Find existing progress tracking
      const existingProgress = await ProgressTracking.findById(id);
      if (!existingProgress) {
        throw new AppError(
          "Progress tracking not found",
          404,
          ErrorType.NOT_FOUND
        );
      }

      // Parse JSON strings if needed
      if (typeof updateData.stageProgress === "string") {
        try {
          updateData.stageProgress = JSON.parse(updateData.stageProgress);
        } catch {
          delete updateData.stageProgress;
        }
      }

      // Handle supportingDocumentation - could be JSON string or indexed fields
      if (typeof updateData.supportingDocumentation === "string") {
        try {
          updateData.supportingDocumentation = JSON.parse(
            updateData.supportingDocumentation
          );
        } catch {
          updateData.supportingDocumentation = [];
        }
      } else if (!Array.isArray(updateData.supportingDocumentation)) {
        updateData.supportingDocumentation = this.parseIndexedFields(req.body, 'supportingDocumentation');
      }

      // Handle delayDocumentation - could be JSON string or indexed fields
      if (typeof updateData.delayDocumentation === "string") {
        try {
          updateData.delayDocumentation = JSON.parse(
            updateData.delayDocumentation
          );
        } catch {
          updateData.delayDocumentation = [];
        }
      } else if (!Array.isArray(updateData.delayDocumentation)) {
        updateData.delayDocumentation = this.parseIndexedFields(req.body, 'delayDocumentation');
      }

      if (typeof updateData.correctiveActions === "string") {
        try {
          updateData.correctiveActions = JSON.parse(
            updateData.correctiveActions
          );
        } catch {
          delete updateData.correctiveActions;
        }
      }

      // Initialize arrays if not present
      updateData.supportingDocumentation =
        updateData.supportingDocumentation || [];
      updateData.delayDocumentation = updateData.delayDocumentation || [];

      // Log for debugging
      logger.info("Parsed supportingDocumentation:", JSON.stringify(updateData.supportingDocumentation));
      logger.info("Parsed delayDocumentation:", JSON.stringify(updateData.delayDocumentation));

      // Map files by their field names
      const supportingFilesByIndex: Record<number, Express.Multer.File> = {};
      const delayFilesByIndex: Record<number, Express.Multer.File> = {};

      files.forEach((file) => {
        // Match supporting documentation files
        const supportingMatch = file.fieldname.match(
          /supportingDocumentation\[(\d+)\]\[file\]/
        );
        if (supportingMatch) {
          supportingFilesByIndex[parseInt(supportingMatch[1])] = file;
        }

        // Match delay documentation files
        const delayMatch = file.fieldname.match(
          /delayDocumentation\[(\d+)\]\[file\]/
        );
        if (delayMatch) {
          delayFilesByIndex[parseInt(delayMatch[1])] = file;
        }
      });

      // Process new supporting documentation uploads - only add if file exists
      const newSupportingDocs = [];
      const supportingIndices = Object.keys(supportingFilesByIndex).map(Number);
      
      for (const i of supportingIndices) {
        const file = supportingFilesByIndex[i];
        const doc = updateData.supportingDocumentation[i] || {};
        const description = doc.description || `Supporting document ${i + 1}`;

        if (file) {
          const upload = await uploadService.saveFileDetails(
            req.user,
            file,
            description,
            existingProgress.projectId.toString()
          );
          newSupportingDocs.push({
            filePath: upload.filePath,
            description: description,
            uploadedAt: new Date(),
          });
        }
      }

      // Process new delay documentation uploads - only add if file exists
      const newDelayDocs = [];
      const delayIndices = Object.keys(delayFilesByIndex).map(Number);
      
      for (const i of delayIndices) {
        const file = delayFilesByIndex[i];
        const doc = updateData.delayDocumentation[i] || {};
        const description = doc.description || `Delay document ${i + 1}`;

        if (file) {
          const upload = await uploadService.saveFileDetails(
            req.user,
            file,
            description,
            existingProgress.projectId.toString()
          );
          newDelayDocs.push({
            filePath: upload.filePath,
            description: description,
            uploadedAt: new Date(),
          });
        }
      }

      // Append new documents to existing ones
      if (newSupportingDocs.length > 0) {
        existingProgress.supportingDocumentation = [
          ...existingProgress.supportingDocumentation,
          ...newSupportingDocs,
        ];
      }

      if (newDelayDocs.length > 0) {
        existingProgress.delayDocumentation = [
          ...existingProgress.delayDocumentation,
          ...newDelayDocs,
        ];
      }

      // Update other fields
      if (updateData.stageProgress) {
        existingProgress.stageProgress = updateData.stageProgress;
      }
      if (updateData.comments !== undefined) {
        existingProgress.comments = updateData.comments;
      }
      if (updateData.correctiveActions) {
        existingProgress.correctiveActions = updateData.correctiveActions;
      }
      if (updateData.reportingPeriod) {
        existingProgress.reportingPeriod = updateData.reportingPeriod;
      }

      await existingProgress.save();

      // Get project for notification
      const project = await Project.findById(existingProgress.projectId);
      if (project) {
        await this.checkAndSendProgressReport(project, existingProgress);
      }

      res.json(
        successResponse(
          existingProgress,
          "Progress tracking updated successfully"
        )
      );
    } catch (error) {
      logger.error("Error updating progress tracking:", error);
      next(error);
    }
  }

  async checkAndSendProgressReport(
    project: any,
    progressTracking: any
  ): Promise<void> {
    try {
      const owner = await User.findById(project.createdBy);
      if (!owner || !owner.email) return;

      const now = new Date();
      let shouldSendReport = false;
      const reportingPeriod = progressTracking.reportingPeriod;
      const lastSent = project.lastProgressReportSentAt || {};

      if (reportingPeriod === "daily") {
        const today = new Date(now.setHours(0, 0, 0, 0));
        if (!lastSent.daily || lastSent.daily < today) {
          shouldSendReport = true;
          await Project.findByIdAndUpdate(project._id, {
            "lastProgressReportSentAt.daily": now,
          });
        }
      } else if (reportingPeriod === "weekly") {
        const dayOfWeek = now.getDay();
        if (
          dayOfWeek === 5 &&
          (!lastSent.weekly ||
            lastSent.weekly <
              new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
        ) {
          // Friday
          shouldSendReport = true;
          await Project.findByIdAndUpdate(project._id, {
            "lastProgressReportSentAt.weekly": now,
          });
        }
      } else if (reportingPeriod === "monthly") {
        const lastDayOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).getDate();
        if (
          now.getDate() === lastDayOfMonth &&
          (!lastSent.monthly ||
            lastSent.monthly < new Date(now.getFullYear(), now.getMonth(), 1))
        ) {
          shouldSendReport = true;
          await Project.findByIdAndUpdate(project._id, {
            "lastProgressReportSentAt.monthly": now,
          });
        }
      }

      if (shouldSendReport) {
        const emailTemplate = await this.loadEmailTemplate("progress-report", {
          ownerName: owner.fullName,
          projectName: project.name,
          reportingPeriod:
            reportingPeriod.charAt(0).toUpperCase() + reportingPeriod.slice(1),
          projectProgress: project.progress.toString(),
          comments: progressTracking.comments || "No new comments.",
          projectUrl: `${process.env.FRONTEND_URL}/projects/${project._id}/timeline`,
          year: new Date().getFullYear().toString(),
        });

        await notificationService.sendEmail(
          owner.email,
          `Project Progress Report: ${project.name}`,
          emailTemplate
        );
        logger.info(`Progress report sent for project ${project.name}`);
      }
    } catch (error) {
      logger.error("Failed to send progress report:", error);
    }
  }

  async getProjectStages(req: Request, res: Response, next: NextFunction) {
    try {
      this.validateObjectId(req.params.projectId);

      const stages = await ProjectStageModel.find({
        projectId: req.params.projectId,
      }).sort({ startDate: 1 });

      res
        .status(200)
        .json(successResponse(stages, "Project stages fetched successfully"));
    } catch (error) {
      next(error);
    }
  }

  async getProgressTracking(req: Request, res: Response, next: NextFunction) {
    try {
      this.validateObjectId(req.params.projectId);

      const progress = await ProgressTracking.find({
        projectId: req.params.projectId,
      }).sort({ createdAt: -1 });

      res
        .status(200)
        .json(
          successResponse(progress, "Progress tracking fetched successfully")
        );
    } catch (error) {
      next(error);
    }
  }

  async updateProjectStage(req: Request, res: Response, next: NextFunction) {
    try {
      this.validateObjectId(req.params.id);

      const projectStage = await ProjectStageModel.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );

      if (!projectStage) {
        throw new AppError("Project stage not found", 404, ErrorType.NOT_FOUND);
      }

      res
        .status(200)
        .json(
          successResponse(projectStage, "Project stage updated successfully")
        );
    } catch (error) {
      next(error);
    }
  }

  async deleteProjectStage(req: Request, res: Response, next: NextFunction) {
    try {
      this.validateObjectId(req.params.id);

      const projectStage = await ProjectStageModel.findByIdAndDelete(
        req.params.id
      );
      if (!projectStage) {
        throw new AppError("Project stage not found", 404, ErrorType.NOT_FOUND);
      }

      res
        .status(200)
        .json(successResponse(null, "Project stage deleted successfully"));
    } catch (error) {
      next(error);
    }
  }

  async deleteProgressTracking(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      this.validateObjectId(req.params.id);

      const progressTracking = await ProgressTracking.findByIdAndDelete(
        req.params.id
      );
      if (!progressTracking) {
        throw new AppError(
          "Progress tracking not found",
          404,
          ErrorType.NOT_FOUND
        );
      }

      res
        .status(200)
        .json(successResponse(null, "Progress tracking deleted successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export const timelineController = new TimelineController();
