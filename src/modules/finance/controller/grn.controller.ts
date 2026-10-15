import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { successResponse } from "../../../utils/response";
import { grnService } from "../service/grn.service";
import { logger } from "../../../utils/logger";

export class GRNController {
  async createGRN(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const grn = await grnService.createGRN(
        req.body,
        req.user.id,
        req.files as Express.Multer.File[]
      );
      res.status(201).json(successResponse(grn, "GRN created successfully"));
    } catch (error) {
      logger.error("Error creating GRN:", error);
      next(error);
    }
  }

  async getGRN(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const grn = await grnService.getGRN(id);
      res.json(successResponse(grn, "GRN retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving GRN:", error);
      next(error);
    }
  }

  async getGRNsByProject(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const grns = await grnService.getGRNsByProject(projectId);
      res.json(
        successResponse(grns, "GRNs for project retrieved successfully")
      );
    } catch (error) {
      logger.error(
        `Error retrieving GRNs for project ${req.params.projectId}:`,
        error
      );
      next(error);
    }
  }
}

export const grnController = new GRNController();
