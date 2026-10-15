import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { biddingController } from "@/modules/bidding/controllers/bidding.controller";
import {
  createTenderSchema,
  updateTenderSchema,
  registerBidderSchema,
  submitBidSchema,
  askClarificationSchema,
  answerClarificationSchema,
  manageCommitteeMemberSchema,
} from "@/modules/bidding/validation/bidding.validation";
import { bidEvaluationController } from "../controllers/bidEvaluation.controller";
import { submitTechnicalScoreSchema } from "../validation/bidEvaluation.validation";
import { requireTenderCreator, requireTenderEvaluator } from "@/middleware/permissions.middleware";
import { canAccessFeature } from "@/middleware/plan.middleware";
import { upload } from "@/middleware/upload.middleware";
import { parseItemsMiddleware } from "@/middleware/parse.middleware";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { requireCompanyPermission } from "@/middleware/company-permissions.middleware";
import { Permissions } from "@/config/permissions";
import { auditWrite } from "@/middleware/audit.middleware";

const router = Router();
/**
 * @swagger
 * tags:
 *   name: Bidding
 *   description: Endpoints for tender and bid management
 */

// --- Tender Routes ---
/**
 * @swagger
 * /api/v1/bidding/tenders:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Create a new tender
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateTenderDTO'
 *     responses:
 *       201:
 *         description: Tender created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  "/tenders",
  authenticate,
  setActiveContext,
  requireCompanyPermission([Permissions.CREATE_TENDER.action]),
  canAccessFeature("canCreateTenders"),
  upload.any(),
  parseItemsMiddleware,
  validateRequest(createTenderSchema),
  auditWrite("Tender", "CREATE"),
  biddingController.createTender
);

/**
 * @swagger
 * /api/v1/bidding/tenders:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Get all tenders with optional filtering
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Published, Closed, Awarded, Cancelled]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Construction, Consultancy, Supply, Maintenance, Design & Build]
 *     responses:
 *       200:
 *         description: Tenders retrieved successfully
 */
router.get("/tenders", authenticate, setActiveContext,canAccessFeature("canAccessBidding"), biddingController.getAllTenders);

/**
 * @swagger
 * /api/v1/bidding/tenders/published:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: List all published tenders (global)
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [Construction, Consultancy, Supply, Maintenance, "Design & Build"]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Published tenders retrieved successfully
 */
router.get(
  "/tenders/published",
  authenticate, 
  setActiveContext,
  canAccessFeature("canAccessBidding"),
  biddingController.listPublishedTenders
);

/**
 * @swagger
 * /api/v1/bidding/tenders/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Get a single tender by its ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tender retrieved successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get("/tenders/:id", authenticate, setActiveContext, biddingController.getTenderById);

/**
 * @swagger
 * /api/v1/bidding/tenders/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Update a tender (only in Draft status)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTenderDTO'
 *     responses:
 *       200:
 *         description: Tender updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
router.patch(
  "/tenders/:id",
  authenticate,
  setActiveContext,
  requireTenderCreator(),
  upload.any(),
  parseItemsMiddleware, 
  validateRequest(updateTenderSchema),
  auditWrite("Tender", "UPDATE"),
  biddingController.updateTender
);

/**
 * @swagger
 * /api/v1/bidding/tenders/{id}/publish:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Publish a tender
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tender published successfully
 *       400:
 *         description: Tender is not in a publishable state
 */
router.post(
  "/tenders/:id/publish",
  authenticate,
  setActiveContext,
  requireTenderCreator(),
  auditWrite("Tender Publish", "CREATE"),
  biddingController.publishTender
);

/**
 * @swagger
 * /api/v1/bidding/tenders/{tenderId}/committee/eligible:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Get users eligible to be added to the evaluation committee
 *     parameters:
 *       - in: path
 *         name: tenderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Eligible committee members retrieved successfully
 */
router.get(
  "/tenders/:tenderId/committee/eligible",
  authenticate,
  setActiveContext,
  requireTenderCreator(),
  biddingController.getEligibleCommitteeMembers
);

/**
 * @swagger
 * /api/v1/bidding/tenders/{tenderId}/committee:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Add a user to the tender's evaluation committee
 *     parameters:
 *       - in: path
 *         name: tenderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The ID of the user to add to the committee.
 *     responses:
 *       200:
 *         description: Committee member added successfully
 *       404:
 *         description: Tender or User not found
 *       409:
 *         description: User is already in the committee
 */
router.post(
  "/tenders/:tenderId/committee",
  authenticate,
  setActiveContext,
  requireTenderCreator(),
  validateRequest(manageCommitteeMemberSchema),
  auditWrite("Tender Committee", "CREATE"),
  biddingController.addCommitteeMember
);

/**
 * @swagger
 * /api/v1/bidding/tenders/{tenderId}/committee/{memberId}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Remove a user from the tender's evaluation committee
 *     parameters:
 *       - in: path
 *         name: tenderId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Committee member removed successfully
 *       404:
 *         description: Tender or User not found in committee
 */
router.delete(
  "/tenders/:tenderId/committee/:memberId",
  authenticate,
  setActiveContext,
  requireTenderCreator(),
  auditWrite("Tender Committee", "DELETE"),
  biddingController.removeCommitteeMember
);

