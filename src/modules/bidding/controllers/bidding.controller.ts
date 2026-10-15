import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "@/middleware/auth.middleware";
import { successResponse } from "@/utils/response";
import { logger } from "@/utils/logger";
import { biddingService } from "../services/bidding.service";
import { uploadService } from "@/modules/file/upload.service";

export class BiddingController {
  // --- Tender ---
  async createTender(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] || [];
      const processedTenderData: any = { ...req.body };

      if (req.activeCompanyId) {
        processedTenderData.companyId = req.activeCompanyId;
      }

      // Build documents array from files if metadata missing
      if (!processedTenderData.documents && files.length > 0) {
        const inferred: any[] = [];
        files.forEach(file => {
          const match = file.fieldname.match(/documents\[(\d+)\]\[file\]/);
            if (match) {
              const index = parseInt(match[1]);
              inferred[index] = inferred[index] || {
                description: `Tender document ${index + 1}`,
                documentType: "OTHER",
              };
            }
        });
        processedTenderData.documents = inferred.filter(Boolean);
      }

      if (Array.isArray(processedTenderData.documents) && files.length > 0) {
        const filesByIndex: Record<number, Express.Multer.File> = {};
        files.forEach(file => {
          const m = file.fieldname.match(/documents\[(\d+)\]\[file\]/);
          if (m) filesByIndex[parseInt(m[1])] = file;
        });

        for (let i = 0; i < processedTenderData.documents.length; i++) {
          const meta = processedTenderData.documents[i];
          const file = filesByIndex[i];
          if (!meta) continue;
          if (file) {
            const upload = await uploadService.saveFileDetails(
              req.user,
              file,
              meta.description || `Tender document ${i + 1}`
            );
            meta.filePath = upload.filePath;
          }
        }

        // Filter out any doc that lacks mandatory fields
        processedTenderData.documents = processedTenderData.documents.filter(
          (d: any) => d.filePath && d.documentType && d.description
        );
      }

      console.log("Final documents going to service:", processedTenderData.documents);

