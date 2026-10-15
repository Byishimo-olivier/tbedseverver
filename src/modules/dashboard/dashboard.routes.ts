import { Router } from "express";
import { authenticate } from "@/middleware/auth.middleware";
import { dashboardController } from "./dashboard.controller";
import { setActiveContext } from "@/middleware/activeContext.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/dashboard/summary:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get a summary of project and financial data for the dashboard.
 *     responses:
 *       200:
 *         description: Dashboard summary fetched successfully.
 */
router.get(
  "/summary",
  authenticate,
  setActiveContext,
  dashboardController.getDashboardSummary
);

/**
 * @swagger
 * /api/v1/dashboard/projects-health:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get health and efficiency metrics for all projects.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, on_hold, cancelled, in_progress]
 *         description: Filter projects by status.
 *     responses:
 *       200:
 *         description: Projects health data fetched successfully.
 */
router.get(
  "/projects-health",
  authenticate,
  setActiveContext,
  dashboardController.getProjectsHealth
);

/**
 * @swagger
 * /api/v1/dashboard/procurement-analytics:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get procurement analytics including MRs, POs, and supplier performance.
 *     responses:
 *       200:
 *         description: Procurement analytics fetched successfully.
 */
router.get(
  "/procurement-analytics",
  authenticate,
  setActiveContext,
  dashboardController.getProcurementAnalytics
);

/**
 * @swagger
 * /api/v1/dashboard/document-workflow:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get document workflow analytics including approval rates and times.
 *     responses:
 *       200:
 *         description: Document workflow analytics fetched successfully.
 */
router.get(
  "/document-workflow",
  authenticate,
  setActiveContext,
  dashboardController.getDocumentWorkflowAnalytics
);

/**
 * @swagger
 * /api/v1/dashboard/performance-matrix:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get key performance indicators like risk, delivery, and stock health.
 *     responses:
 *       200:
 *         description: Performance matrix fetched successfully.
 */
router.get(
  "/performance-matrix",
  authenticate,
  setActiveContext,
  dashboardController.getPerformanceMatrix
);

/**
 * @swagger
 * /api/v1/dashboard/bidding-analytics:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get bidding analytics including tenders and bids.
 *     responses:
 *       200:
 *         description: Bidding analytics fetched successfully.
 */
router.get(
  "/bidding-analytics",
  authenticate,
  setActiveContext,
  dashboardController.getBiddingAnalytics
);

/**
 * @swagger
 * /api/v1/dashboard/advanced-analytics:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get advanced analytics including efficiency, variance, and velocity.
 *     responses:
 *       200:
 *         description: Advanced analytics fetched successfully.
 */
router.get(
  "/advanced-analytics",
  authenticate,
  setActiveContext,
  dashboardController.getAdvancedAnalytics
);

/**
 * @swagger
 * /api/v1/dashboard/timeline-trends:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get project timeline trends including progress and delays.
 *     responses:
 *       200:
 *         description: Timeline trends fetched successfully.
 */
router.get(
  "/timeline-trends",
  authenticate,
  setActiveContext,
  dashboardController.getTimelineTrends
);

/**
 * @swagger
 * /api/v1/dashboard/cash-flow:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Dashboard]
 *     summary: Get cash flow data (expenses over time).
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [monthly, weekly]
 *           default: monthly
 *         description: The time period to group expenses by.
 *     responses:
 *       200:
 *         description: Cash flow data fetched successfully.
 */
router.get(
  "/cash-flow",
  authenticate,
  setActiveContext,
  dashboardController.getCashFlow
);

export const dashboardRouter = router;
