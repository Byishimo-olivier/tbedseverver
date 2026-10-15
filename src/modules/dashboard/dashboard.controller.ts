import { NextFunction, Response } from "express";
import { AuthRequest } from "@/middleware/auth.middleware";
import { dashboardService } from "./dashboard.service";
import { ProjectStatus } from "@/types/enums";
import { logger } from "@/utils/logger";
import { successResponse } from "@/utils/response";

export class DashboardController {
  async getDashboardSummary(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const summary = await dashboardService.getDashboardSummary(
        req.user!.id,
        req.activeCompany?.id
      );
      res.json(successResponse(summary, "Dashboard summary fetched."));
    } catch (error) {
      logger.error("Error fetching dashboard summary:", error);
      next(error);
    }
  }

  async getProjectsHealth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      const healthData = await dashboardService.getProjectsHealth(
        req.user!.id,
        req.activeCompany?.id,
        status as ProjectStatus
      );
      res.json(successResponse(healthData, "Projects health data fetched."));
    } catch (error) {
      logger.error("Error fetching projects health:", error);
      next(error);
    }
  }

  async getProcurementAnalytics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const analytics = await dashboardService.getProcurementAnalytics(
        req.user!.id,
        req.activeCompany?.id
      );
      res.json(successResponse(analytics, "Procurement analytics fetched."));
    } catch (error) {
      logger.error("Error fetching procurement analytics:", error);
      next(error);
    }
  }

  async getDocumentWorkflowAnalytics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const analytics = await dashboardService.getDocumentWorkflowAnalytics(
        req.user!.id,
        req.activeCompany?.id
      );
      res.json(
        successResponse(analytics, "Document workflow analytics fetched.")
      );
    } catch (error) {
      logger.error("Error fetching document workflow analytics:", error);
      next(error);
    }
  }

  async getPerformanceMatrix(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const matrix = await dashboardService.getPerformanceMatrix(
        req.user!.id,
        req.activeCompany?.id
      );
      res.json(successResponse(matrix, "Performance matrix fetched."));
    } catch (error) {
      logger.error("Error fetching performance matrix:", error);
      next(error);
    }
  }

  async getTimelineTrends(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const trends = await dashboardService.getTimelineTrends(
        req.user!.id,
        req.activeCompany?.id
      );
      res.json(successResponse(trends, "Timeline trends fetched."));
    } catch (error) {
      logger.error("Error fetching timeline trends:", error);
      next(error);
    }
  }

  async getAdvancedAnalytics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const analytics = await dashboardService.getAdvancedAnalytics(
        req.user!.id,
        req.activeCompany?.id
      );
      res.json(successResponse(analytics, "Advanced analytics fetched."));
    } catch (error) {
      logger.error("Error fetching advanced analytics:", error);
      next(error);
    }
  }

  async getBiddingAnalytics(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const analytics = await dashboardService.getBiddingAnalytics(
        req.user!.id,
        req.activeCompany?.id
      );
      res.json(successResponse(analytics, "Bidding analytics fetched."));
    } catch (error) {
      logger.error("Error fetching bidding analytics:", error);
      next(error);
    }
  }

  async getCashFlow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { period } = req.query;
      const cashFlow = await dashboardService.getCashFlow(
        req.user!.id,
        req.activeCompany?.id,
        period as "monthly" | "weekly"
      );
      res.json(successResponse(cashFlow, "Cash flow data fetched."));
    } catch (error) {
      logger.error("Error fetching cash flow:", error);
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
