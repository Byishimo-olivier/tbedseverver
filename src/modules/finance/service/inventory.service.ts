// src/modules/finance/service/inventory.service.ts
import { IInventoryItem, InventoryItem } from "../models/inventory.model";
import { AppError, ErrorType } from "../../../utils/exceptions";
import mongoose from "mongoose";
import { Project } from "../../projects/project.model";
import { User } from "../../users/user.model";
import { notificationService } from "../../notifications/notifcation.service";
import { logger } from "@/utils/logger";
import {
  IInventoryTransaction,
  InventoryTransaction,
  TransactionType,
} from "../models/inventoryTransaction.model";
import { GRN } from "../models/grn.model";

export class InventoryService {
  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid ID format", 400, ErrorType.VALIDATION);
    }
  }

  async createInventoryItem(
    itemData: Partial<IInventoryItem>,
    userId: string,
    projectId: string
  ): Promise<IInventoryItem> {
    this.validateObjectId(projectId);
    const existingItem = await InventoryItem.findOne({
      materialCode: itemData.materialCode,
      projectId: projectId
    });

    if (existingItem) {
      throw new AppError(
        "Material code already exists in this project",
        400,
        ErrorType.VALIDATION
      );
    }

    const item = new InventoryItem({
      ...itemData,
      projectId,
      createdBy: userId,
      updatedBy: userId,
    });

    await item.save();
    return item;
  }

  async updateInventoryItem(
    id: string,
    updateData: Partial<IInventoryItem>,
    userId: string
  ): Promise<IInventoryItem> {
    this.validateObjectId(id);

    const item = await InventoryItem.findById(id);
    if (!item) {
      throw new AppError("Inventory item not found", 404, ErrorType.NOT_FOUND);
    }

    Object.assign(item, {
      ...updateData,
      updatedBy: userId,
    });

    await item.save();
    return item;
  }

  async getInventoryItem(id: string): Promise<IInventoryItem> {
    this.validateObjectId(id);

    const item = await InventoryItem.findById(id);
    if (!item) {
      throw new AppError("Inventory item not found", 404, ErrorType.NOT_FOUND);
    }

    return item;
  }

  async getInventoryItems(
    projectIds: string[],
    category?: string,
    search?: string
  ): Promise<IInventoryItem[]> {
    const query: any = {
      projectId: { $in: projectIds },
    };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { materialCode: { $regex: search, $options: "i" } },
      ];
    }

    return InventoryItem.find(query).sort({ createdAt: -1 });
  }

  async deleteInventoryItem(id: string): Promise<void> {
    this.validateObjectId(id);

    const result = await InventoryItem.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new AppError("Inventory item not found", 404, ErrorType.NOT_FOUND);
    }
  }

  async updateStock(
    id: string,
    quantity: number,
    isAddition: boolean,
    projectId?: string,
    sourceDocument?: { type: string; id: string },
    session?: mongoose.ClientSession
  ): Promise<IInventoryItem> {
    this.validateObjectId(id);

    const item = await InventoryItem.findById(id);
    if (!item) {
      throw new AppError("Inventory item not found", 404, ErrorType.NOT_FOUND);
    }

    const newStock = isAddition
      ? item.currentStock + quantity
      : item.currentStock - quantity;

    if (newStock < 0) {
      throw new AppError(
        "Insufficient stock available",
        400,
        ErrorType.VALIDATION
      );
    }

    // Create transaction record
    if (sourceDocument) {
      const transactionType = isAddition
        ? TransactionType.RECEIVED
        : TransactionType.ISSUED;

      const transactionData: Partial<IInventoryTransaction> = {
        inventoryItemId: new mongoose.Types.ObjectId(id),
        quantity,
        type: transactionType,
        sourceDocument: {
          type: sourceDocument.type,
          id: new mongoose.Types.ObjectId(sourceDocument.id),
        },
        projectId: projectId
          ? new mongoose.Types.ObjectId(projectId)
          : undefined,
        balanceAfter: newStock,
        createdBy: item.updatedBy, // Using the last updater as creator
        remarks: `Stock ${isAddition ? "added" : "removed"} via ${
          sourceDocument.type
        }`,
      };

      await InventoryTransaction.create([transactionData], { session });
    }

    item.currentStock = newStock;
    await item.save({ session });
    // Check if stock is below minimum and send notification
    if (item.currentStock <= item.minimumStock) {
      try {
        let owner;
        // If projectId is provided, notify project owner
        if (projectId) {
          const project = await Project.findById(projectId);
          if (project) {
            owner = await User.findById(project.createdBy);
            if (owner && owner.email) {
              const currentYear = new Date().getFullYear();
              const frontendUrl =
                process.env.FRONTEND_URL || "http://localhost:3000";

              // Create template parameters
              const templateParams = {
                logoUrl: `${frontendUrl}/images/logo.png`,
                ownerName: `${owner.fullName}`,
                materialName: item.name,
                materialCode: item.materialCode,
                currentStock: item.currentStock.toString(),
                minimumStock: item.minimumStock.toString(),
                unit: item.unit,
                category: item.category,
                inventoryUrl: `${frontendUrl}/inventory/items/${item._id}`,
                year: currentYear.toString(),
              };

              // Use the sendTemplateEmail method instead
              await notificationService.sendTemplateEmail(
                owner.email,
                "Low Stock Alert",
                "low-stock-alert",
                templateParams
              );
            }
          }
        }

        // Also send SMS if contact number is available
        if (owner?.contactNumber) {
          await notificationService.sendSMS(
            owner.contactNumber,
            `Low Stock Alert: ${item.name} (${item.materialCode})\n` +
              `Current: ${item.currentStock} ${item.unit}`
          );
        }

        logger.info(
          `Low stock notification sent for item ${item.materialCode}`
        );
      } catch (error) {
        logger.error(`Failed to send low stock notification: ${error}`);
        // Don't throw error as the stock update was successful
      }
    }

    return item;
  }

  async getInventoryTransactions(
    inventoryItemId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      transactionType?: string;
    }
  ): Promise<IInventoryTransaction[]> {
    this.validateObjectId(inventoryItemId);

    const query: any = { inventoryItemId };

    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    if (filters?.transactionType) {
      query.type = filters.transactionType;
    }

    return InventoryTransaction.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName email")
      .exec();
  }

  async getRelatedDocuments(
    inventoryItemId: string,
    documentType?: string
  ): Promise<any[]> {
    this.validateObjectId(inventoryItemId);

    // Find all transactions for this inventory item
    const query: any = { inventoryItemId };
    if (documentType) {
      query["sourceDocument.type"] = documentType;
    }

    const transactions = await InventoryTransaction.find(query);

    // Extract unique document references
    const documentRefs = transactions.reduce((acc: any[], transaction) => {
      const existingRef = acc.find(
        (ref) =>
          ref.type === transaction.sourceDocument.type &&
          ref.id.toString() === transaction.sourceDocument.id.toString()
      );

      if (!existingRef) {
        acc.push({
          type: transaction.sourceDocument.type,
          id: transaction.sourceDocument.id,
        });
      }

      return acc;
    }, []);

    // Fetch the actual documents
    const documents = [];
    for (const ref of documentRefs) {
      let document;
      switch (ref.type) {
        case "GRN":
          document = await GRN.findById(ref.id);
          break;
        // Add other document types as needed
      }

      if (document) {
        documents.push({
          type: ref.type,
          data: document,
        });
      }
    }

    return documents;
  }
}

export const inventoryService = new InventoryService();
