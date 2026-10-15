import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { successResponse } from "../../../utils/response";
import { inventoryService } from "../service/inventory.service";
import { logger } from "../../../utils/logger";
import { AppError, ErrorType } from "@/utils/exceptions";

export class InventoryController {
  async createInventoryItem(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.body;
      if (!projectId) {
        return next(
          new AppError("Project ID is required.", 400, ErrorType.VALIDATION)
        );
      }
      const item = await inventoryService.createInventoryItem(
        req.body,
        req.user.id,
        projectId
      );
      res
        .status(201)
        .json(successResponse(item, "Inventory item created successfully"));
    } catch (error) {
      logger.error("Error creating inventory item:", error);
      next(error);
    }
  }

  async updateInventoryItem(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const item = await inventoryService.updateInventoryItem(
        id,
        req.body,
        req.user.id
      );
      res.json(successResponse(item, "Inventory item updated successfully"));
    } catch (error) {
      logger.error("Error updating inventory item:", error);
      next(error);
    }
  }

  async getInventoryItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const item = await inventoryService.getInventoryItem(id);
      res.json(successResponse(item, "Inventory item retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving inventory item:", error);
      next(error);
    }
  }

  async getInventoryItems(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { category, search } = req.query;
      const { projectId } = req.params;

      if (!projectId) {
        return next(
          new AppError("Project ID is required.", 400, ErrorType.VALIDATION)
        );
      }

      const items = await inventoryService.getInventoryItems(
        [projectId],
        category as string,
        search as string
      );
      res.json(
        successResponse(items, "Inventory items retrieved successfully")
      );
    } catch (error) {
      logger.error("Error retrieving inventory items:", error);
      next(error);
    }
  }

  async deleteInventoryItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await inventoryService.deleteInventoryItem(id);
      res.json(successResponse(null, "Inventory item deleted successfully"));
    } catch (error) {
      logger.error("Error deleting inventory item:", error);
      next(error);
    }
  }

  async getInventoryTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate, transactionType } = req.query;

      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (transactionType) filters.transactionType = transactionType as string;

      const transactions = await inventoryService.getInventoryTransactions(
        id,
        filters
      );
      res.json(
        successResponse(
          transactions,
          "Inventory transactions retrieved successfully"
        )
      );
    } catch (error) {
      logger.error("Error retrieving inventory transactions:", error);
      next(error);
    }
  }

  async getRelatedDocuments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { documentType } = req.query;

      const documents = await inventoryService.getRelatedDocuments(
        id,
        documentType as string | undefined
      );
      res.json(
        successResponse(documents, "Related documents retrieved successfully")
      );
    } catch (error) {
      logger.error("Error retrieving related documents:", error);
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
