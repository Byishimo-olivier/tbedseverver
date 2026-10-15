import { IBoQ, BoQ } from "../models/boq.model";
import { AppError, ErrorType } from "../../../utils/exceptions";
import mongoose from "mongoose";
import { Invoice } from "../models/invoice.model";
import { Project } from "@/modules/projects/project.model";

export class BoQService {
  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid ID format", 400, ErrorType.VALIDATION);
    }
  }

  async createOrUpdateBoQ(
    boqData: Partial<IBoQ>,
    userId: string
  ): Promise<IBoQ> {
    if (!boqData.projectId) {
      throw new AppError("projectId is required", 400, ErrorType.VALIDATION);
    }
    this.validateObjectId(boqData.projectId.toString());
    this.validateObjectId(userId);

    const project = await Project.findById(boqData.projectId);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    let boq = await BoQ.findOne({ projectId: boqData.projectId });

    if (boq) {
      // Update existing BoQ
      boq.sections = boqData.sections || boq.sections;
      boq.updatedBy = new mongoose.Types.ObjectId(userId);
    } else {
      // Create new BoQ
      boq = new BoQ({
        ...boqData,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    await boq.save(); // Pre-save middleware will calculate totals
    return boq;
  }

  async getBoQ(projectId: string): Promise<IBoQ> {
    this.validateObjectId(projectId);
    const boq = await BoQ.findOne({ projectId });
    if (!boq) {
      throw new AppError(
        "BoQ not found for this project",
        404,
        ErrorType.NOT_FOUND
      );
    }
    return boq;
  }

  async deleteBoQ(projectId: string): Promise<void> {
    this.validateObjectId(projectId);
    const boq = await BoQ.findOne({ projectId });
    if (!boq) {
      throw new AppError(
        "BoQ not found for this project",
        404,
        ErrorType.NOT_FOUND
      );
    }

    // Check if any BoQ item is used in invoices
    const invoiceCount = await Invoice.countDocuments({
      "invoiceItems.boqItemId": { $in: boq.sections.flatMap(s => s.items.map(i => i._id)) },
    });

    if (invoiceCount > 0) {
      throw new AppError(
        "Cannot delete a BoQ that is already referenced in an invoice.",
        400,
        ErrorType.VALIDATION
      );
    }

    await boq.deleteOne();
  }
}

export const boqService = new BoQService();