// --- Bid Evaluation Routes ---
/**
 * @swagger
 * /api/v1/bidding/tenders/{id}/open-bids:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Open all submitted bids for a tender for evaluation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the tender.
 *     responses:
 *       200:
 *         description: Bids opened successfully.
 *       400:
 *         description: Bid opening date has not been reached.
 */
router.post(
  "/tenders/:id/open-bids",
  authenticate,
  setActiveContext,
  requireTenderCreator(),
  bidEvaluationController.openBidsForTender
);

/**
 * @swagger
 * /api/v1/bidding/bids/{id}/technical-score:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Submit a technical evaluation score for a bid
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the bid.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               score:
 *                 type: number
 *               maxScore:
 *                 type: number
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Technical score submitted successfully.
 */
router.post(
  "/bids/:id/technical-score",
  authenticate,
  setActiveContext,
  requireTenderEvaluator({ isBid: true }),
  validateRequest(submitTechnicalScoreSchema),
  bidEvaluationController.submitTechnicalScore
);

/**
 * @swagger
 * /api/v1/bidding/bids/{id}/award:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Award a tender to a specific bid
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the winning bid.
 *     responses:
 *       200:
 *         description: Tender awarded successfully.
 *       409:
 *         description: Tender has already been awarded.
 */
router.post(
  "/bids/:id/award",
  authenticate,
  setActiveContext,
  requireTenderCreator(),
  auditWrite("Bid Award", "CREATE"),
  bidEvaluationController.awardTender
);

// --- Bidder Routes ---
/**
 * @swagger
 * /api/v1/bidding/bidders/register:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Register the current user as a bidder
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterBidderDTO'
 *     responses:
 *       201:
 *         description: Bidder profile created successfully
 *       409:
 *         description: Bidder profile already exists for this user
 */
router.post(
  "/bidders/register",
  authenticate,
  setActiveContext,
  upload.any(),
  parseItemsMiddleware,
  validateRequest(registerBidderSchema),
  auditWrite("Bidder Profile", "CREATE"),
  biddingController.registerBidder
);

/**
 * @swagger
 * /api/v1/bidding/bidders/profile:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Get the bidder profile for the current user
 *     responses:
 *       200:
 *         description: Bidder profile retrieved successfully
 *       404:
 *         description: Bidder profile not found for the current user
 */
router.get(
  "/bidders/profile",
  authenticate,
  setActiveContext,
  biddingController.getBidderProfile
);

// --- Bid Routes ---
/**
 * @swagger
 * /api/v1/bidding/bids:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Submit a bid for a tender
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/SubmitBidDTO'
 *     responses:
 *       201:
 *         description: Bid submitted successfully
 *       400:
 *         description: Submission deadline has passed
 *       409:
 *         description: A bid has already been submitted for this tender
 */
router.post(
  "/bids",
  authenticate,
  setActiveContext,
  canAccessFeature("canAccessBidding"),
  upload.any(),
  parseItemsMiddleware,
  validateRequest(submitBidSchema),
  auditWrite("Bidding", "CREATE"),
  biddingController.submitBid
);

/**
 * @swagger
 * /api/v1/bidding/bids/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Get bid details by ID
 *     description: Returns a bid. Financial proposal is hidden if the bid is sealed and the caller lacks access.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the bid
 *         schema:
 *           type: string
 *           pattern: "^[0-9a-fA-F]{24}$"
 *     responses:
 *       200:
 *         description: Bid retrieved successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Bid not found
 */
router.get(
  "/bids/:id",
  authenticate,
  setActiveContext,
  canAccessFeature("canAccessBidding"),
  biddingController.getBidById
);

/**
 * @swagger
 * /api/v1/bidding/tenders/{tenderId}/bids:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Get all bids submitted for a specific tender
 *     parameters:
 *       - in: path
 *         name: tenderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bids retrieved successfully
 */
router.get(
  "/tenders/:tenderId/bids",
  authenticate,
  setActiveContext,
  // requireTenderEvaluator(),
  biddingController.getBidsForTender
);

/**
 * @swagger
 * /api/v1/bidding/tenders/{tenderId}/clarifications:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Get all public clarifications for a tender
 *     parameters:
 *       - in: path
 *         name: tenderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clarifications retrieved successfully
 */
router.get(
  "/tenders/:tenderId/clarifications",
  authenticate,
  setActiveContext,
  biddingController.getClarificationsForTender
);

// --- Clarification Routes ---
/**
 * @swagger
 * /api/v1/bidding/clarifications:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Ask a question about a tender
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AskClarificationDTO'
 *     responses:
 *       201:
 *         description: Question submitted successfully
 *       400:
 *         description: Clarification deadline has passed
 */
router.post(
  "/clarifications",
  authenticate,
  setActiveContext,
  validateRequest(askClarificationSchema),
  biddingController.askClarification
);

/**
 * @swagger
 * /api/v1/bidding/clarifications/{id}/answer:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Bidding]
 *     summary: Provide an answer to a clarification question
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnswerClarificationDTO'
 *     responses:
 *       200:
 *         description: Answer posted successfully
 *       404:
 *         description: Clarification not found
 */
router.post(
  "/clarifications/:id/answer",
  authenticate,
  setActiveContext,
  requireTenderCreator(),
  validateRequest(answerClarificationSchema),
  auditWrite("Clarification Answer", "CREATE"),
  biddingController.answerClarification
);

export const biddingRouter = router;