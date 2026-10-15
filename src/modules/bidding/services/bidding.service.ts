import mongoose from "mongoose";
import { AppError, ErrorType } from "@/utils/exceptions";
import { logger } from "@/utils/logger";
import { BidStatus, ClarificationStatus, TenderStatus } from "@/types/enums";
import { ITender, Tender } from "../models/tender.model";
import { Project } from "@/modules/projects/project.model";
import { Bidder, IBidder } from "../models/bidder.model";
import { Bid, IBid, IBidBoQItem } from "../models/bid.model";
import { Clarification, IClarification } from "../models/clarification.model";
import { BoQ, IBoQLineItem } from "@/modules/finance/models/boq.model";
import { notificationService } from "@/modules/notifications/notifcation.service";
// import { User } from "@/modules/users/user.model";
import { Company } from "@/modules/users/company/company.model";

export class BiddingService {
  private validateObjectId(id: string, message: string = "Invalid ID"): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(message, 400, ErrorType.VALIDATION);
    }
  }

  // --- Tender Management ---

  async createTender(tenderData: Partial<ITender>, userId: string): Promise<ITender> {
    this.validateObjectId(userId, "Invalid user ID");
    if (!tenderData.projectId) {
      throw new AppError("Project ID is required", 400, ErrorType.VALIDATION);
    }
    this.validateObjectId(tenderData.projectId.toString(), "Invalid project ID");

    const project = await Project.findById(tenderData.projectId);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    // Ensure the project belongs to the user or their company
    if (tenderData.companyId && project.companyId?.toString() !== tenderData.companyId.toString()) {
      throw new AppError("Project does not belong to this company", 403, ErrorType.AUTHORIZATION);
    }

    if (!tenderData.companyId && project.createdBy?.toString() !== userId) {
      throw new AppError("Project does not belong to you", 403, ErrorType.AUTHORIZATION);
    }

    // Automatically associate the project's BoQ if it exists and is not already provided
    if (tenderData.projectId && !tenderData.boqId) {
      const projectBoq = await BoQ.findOne({ projectId: tenderData.projectId });
      if (projectBoq) {
        tenderData.boqId = projectBoq._id;
      }
    }

    const tender = new Tender({
      ...tenderData,
      createdBy: userId,
      updatedBy: userId,
    });

    await tender.save();
    logger.info(`Tender created: ${tender.title} (${tender._id})`);
    return tender;
  }

  async getEligibleCommitteeMembers(tenderId: string): Promise<{ userId: string; fullName: string; email: string }[]> {
    this.validateObjectId(tenderId);

    const tender = await Tender.findById(tenderId);
    if (!tender) {
      throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
    }

    const project = await Project.findById(tender.projectId)
      .populate("team.user", "fullName email");

    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    if (tender.companyId) {
      // Company tender: eligible members are company members
      const company = await Company.findById(tender.companyId)
        .populate("members.userId", "fullName email");

      if (!company) {
        throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
      }

      return company.members
        .filter((m: any) => m.userId._id.toString() !== tender.createdBy.toString())
        .map((m: any) => ({
          userId: m.userId._id.toString(),
          fullName: m.userId.fullName || "",
          email: m.userId.email || "",
        }));
    }

    // Individual tender: eligible members are project team members
    return (project.team || [])
      .filter((m: any) => m.user && m.user._id.toString() !== tender.createdBy.toString())
      .map((m: any) => ({
        userId: m.user._id.toString(),
        fullName: m.user.fullName || "",
        email: m.user.email || "",
      }));
  }

  async addMemberToEvaluationCommittee(tenderId: string, identifier: string, updatedBy: string): Promise<ITender> {
    this.validateObjectId(tenderId, "Invalid Tender ID");

    const tender = await Tender.findById(tenderId);
    if (!tender) {
      throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
    }

    // Resolve identifier: could be email or userId
    let memberId: string;

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      memberId = identifier;
    } else {
      // Treat as email
      const { User } = await import("@/modules/users/user.model");
      const user = await User.findOne({ email: identifier.toLowerCase() });
      if (!user) {
        throw new AppError("User not found with that email.", 404, ErrorType.NOT_FOUND);
      }
      memberId = user._id.toString();
    }

    // Validate the member is eligible (belongs to company or project team)
    const project = await Project.findById(tender.projectId);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    let isEligible = false;

    if (tender.companyId) {
      const company = await Company.findById(tender.companyId);
      isEligible = !!company?.members.some(
        (m) => m.userId.toString() === memberId
      );
    } else {
      isEligible = (project.team || []).some(
        (m: any) => m.user?.toString() === memberId
      );
    }

    if (!isEligible) {
      throw new AppError(
        tender.companyId
          ? "User must be a company member to join the evaluation committee."
          : "User must be a project team member to join the evaluation committee.",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Prevent tender creator from being added
    if (tender.createdBy.toString() === memberId) {
      throw new AppError("The tender creator cannot be added to the evaluation committee.", 400, ErrorType.VALIDATION);
    }

    // Check if already in committee
    if (tender.evaluationCommittee.some((id: any) => id.toString() === memberId)) {
      throw new AppError("User is already a member of the evaluation committee.", 409, ErrorType.CONFLICT);
    }

    tender.evaluationCommittee.push(new mongoose.Types.ObjectId(memberId));
    tender.updatedBy = new mongoose.Types.ObjectId(updatedBy);
    await tender.save();

    return tender.populate("evaluationCommittee", "fullName email");
  }

  async removeMemberFromEvaluationCommittee(tenderId: string, identifier: string, updatedBy: string): Promise<ITender> {
    this.validateObjectId(tenderId, "Invalid Tender ID");

    const tender = await Tender.findById(tenderId);
    if (!tender) {
      throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
    }

    // Resolve identifier: could be email or userId
    let memberId: string;

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      memberId = identifier;
    } else {
      const { User } = await import("@/modules/users/user.model");
      const user = await User.findOne({ email: identifier.toLowerCase() });
      if (!user) {
        throw new AppError("User not found with that email.", 404, ErrorType.NOT_FOUND);
      }
      memberId = user._id.toString();
    }

    const memberObjectId = new mongoose.Types.ObjectId(memberId);
    const memberIndex = tender.evaluationCommittee.findIndex(id => id.equals(memberObjectId));

    if (memberIndex === -1) {
      throw new AppError("User is not a member of the evaluation committee.", 404, ErrorType.NOT_FOUND);
    }

    tender.evaluationCommittee.splice(memberIndex, 1);
    tender.updatedBy = new mongoose.Types.ObjectId(updatedBy);
    await tender.save();

    return tender.populate("evaluationCommittee", "fullName email");
  }

  async getTenderById(id: string): Promise<ITender> {
    this.validateObjectId(id);
    const tender = await Tender.findById(id)
      .populate("projectId", "name")
      .populate("tenderManager", "fullName email")
      .populate("evaluationCommittee", "fullName email")
      .populate({ path: "boq", select: "projectId sections grandTotal createdAt updatedAt" }); 

    if (!tender) {
      throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
    }
    return tender;
  }

  async getAllTenders(userId: string, filters: any = {}, companyId?: string): Promise<ITender[]> {
    const query: any = {};
    if (companyId) {
      // Only tenders owned by this company
      this.validateObjectId(companyId);
      query.companyId = new mongoose.Types.ObjectId(companyId);
    } else {
      // Individual context: tenders created by this user that have no company
      query.createdBy = new mongoose.Types.ObjectId(userId);
      query.companyId = { $exists: false };
    }

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;

    return Tender.find(query)
      .populate("projectId", "name")
      .populate("tenderManager", "fullName email")
      .sort({ createdAt: -1 });
  }

  async listPublishedTenders(filters: any = {}): Promise<ITender[]> {
    const query: any = { status: TenderStatus.PUBLISHED };
    if (filters.type) query.type = filters.type;

    // Basic pagination
    const page = parseInt(filters.page as string, 10) || 1;
    const limit = Math.min(parseInt(filters.limit as string, 10) || 20, 100);
    const skip = (page - 1) * limit;

    return Tender.find(query)
      .select("title tenderNumber type submissionDeadline companyId projectId status createdAt tenderManager createdBy")
      .populate("projectId", "name")
      .populate("tenderManager", "fullName email")
      .populate("createdBy", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async updateTender(id: string, updateData: Partial<ITender>, userId: string): Promise<ITender> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    const tender = await Tender.findById(id);
    if (!tender) throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
    if (tender.status !== TenderStatus.DRAFT) {
      throw new AppError("Can only update tenders in 'Draft' status.", 400, ErrorType.VALIDATION);
    }

    // Only assign documents if explicitly provided
    const { documents, ...rest } = updateData as any;
    Object.assign(tender, rest);

    if (Array.isArray(documents)) {
      tender.documents = documents as any; // full replace (explicit)
    }

    tender.updatedBy = new mongoose.Types.ObjectId(userId);
    await tender.save();
    return tender.populate("evaluationCommittee", "fullName email");
  }

  async publishTender(id: string, userId: string): Promise<ITender> {
    this.validateObjectId(id);
    const tender = await this.getTenderById(id);

    if (tender.status !== TenderStatus.DRAFT) {
        throw new AppError("Only draft tenders can be published.", 400, ErrorType.VALIDATION);
    }

    tender.status = TenderStatus.PUBLISHED;
    tender.publicationDate = new Date();
    tender.updatedBy = new mongoose.Types.ObjectId(userId);
    await tender.save();

    // Notify all verified bidders about the new tender
    const verifiedBidders = await Bidder.find({ verificationStatus: "VERIFIED" }).populate<{ userId: { email: string; fullName?: string } }>("userId", "email fullName");

    for (const bidder of verifiedBidders) {
      if (bidder.userId && bidder.userId.email) {
        await notificationService.sendTemplateEmail(
          bidder.userId.email,
          `New Tender Opportunity: ${tender.title}`,
          "new-tender-published",
          {
            bidderName: bidder.userId.fullName || bidder.companyName,
            tenderTitle: tender.title,
            tenderNumber: tender.tenderNumber,
            submissionDeadline: tender.submissionDeadline.toLocaleDateString(),
            tenderLink: `${process.env.FRONTEND_URL}/tenders/${tender._id}`,
            year: new Date().getFullYear().toString(),
          }
        );
      }
    }

    logger.info(`Tender ${tender.tenderNumber} has been published and notifications sent to ${verifiedBidders.length} bidders.`);
    logger.info(`Tender ${tender.tenderNumber} has been published.`);

    return tender;
  }

  // --- Bidder Profile Management ---

  async registerBidder(bidderData: Partial<IBidder>, userId: string): Promise<IBidder> {
    this.validateObjectId(userId);
    const existingBidder = await Bidder.findOne({ userId });
    if (existingBidder) {
        throw new AppError("Bidder profile already exists for this user.", 409, ErrorType.CONFLICT);
    }

    let finalBidderData: Partial<IBidder> = { ...bidderData };

    if (bidderData.companyId) {
      const company = await Company.findById(bidderData.companyId);
      if (!company) {
        throw new AppError("Linked company not found.", 404, ErrorType.NOT_FOUND);
      }

      // Ensure the user is a member of the company
      const isMember = company.members.some(member => member.userId.toString() === userId);
      if (!isMember) {
        throw new AppError("You are not a member of the specified company.", 403, ErrorType.AUTHORIZATION);
      }

      // Pre-fill data from the company profile
      finalBidderData = {
        ...company.toObject(),
        ...bidderData,
        companyName: company.name,
        companyType: company.type,
      };
    }

    const bidder = new Bidder({
        ...finalBidderData,
        userId,
        createdBy: userId,
        updatedBy: userId,
    });

    await bidder.save();
    return bidder;
  }

  async getBidderProfileByUserId(userId: string): Promise<IBidder> {
    this.validateObjectId(userId);
    const bidder = await Bidder.findOne({ userId }).populate("userId", "fullName email");
    if (!bidder) {
        throw new AppError("Bidder profile not found.", 404, ErrorType.NOT_FOUND);
    }
    return bidder;
  }

  async getBidById(bidId: string, userId: string): Promise<IBid> {
    this.validateObjectId(bidId);
    this.validateObjectId(userId);

    const bid = await Bid.findById(bidId)
      .populate({ path: "bidderId", select: "companyName userId" });

    if (!bid) {
      throw new AppError("Bid not found", 404, ErrorType.NOT_FOUND);
    }

    const tender = await Tender.findById(bid.tenderId)
      .select("tenderManager evaluationCommittee");

    if (!tender) {
      throw new AppError("Tender not found", 404, ErrorType.NOT_FOUND);
    }

    const bidderUserId = (bid.bidderId as any)?.userId?.toString?.();
    const isBidder = bidderUserId === userId;
    const isTenderManager = tender.tenderManager?.toString?.() === userId;
    const isCommittee =
      Array.isArray(tender.evaluationCommittee) &&
      tender.evaluationCommittee.some((id: any) => id.toString() === userId);

    if (!isBidder && !isTenderManager && !isCommittee) {
      throw new AppError("You do not have access to this bid.", 403, ErrorType.AUTHORIZATION);
    }

    // Note: financialProposal is auto-hidden by the Bid model transform if sealed.
    return bid;
  }

  // --- Bid Submission ---

  async submitBid(tenderId: string, bidderId: string, bidData: any, userId: string): Promise<IBid> {
    this.validateObjectId(tenderId);
    this.validateObjectId(bidderId);
    this.validateObjectId(userId);

    const tender = await this.getTenderById(tenderId);

    if (tender.createdBy && tender.createdBy.toString() === userId) {
      throw new AppError(
        "You cannot submit a bid for a tender you created.",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    const bidder = await Bidder.findById(bidderId);
    if (!bidder) {
      throw new AppError("Bidder profile not found.", 404, ErrorType.NOT_FOUND);
    }

    // NEW: block company members bidding on own tender
    if (tender.companyId && bidder.companyId && tender.companyId.toString() === bidder.companyId.toString()) {
      throw new AppError("Company members cannot bid on their own company's tender.", 403, ErrorType.AUTHORIZATION);
    }

    if (new Date() > tender.submissionDeadline) {
        throw new AppError("The submission deadline for this tender has passed.", 400, ErrorType.VALIDATION);
    }

    const existingBid = await Bid.findOne({ tenderId, bidderId });
    if (existingBid) {
        throw new AppError("You have already submitted a bid for this tender.", 409, ErrorType.CONFLICT);
    }

    const financialProposal = bidData.financialProposal;
    const boqItems: IBidBoQItem[] = [];

    // Case 1: Bidder is pricing a BoQ provided with the tender
    if (financialProposal.pricedBoqItems && financialProposal.pricedBoqItems.length > 0) {
      if (!tender.boqId) {
        throw new AppError("Tender does not have an associated BoQ to price.", 400, ErrorType.VALIDATION);
      }
      const tenderBoq = await BoQ.findById(tender.boqId);
      if (!tenderBoq) {
        throw new AppError("Associated BoQ for this tender not found.", 404, ErrorType.NOT_FOUND);
      }
      const tenderBoqItemsMap = new Map<string, IBoQLineItem>();
      tenderBoq.sections.forEach(s => s.items.forEach(i => tenderBoqItemsMap.set(i._id.toString(), i)));

      for (const item of financialProposal.pricedBoqItems) {
        const originalItem = tenderBoqItemsMap.get(item.boqItemId);
        if (!originalItem) {
          throw new AppError(`BoQ item with id ${item.boqItemId} not found in tender's BoQ.`, 400, ErrorType.VALIDATION);
        }
        boqItems.push({
          boqItemId: item.boqItemId,
          unitRate: item.unitRate,
          quantity: originalItem.quantity,
          unit: originalItem.unit,
          description: originalItem.description,
          totalAmount: originalItem.quantity * item.unitRate,
        });
      }
    } 
    // Case 2: Bidder is manually entering BoQ items
    else if (financialProposal.manualBoqItems && financialProposal.manualBoqItems.length > 0) {
      for (const item of financialProposal.manualBoqItems) {
        boqItems.push({
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          unitRate: item.unitRate,
          totalAmount: item.quantity * item.unitRate,
        });
      }
    }
    // Case 3: Bidder is uploading a BoQ document (handled by document upload, no items to process here)

    const finalFinancialProposal = {
      ...financialProposal,
      boqItems,
    };
    delete finalFinancialProposal.pricedBoqItems;
    delete finalFinancialProposal.manualBoqItems;

    const bid = new Bid({
        ...bidData,
        tenderId,
        bidderId,
        financialProposal: finalFinancialProposal,
        status: BidStatus.SUBMITTED,
        sealedUntil: tender.bidOpeningDate,
        createdBy: userId,
        updatedBy: userId,
    });

    await bid.save();
    // Notify tender manager of new bid submission
    const populatedTender = await Tender.findById(tenderId).populate<{ tenderManager: { email: string; fullName?: string } }>("tenderManager", "email fullName");
    if (populatedTender && populatedTender.tenderManager && populatedTender.tenderManager.email) {
      const bidder = await Bidder.findById(bidderId);
      await notificationService.sendTemplateEmail(
        populatedTender.tenderManager.email,
        `New Bid Submitted for Tender: ${populatedTender.title}`,
        "new-bid-submitted",
        {
          tenderManagerName: populatedTender.tenderManager.fullName || "Manager",
          tenderTitle: populatedTender.title,
          tenderNumber: populatedTender.tenderNumber || "N/A",
          bidderName: bidder?.companyName || "A bidder",
          bidLink: `${process.env.FRONTEND_URL}/bids/${bid._id}`,
          year: new Date().getFullYear().toString(),
        }
      );
    }
    return bid;
  }

  async getBidsForTender(tenderId: string): Promise<IBid[]> {
    this.validateObjectId(tenderId);
    return Bid.find({ tenderId }).populate("bidderId", "companyName");
  }

  async getClarificationsForTender(tenderId: string): Promise<IClarification[]> {
    this.validateObjectId(tenderId);
    // Only return public clarifications or all if the user has specific permissions (future enhancement)
    return Clarification.find({ tenderId, isPublic: true }).populate("questionBy", "companyName");
  }

  // --- Clarification Management ---

  async askClarification(tenderId: string, question: string, bidderId: string): Promise<IClarification> {
    this.validateObjectId(tenderId);
    this.validateObjectId(bidderId);

    const tender = await this.getTenderById(tenderId);
    if (new Date() > tender.clarificationDeadline) {
        throw new AppError("The deadline for asking clarifications has passed.", 400, ErrorType.VALIDATION);
    }

    const clarification = new Clarification({
        tenderId,
        question,
        questionBy: bidderId,
    });

    await clarification.save();
    // Notify tender manager about the new question
    const populatedTender = await Tender.findById(tenderId).populate<{ tenderManager: { email: string; fullName?: string } }>("tenderManager", "email fullName");
    if (populatedTender && populatedTender.tenderManager && populatedTender.tenderManager.email) {
      await notificationService.sendTemplateEmail(
        populatedTender.tenderManager.email,
        `New Question on Tender: ${populatedTender.title}`,
        "new-clarification-question", // Note: You would create this template
        {
          tenderManagerName: populatedTender.tenderManager.fullName || "Manager",
          tenderTitle: populatedTender.title,
          question: question,
          clarificationLink: `${process.env.FRONTEND_URL}/tenders/${tenderId}/clarifications`,
          year: new Date().getFullYear().toString(),
        }
      );
    }
    return clarification;
  }

  async answerClarification(clarificationId: string, response: string, userId: string): Promise<IClarification> {
    this.validateObjectId(clarificationId);
    this.validateObjectId(userId);

    const clarification = await Clarification.findById(clarificationId);
    if (!clarification) {
        throw new AppError("Clarification not found.", 404, ErrorType.NOT_FOUND);
    }

    clarification.response = response;
    clarification.responseBy = new mongoose.Types.ObjectId(userId);
    clarification.responseDate = new Date();
    clarification.status = ClarificationStatus.RESPONDED;

    await clarification.save();
     // Notify the bidder who asked the question
    const populatedClarification = await Clarification.findById(clarificationId)
      .populate({
        path: 'tenderId',
        select: 'title'
      })
      .populate({
        path: 'questionBy',
        populate: {
          path: 'userId',
          select: 'email fullName'
        }
      });

    if (!populatedClarification) {
      // Defensive check: if population failed for any reason, surface a clear error
      throw new AppError("Clarification not found after update.", 404, ErrorType.NOT_FOUND);
    }

    const tender = populatedClarification.tenderId as any;
    const bidder = populatedClarification.questionBy as any;

    if (bidder && bidder.userId && bidder.userId.email) {
      await notificationService.sendTemplateEmail(
        bidder.userId.email,
        `Response to your question on Tender: ${tender?.title || "Tender"}`,
        "clarification-answered", // Note: You would create this template
        {
          bidderName: bidder.userId.fullName || "Bidder",
          tenderTitle: tender?.title || "",
          question: populatedClarification.question,
          response: response,
          clarificationLink: `${process.env.FRONTEND_URL}/tenders/${(tender && tender._id) || ""}/clarifications`,
          year: new Date().getFullYear().toString(),
        }
      );
    }
    return clarification;
  }
}

export const biddingService = new BiddingService();