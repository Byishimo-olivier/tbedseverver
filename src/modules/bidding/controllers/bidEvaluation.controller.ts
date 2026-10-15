import { NextFunction, Response } from "express";
import { AuthRequest } from "@/middleware/auth.middleware";
import { successResponse } from "@/utils/response";
import { logger } from "@/utils/logger";
import { evaluationService } from "../services/bidEvaluation.service";

export class BidEvaluationController {
  async openBidsForTender(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tender = await evaluationService.openBidsForTender(req.params.id, req.user!.id);
      res.json(successResponse(tender, "Bids for tender have been opened for evaluation."));
    } catch (error) {
      logger.error("Error opening bids for tender:", error);
      next(error);
    }
  }

  async submitTechnicalScore(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { score, maxScore, comments } = req.body;
      const bid = await evaluationService.submitTechnicalScore(req.params.id, score, maxScore, comments, req.user!.id);
      res.json(successResponse(bid, "Technical score submitted successfully."));
    } catch (error) {
      logger.error("Error submitting technical score:", error);
      next(error);
    }
  }

  async awardTender(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tender, winningBid } = await evaluationService.awardTender(req.params.id, req.user!.id);
      res.json(successResponse({ tender, winningBid }, "Tender awarded successfully."));
    } catch (error) {
      logger.error("Error awarding tender:", error);
      next(error);
    }
  }
}

export const bidEvaluationController = new BidEvaluationController();