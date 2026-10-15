import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { successResponse } from "../../../utils/response";
import { materialUsageService } from "../service/materialUsage.service";
import { logger } from "../../../utils/logger";
import mongoose from "mongoose";

export class MaterialUsageController {
  async recordMaterialUsage(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const usage = await materialUsageService.recordMaterialUsage(
        req.body,
        req.user.id
      );
      res
        .status(201)
        .json(successResponse(usage, "Material usage recorded successfully"));
    } catch (error) {
      logger.error("Error recording material usage:", error);
      next(error);
    }
  }

  async getMaterialUsage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const { startDate, endDate } = req.query;
      const usage = await materialUsageService.getMaterialUsage(
        projectId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(successResponse(usage, "Material usage retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving material usage:", error);
      next(error);
    }
  }

  async generateMaterialUsageReport(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const { startDate, endDate, sendEmail } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
        return;
      }

      const report = await materialUsageService.generateMaterialUsageReport(
        projectId,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      // Optionally send the report by email
      if (sendEmail === "true" && req.user) {
        // Get project owner
        const project = await mongoose
          .model("Project")
          .findById(projectId)
          .populate("createdBy", "email firstName lastName fullName");

        if (project && project.createdBy) {
          await materialUsageService.sendMaterialUsageReport(
            project.createdBy,
            report,
            "Custom"
          );
        }
      }

      res.json(
        successResponse(report, "Material usage report generated successfully")
      );
    } catch (error) {
      logger.error("Error generating material usage report:", error);
      next(error);
    }
  }
}

export const materialUsageController = new MaterialUsageController();
