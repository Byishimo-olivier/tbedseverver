import mongoose from "mongoose";
import { AppError, ErrorType } from "@/utils/exceptions";
import { Bid, IBid } from "../models/bid.model";
import { Tender, ITender } from "../models/tender.model";
import { BidEvaluationStatus, BidStatus, TenderStatus, BidOpeningStatus } from "@/types/enums";
import { logger } from "@/utils/logger";
import { notificationService } from "@/modules/notifications/notifcation.service";
import { Bidder } from "../models/bidder.model";


export class BidEvaluationService {
  private async getBidAndTender(bidId: string): Promise<{ bid: IBid; tender: ITender }> {
    const bid = await Bid.findById(bidId).populate("tenderId");
    if (!bid) {
      throw new AppError("Bid not found", 404, ErrorType.NOT_FOUND);
    }
    const tender = bid.tenderId as unknown as ITender;
    return { bid, tender };
  }

  async openBidsForTender(tenderId: string, userId: string): Promise<ITender> {
    const tender = await Tender.findById(tenderId);
    if (!tender) {
      throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
    }
    if (!tender.bidOpeningDate) {
      throw new AppError("Tender bid opening date is not set.", 400, ErrorType.VALIDATION);
    }
    if (new Date() < tender.bidOpeningDate) {
      throw new AppError("Cannot open bids before the official opening date.", 400, ErrorType.VALIDATION);
    }

    await Bid.updateMany(
      { tenderId, status: BidStatus.SUBMITTED },
      { $set: { status: BidStatus.UNDER_EVALUATION, "evaluation.status": BidEvaluationStatus.TECHNICAL_REVIEW, isSealed: false } }
    );

    tender.bidOpeningStatus = BidOpeningStatus.COMPLETED;
    tender.bidOpeningOfficer = new mongoose.Types.ObjectId(userId);
    await tender.save();

    logger.info(`Bids opened for tender ${tender.tenderNumber} by user ${userId}`);
    return tender;
  }

  async submitTechnicalScore(bidId: string, score: number, maxScore: number, comments: string, evaluatorId: string): Promise<IBid> {
    const { bid } = await this.getBidAndTender(bidId);

    bid.evaluation.technicalScore = score;
    bid.evaluation.technicalMaxScore = maxScore;
    bid.evaluation.technicalComments = comments;
    bid.evaluation.evaluatedBy = new mongoose.Types.ObjectId(evaluatorId);
    bid.evaluation.evaluatedAt = new Date();
    bid.evaluation.status = BidEvaluationStatus.FINANCIAL_REVIEW;

    return bid.save();
  }

  async awardTender(bidId: string, userId: string): Promise<{ tender: ITender, winningBid: IBid }> {
    const { bid, tender } = await this.getBidAndTender(bidId);

    if (tender.status === TenderStatus.AWARDED) {
      throw new AppError("This tender has already been awarded.", 409, ErrorType.CONFLICT);
    }

    // Set winning bid status
    bid.isAwarded = true;
    bid.status = BidStatus.AWARDED;
    bid.awardDate = new Date();
    bid.contractValue = bid.financialProposal.totalBidPrice;
    await bid.save();

    // Set tender status
    tender.status = TenderStatus.AWARDED;
    tender.updatedBy = new mongoose.Types.ObjectId(userId);
    await tender.save();

   // Set other bids to 'Rejected'
    const unsuccessfulBids = await Bid.find({ tenderId: tender._id, _id: { $ne: bid._id } });
    for (const unsuccessfulBid of unsuccessfulBids) {
      unsuccessfulBid.status = BidStatus.REJECTED;
      await unsuccessfulBid.save();
    }

    // Notify winning and unsuccessful bidders
    await this.notifyBiddersOfAward(tender, bid, unsuccessfulBids);
    logger.info(`Tender ${tender.tenderNumber} awarded to bid ${bid.bidNumber}`);

    return { tender, winningBid: bid };
  }

  private async notifyBiddersOfAward(tender: ITender, winningBid: IBid, unsuccessfulBids: IBid[]): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Notify winner
    const winningBidderProfile = await Bidder.findById(winningBid.bidderId).populate<{ userId: { email: string; fullName?: string } }>("userId", "email fullName");
    if (winningBidderProfile && winningBidderProfile.userId.email) {
      await notificationService.sendTemplateEmail(
        winningBidderProfile.userId.email,
        `Congratulations! You've been awarded Tender: ${tender.title}`,
        "tender-awarded-winner",
        {
          bidderName: winningBidderProfile.userId.fullName || winningBidderProfile.companyName,
          tenderTitle: tender.title,
          tenderNumber: tender.tenderNumber,
          bidNumber: winningBid.bidNumber,
          contractValue: (winningBid.contractValue || 0).toFixed(2),
          bidLink: `${frontendUrl}/bids/${winningBid._id}`,
          year: new Date().getFullYear().toString(),
        }
      );
    }

    // Notify unsuccessful bidders
    for (const unsuccessfulBid of unsuccessfulBids) {
      const bidderProfile = await Bidder.findById(unsuccessfulBid.bidderId).populate<{ userId: { email: string; fullName?: string } }>("userId", "email fullName");
      if (bidderProfile && bidderProfile.userId.email) {
        await notificationService.sendTemplateEmail(
          bidderProfile.userId.email,
          `Tender Status Update: ${tender.title}`,
          "tender-awarded-unsuccessful",
          {
            bidderName: bidderProfile.userId.fullName || bidderProfile.companyName,
            tenderTitle: tender.title,
            tendersLink: `${frontendUrl}/tenders`,
            year: new Date().getFullYear().toString(),
          }
        );
      }
    }
  }
}

export const evaluationService = new BidEvaluationService();