      const tender = await biddingService.createTender(processedTenderData, req.user!.id);
      res.status(201).json(successResponse(tender, "Tender created successfully."));
    } catch (error) {
      logger.error("Error creating tender:", error);
      next(error);
    }
  }

  async getAllTenders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.activeCompanyId;
      const tenders = await biddingService.getAllTenders(req.user!.id, req.query, companyId);
      res.json(successResponse(tenders, "Tenders retrieved successfully."));
    } catch (error) {
      logger.error("Error fetching tenders:", error);
      next(error);
    }
  }

  async listPublishedTenders(req: Request, res: Response, next: NextFunction) {
    try {
      const tenders = await biddingService.listPublishedTenders(req.query);
      res.json(successResponse(tenders, "Published tenders retrieved successfully."));
    } catch (error) {
      logger.error("Error fetching published tenders:", error);
      next(error);
    }
  }

  async getTenderById(req: Request, res: Response, next: NextFunction) {
    try {
      const tender = await biddingService.getTenderById(req.params.id);
      res.json(successResponse(tender, "Tender retrieved successfully."));
    } catch (error) {
      logger.error("Error fetching tender:", error);
      next(error);
    }
  }

  async updateTender(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const { replaceDocuments } = req.body as any;
      const updateData: any = { ...req.body };

      // If client sent documents metadata, enrich with uploaded files
      if (Array.isArray(updateData.documents) && files.length > 0) {
        const filesByIndex: Record<number, Express.Multer.File> = {};
        files.forEach((file) => {
          const m = file.fieldname.match(/documents\[(\d+)\]\[file\]/);
          if (m) filesByIndex[parseInt(m[1], 10)] = file;
        });

        for (let i = 0; i < updateData.documents.length; i++) {
          const meta = updateData.documents[i];
          if (!meta) continue;
          const f = filesByIndex[i];
          if (f) {
            const upload = await uploadService.saveFileDetails(
              req.user,
              f,
              meta.description || `Tender document ${i + 1}`
            );
            meta.filePath = upload.filePath;
          }
        }

        // Keep only valid documents (schema requires filePath, description, documentType)
        updateData.documents = updateData.documents.filter(
          (d: any) => d.filePath && d.description && d.documentType
        );
      } else if (!replaceDocuments) {
        // If not explicitly replacing, avoid wiping existing docs
        delete updateData.documents;
      }

      const tender = await biddingService.updateTender(req.params.id, updateData, req.user!.id);
      res.json(successResponse(tender, "Tender updated successfully."));
    } catch (error) {
      logger.error("Error updating tender:", error);
      next(error);
    }
  }

  async publishTender(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tender = await biddingService.publishTender(req.params.id, req.user!.id);
      res.json(successResponse(tender, "Tender published successfully."));
    } catch (error) {
      logger.error("Error publishing tender:", error);
      next(error);
    }
  }

  async getEligibleCommitteeMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tenderId } = req.params;
      const members = await biddingService.getEligibleCommitteeMembers(tenderId);
      res.json(successResponse(members, "Eligible committee members retrieved successfully."));
    } catch (error) {
      logger.error("Error fetching eligible committee members:", error);
      next(error);
    }
  }

  async addCommitteeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenderId = req.params.id || req.params.tenderId;
      const { userId: memberId } = req.body;
      const tender = await biddingService.addMemberToEvaluationCommittee(tenderId, memberId, req.user!.id);
      res.json(successResponse(tender, "Committee member added successfully."));
    } catch (error) {
      logger.error("Error adding committee member:", error);
      next(error);
    }
  }

  async removeCommitteeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { tenderId, memberId } = req.params;
      const tender = await biddingService.removeMemberFromEvaluationCommittee(tenderId, memberId, req.user!.id);
      res.json(successResponse(tender, "Committee member removed successfully."));
    } catch (error) {
      logger.error("Error removing committee member:", error);
      next(error);
    }
  }

  // --- Bidder ---
  async registerBidder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const processedBidderData = { ...req.body };

    // Process uploaded files for qualifications and profile documents
    if (files && files.length > 0) {
      const qualificationFilesByIndex: { [key: number]: Express.Multer.File } = {};
      const profileFilesByIndex: { [key: number]: Express.Multer.File } = {};
      
      files.forEach(file => {
        // Match qualification files
        const qualMatch = file.fieldname.match(/qualifications\[(\d+)\]\[file\]/);
        if (qualMatch) {
          const index = parseInt(qualMatch[1]);
          qualificationFilesByIndex[index] = file;
        }
        
        // Match profile document files
        const profileMatch = file.fieldname.match(/profileDocuments\[(\d+)\]\[file\]/);
        if (profileMatch) {
          const index = parseInt(profileMatch[1]);
          profileFilesByIndex[index] = file;
        }
      });

      // Process qualification documents
      if (processedBidderData.qualifications) {
        for (let i = 0; i < processedBidderData.qualifications.length; i++) {
          if (qualificationFilesByIndex[i]) {
            const file = qualificationFilesByIndex[i];
            const description = `${processedBidderData.qualifications[i].certificationType} certificate`;
            
            const upload = await uploadService.saveFileDetails(
              req.user,
              file,
              description
            );
            
            processedBidderData.qualifications[i].filePath = upload.filePath;
          }
        }
      }

      // Process profile documents
      if (processedBidderData.profileDocuments) {
        for (let i = 0; i < processedBidderData.profileDocuments.length; i++) {
          if (profileFilesByIndex[i]) {
            const file = profileFilesByIndex[i];
            const description = processedBidderData.profileDocuments[i].description || `Profile document ${i + 1}`;
            
            const upload = await uploadService.saveFileDetails(
              req.user,
              file,
              description
            );
            
            processedBidderData.profileDocuments[i].filePath = upload.filePath;
          }
        }
      }
    }

    const bidder = await biddingService.registerBidder(processedBidderData, req.user!.id);
    res.status(201).json(successResponse(bidder, "Bidder profile created successfully."));
  } catch (error) {
    logger.error("Error registering bidder:", error);
    next(error);
  }
}

  async getBidderProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bidder = await biddingService.getBidderProfileByUserId(req.user!.id);
      res.json(successResponse(bidder, "Bidder profile retrieved successfully."));
    } catch (error) {
      logger.error("Error fetching bidder profile:", error);
      next(error);
    }
  }

  // --- Bid ---
  async submitBid(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { tenderId, bidderId } = req.body;
    const files = req.files as Express.Multer.File[];

    // Process uploaded files and save them using uploadService
    const processedBidData = { ...req.body };

    if (files && files.length > 0) {
      // Group files by their field names for technical proposal
      const technicalFilesByIndex: { [key: number]: Express.Multer.File } = {};
      const financialFilesByIndex: { [key: number]: Express.Multer.File } = {};
      
      files.forEach(file => {
        // Match technical proposal files
        const techMatch = file.fieldname.match(/technicalProposal\[documents\]\[(\d+)\]\[file\]/);
        if (techMatch) {
          const index = parseInt(techMatch[1]);
          technicalFilesByIndex[index] = file;
        }
        
        // Match financial proposal files
        const finMatch = file.fieldname.match(/financialProposal\[documents\]\[(\d+)\]\[file\]/);
        if (finMatch) {
          const index = parseInt(finMatch[1]);
          financialFilesByIndex[index] = file;
        }
      });

      // Process technical proposal documents
      if (processedBidData.technicalProposal && processedBidData.technicalProposal.documents) {
        for (let i = 0; i < processedBidData.technicalProposal.documents.length; i++) {
          if (technicalFilesByIndex[i]) {
            const file = technicalFilesByIndex[i];
            const description = processedBidData.technicalProposal.documents[i].description || `Technical document ${i + 1}`;
            
            const upload = await uploadService.saveFileDetails(
              req.user,
              file,
              description
            );
            
            processedBidData.technicalProposal.documents[i].filePath = upload.filePath;
          }
        }
      }

      // Process financial proposal documents
      if (processedBidData.financialProposal && processedBidData.financialProposal.documents) {
        for (let i = 0; i < processedBidData.financialProposal.documents.length; i++) {
          if (financialFilesByIndex[i]) {
            const file = financialFilesByIndex[i];
            const description = processedBidData.financialProposal.documents[i].description || `Financial document ${i + 1}`;
            
            const upload = await uploadService.saveFileDetails(
              req.user,
              file,
              description
            );
            
            processedBidData.financialProposal.documents[i].filePath = upload.filePath;
          }
        }
      }
    }

    const bid = await biddingService.submitBid(tenderId, bidderId, processedBidData, req.user!.id);
    res.status(201).json(successResponse(bid, "Bid submitted successfully."));
  } catch (error) {
    logger.error("Error submitting bid:", error);
    next(error);
  }
}

