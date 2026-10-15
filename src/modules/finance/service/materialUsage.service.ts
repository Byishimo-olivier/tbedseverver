import { IMaterialUsage, MaterialUsage } from "../models/materialUsage.model";
import { AppError, ErrorType } from "../../../utils/exceptions";
import mongoose from "mongoose";
import { inventoryService } from "./inventory.service";
import { Project } from "../../projects/project.model";
import { notificationService } from "../../notifications/notifcation.service";
import { InventoryItem } from "../models/inventory.model";
import { logger } from "@/utils/logger";
import { ReportingPeriod } from "@/types/enums";

export class MaterialUsageService {
  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid ID format", 400, ErrorType.VALIDATION);
    }
  }

  async getMaterialUsage(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IMaterialUsage[]> {
    this.validateObjectId(projectId);

    const query: any = { projectId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    return MaterialUsage.find(query)
      .populate({
        path: "items.materialId",
        model: "InventoryItem",
        select: "name materialCode unit category unitPrice",
      })
      .sort({ date: -1 });
  }

  async generateMaterialUsageReport(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    this.validateObjectId(projectId);

    // Get project details
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    // Get all material usage for this period
    const usageRecords = await MaterialUsage.find({
      projectId,
      date: { $gte: startDate, $lte: endDate },
    }).populate({
      path: "items.materialId",
      model: "InventoryItem",
      select: "name materialCode unit category unitPrice",
    });

    // Aggregate material usage by material
    const materialsMap = new Map();
    let totalCost = 0;

    usageRecords.forEach((record) => {
      record.items.forEach((item) => {
        const materialId = item.materialId._id.toString();
        const material = item.materialId as any;
        const cost = item.quantity * material.unitPrice;
        totalCost += cost;

        if (materialsMap.has(materialId)) {
          const existingItem = materialsMap.get(materialId);
          existingItem.totalQuantity += item.quantity;
          existingItem.totalCost += cost;
          existingItem.usageLocations.add(item.location);
          existingItem.purposes.add(item.purpose);
        } else {
          materialsMap.set(materialId, {
            materialId: materialId,
            name: material.name,
            materialCode: material.materialCode,
            unit: material.unit,
            category: material.category,
            unitPrice: material.unitPrice,
            totalQuantity: item.quantity,
            totalCost: cost,
            usageLocations: new Set([item.location]),
            purposes: new Set([item.purpose]),
          });
        }
      });
    });

    // Convert sets to arrays for JSON compatibility
    const materials = Array.from(materialsMap.values()).map((item) => ({
      ...item,
      usageLocations: Array.from(item.usageLocations),
      purposes: Array.from(item.purposes),
    }));

    // Sort by total cost (highest first)
    materials.sort((a, b) => b.totalCost - a.totalCost);

    return {
      project: {
        id: project._id,
        name: project.name,
        code: project.projectCode,
      },
      reportPeriod: {
        startDate,
        endDate,
      },
      summary: {
        totalMaterials: materials.length,
        totalUsageRecords: usageRecords.length,
        totalCost,
      },
      materials,
    };
  }

  async checkAndSendReportingPeriodReport(
    projectId: string,
    reportingPeriod: string,
    usageDate: Date
  ): Promise<void> {
    try {
      // Get project details
      const project = await Project.findById(projectId).populate({
        path: "createdBy",
        model: "User",
        select: "email fullName contactNumber",
      });

      if (!project) return;

      const now = new Date();
      let shouldSendReport = false;
      let startDate: Date;
      let endDate: Date = new Date(usageDate);

      // Set end date to the end of the day
      endDate.setHours(23, 59, 59, 999);

      // Determine if we need to send a report based on the reporting period
      if (reportingPeriod === ReportingPeriod.DAILY) {
        const today = new Date(now.setHours(0, 0, 0, 0));
        if (
          now.getHours() >= 17 &&
          (!project.lastReportSentAt?.daily ||
            project.lastReportSentAt.daily < today)
        ) {
          startDate = new Date(usageDate);
          startDate.setHours(0, 0, 0, 0);
          shouldSendReport = true;
          await Project.findByIdAndUpdate(projectId, {
            "lastReportSentAt.daily": now,
          });
        }
      } else if (reportingPeriod === ReportingPeriod.WEEKLY) {
        // Check if this is the end of the week (Friday)
        const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
        if (
          dayOfWeek === 5 && // 5 = Friday
          (!project.lastReportSentAt?.weekly ||
            project.lastReportSentAt?.weekly <
              new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))
        ) {
          // Friday
          // Report for this week
          startDate = new Date(usageDate);
          startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Start of week (Monday)
          startDate.setHours(0, 0, 0, 0);
          shouldSendReport = true;
          await Project.findByIdAndUpdate(projectId, {
            "lastReportSentAt.weekly": now,
          });
        }
      } else if (reportingPeriod === ReportingPeriod.MONTHLY) {
        // Check if this is the end of the month
        const lastDayOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0
        ).getDate();
        if (
          now.getDate() === lastDayOfMonth &&
          (!project.lastReportSentAt?.monthly ||
            project.lastReportSentAt?.monthly <
              new Date(now.getFullYear(), now.getMonth(), 1))
        ) {
          // Report for this month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          shouldSendReport = true;
          await Project.findByIdAndUpdate(projectId, {
            "lastReportSentAt.monthly": now,
          });
        }
      }

      if (
        shouldSendReport &&
        project.createdBy &&
        typeof project.createdBy === "object" &&
        "email" in project.createdBy
      ) {
        // Generate report
        startDate = startDate!;
        const report = await this.generateMaterialUsageReport(
          projectId,
          startDate,
          endDate
        );

        // Get recipient(s)
        const projectOwner = project.createdBy;

        // Send email with report
        await this.sendMaterialUsageReport(
          projectOwner,
          report,
          reportingPeriod
        );

        logger.info(
          `Material usage report sent for project ${project.name}, period: ${reportingPeriod}`
        );
      }
    } catch (error) {
      logger.error("Error sending material usage report:", error);
    }
  }

  async sendMaterialUsageReport(
    recipient: any,
    report: any,
    period: string
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const currentYear = new Date().getFullYear();

    // Format dates for display
    const startDateFormatted = new Date(
      report.reportPeriod.startDate
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const endDateFormatted = new Date(
      report.reportPeriod.endDate
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Create HTML rows for materials
    const materialRows = report.materials
      .map(
        (material: any, index: number) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${material.materialCode}</strong><br>${material.name}</td>
        <td>${material.totalQuantity} ${material.unit}</td>
        <td>$${material.unitPrice.toFixed(2)}</td>
        <td>$${material.totalCost.toFixed(2)}</td>
        <td>${material.usageLocations.join(", ")}</td>
      </tr>
    `
      )
      .join("");

    // Create template parameters
    const templateParams = {
      logoUrl: `${frontendUrl}/images/logo.png`,
      recipientName: recipient.fullName,
      projectName: report.project.name,
      projectCode: report.project.code,
      reportingPeriod: period,
      startDate: startDateFormatted,
      endDate: endDateFormatted,
      totalMaterials: report.summary.totalMaterials,
      totalUsageRecords: report.summary.totalUsageRecords,
      totalCost: report.summary.totalCost.toFixed(2),
      materialRows: materialRows,
      projectUrl: `${frontendUrl}/projects/${report.project.id}`,
      year: currentYear.toString(),
    };

    const periodCapitalized =
      period.charAt(0).toUpperCase() + period.slice(1).toLowerCase();

    // Send email with the report
    await notificationService.sendTemplateEmail(
      recipient.email,
      `${periodCapitalized} Material Usage Report - ${report.project.name}`,
      "material-usage-report",
      templateParams
    );
  }

  async recordMaterialUsage(
    usageData: Partial<IMaterialUsage>,
    userId: string
  ): Promise<IMaterialUsage> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Validate project exists
      if (!usageData.projectId) {
        throw new AppError("Project ID is required", 400, ErrorType.VALIDATION);
      }
      this.validateObjectId(usageData.projectId.toString());
      const project = await Project.findById(usageData.projectId);
      if (!project) {
        throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
      }

      // Create usage record
      const usage = new MaterialUsage({
        ...usageData,
        createdBy: userId,
        updatedBy: userId,
      });

      // Validate and update inventory stock levels
      const itemIds = (usageData.items || []).map((item) => item.materialId);
      const inventoryItems = await InventoryItem.find({
        _id: { $in: itemIds },
      });
      const inventoryItemMap = new Map(
        inventoryItems.map((i) => [i._id.toString(), i])
      );

      for (const item of usageData.items || []) {
        const inventoryItem = inventoryItemMap.get(item.materialId.toString());
        if (!inventoryItem) {
          throw new AppError(
            `Material with ID ${item.materialId} not found`,
            404,
            ErrorType.NOT_FOUND
          );
        }

        // Update inventory stock with reference to this material usage
        await inventoryService.updateStock(
          item.materialId.toString(),
          item.quantity,
          false, // isAddition = false since we're using materials
          usageData.projectId?.toString(),
          { type: "MATERIAL_USAGE", id: usage._id.toString() },
          session // Pass the session
        );
      }

      await usage.save({ session });

      await session.commitTransaction();

      // Post-transaction logic: Send notifications after data is committed
      await this.checkAndSendReportingPeriodReport(
        project._id.toString(),
        usage.reportingPeriod,
        new Date(usage.date)
      );

      return usage;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const materialUsageService = new MaterialUsageService();
