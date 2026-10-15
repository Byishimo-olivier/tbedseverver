import { Request, Response, NextFunction } from "express";
import { boqService } from "../service/boq.service";
import { logger } from "@/utils/logger";
import { AuthRequest } from "@/middleware/auth.middleware";
import { successResponse } from "@/utils/response";

export class BoQController {
  async createOrUpdateBoQ(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const boq = await boqService.createOrUpdateBoQ(req.body, req.user.id);
      res
        .status(200)
        .json(successResponse(boq, "BoQ created/updated successfully"));
    } catch (error) {
      logger.error("Error creating/updating BoQ:", error);
      next(error);
    }
  }

  async getBoQ(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const boq = await boqService.getBoQ(projectId);
      res.json(successResponse(boq, "BoQ retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving BoQ:", error);
      next(error);
    }
  }

  async deleteBoQ(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      await boqService.deleteBoQ(projectId);
      res.json(successResponse(null, "BoQ deleted successfully"));
    } catch (error) {
      logger.error("Error deleting BoQ:", error);
      next(error);
    }
  }
}

export const boqController = new BoQController();