async getBidById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bid = await biddingService.getBidById(req.params.id, req.user!.id);
      res.json(successResponse(bid, "Bid retrieved successfully."));
    } catch (error) {
      logger.error("Error fetching bid:", error);
      next(error);
    }
  }

  async getBidsForTender(req: Request, res: Response, next: NextFunction) {
    try {
      const bids = await biddingService.getBidsForTender(req.params.tenderId);
      res.json(successResponse(bids, "Bids retrieved successfully."));
    } catch (error) {
      logger.error("Error fetching bids:", error);
      next(error);
    }
  }

  async getClarificationsForTender(req: Request, res: Response, next: NextFunction) {
    try {
      const clarifications = await biddingService.getClarificationsForTender(req.params.tenderId);
      res.json(successResponse(clarifications, "Clarifications retrieved successfully."));
    } catch (error) {
      logger.error("Error fetching clarifications:", error);
      next(error);
    }
  }

  // --- Clarification ---
  async askClarification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bidderProfile = await biddingService.getBidderProfileByUserId(req.user!.id);
      const clarification = await biddingService.askClarification(req.body.tenderId, req.body.question, bidderProfile._id);
      res.status(201).json(successResponse(clarification, "Question submitted successfully."));
    } catch (error) {
      logger.error("Error asking clarification:", error);
      next(error);
    }
  }

  async answerClarification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const clarification = await biddingService.answerClarification(req.params.id, req.body.response, req.user!.id);
      res.json(successResponse(clarification, "Answer posted successfully."));
    } catch (error) {
      logger.error("Error answering clarification:", error);
      next(error);
    }
  }
}

export const biddingController = new BiddingController();