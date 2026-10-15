import { Router } from "express";
import { subscriptionController } from "./subscription.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { z } from "zod";
import { PlanId } from "@/config/plans";
import { auditWrite } from "@/middleware/audit.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/subscriptions/callbacks/pesapal:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Pesapal webhook callback
 *     description: Receives payment notifications from Pesapal
 *     responses:
 *       200:
 *         description: Callback acknowledged
 */
router.post(
  "/callbacks/pesapal",
  subscriptionController.handlePesapalCallback
);

// Validation schemas
const initiatePaymentSchema = z.object({
  body: z.object({
    planId: z.nativeEnum(PlanId),
    phoneNumber: z.string().optional(),
    companyId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional()
      .or(z.literal(""))
      .transform((val) => (val === "" ? undefined : val)),
    enableRecurring: z.boolean().optional().default(true),
  }),
});

const preApprovalSchema = z.object({
  body: z.object({
    phoneNumber: z.string().min(9, "Phone number is required"),
  }),
});

const manualSetPlanSchema = z.object({
  body: z.object({
    planId: z.nativeEnum(PlanId),
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    companyId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  }).refine(data => data.userId || data.companyId, {
    message: "Either userId or companyId must be provided",
  }),
});

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get all available subscription plans
 *     responses:
 *       200:
 *         description: Plans retrieved successfully
 */
router.get("/plans", subscriptionController.getPlans);

/**
 * @swagger
 * /api/v1/subscriptions/payment/initiate:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions]
 *     summary: Initiate a payment for subscription via Pesapal
 *     description: Creates a payment order and redirects to Pesapal hosted payment page
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 enum: [basic, professional, enterprise]
 *               phoneNumber:
 *                 type: string
 *                 description: Mobile money phone number (optional - Pesapal handles this on their page)
 *               companyId:
 *                 type: string
 *                 description: Company ID if purchasing for a company
 *     responses:
 *       201:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                     referenceId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     message:
 *                       type: string
 *                     redirectUrl:
 *                       type: string
 *                       description: URL to redirect user to Pesapal payment page
 */
router.post(
  "/payment/initiate",
  authenticate,
  setActiveContext,
  validateRequest(initiatePaymentSchema),
  auditWrite("Subscription", "CREATE"),
  subscriptionController.initiatePayment
);

/**
 * @swagger
 * /api/v1/subscriptions/payment/{paymentId}/status:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions]
 *     summary: Check payment status
 *     description: Checks the status of a payment and updates subscription if successful
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The payment ID from your database
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, successful, failed, cancelled, refunded]
 *                     planId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     paidAt:
 *                       type: string
 *                       format: date-time
 *                     failureReason:
 *                       type: string
 *                     message:
 *                       type: string
 */
router.get(
  "/payment/:paymentId/status",
  authenticate,
  subscriptionController.checkPaymentStatus
);

/**
 * @swagger
 * /api/v1/subscriptions/payment/{paymentId}/cancel:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions]
 *     summary: Cancel a pending payment
 *     description: Marks a pending payment as cancelled (e.g., user abandoned Pesapal page)
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment cancelled successfully
 */
router.post(
  "/payment/:paymentId/cancel",
  authenticate,
  subscriptionController.cancelPayment
);

/**
 * @swagger
 * /api/v1/subscriptions/status:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions]
 *     summary: Get current subscription status
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Company ID (optional, uses user if not provided)
 *     responses:
 *       200:
 *         description: Subscription status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isActive:
 *                       type: boolean
 *                     plan:
 *                       type: string
 *                     status:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     daysRemaining:
 *                       type: number
 *                     canRenew:
 *                       type: boolean
 *                     canUpgrade:
 *                       type: boolean
 */
router.get(
  "/status",
  authenticate,
  setActiveContext,
  subscriptionController.getSubscriptionStatus
);

/**
 * @swagger
 * /api/v1/subscriptions/payment/history:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions]
 *     summary: Get payment history
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Company ID to get payment history for
 *     responses:
 *       200:
 *         description: Payment history retrieved
 */
router.get(
  "/payment/history",
  authenticate,
  setActiveContext,
  subscriptionController.getPaymentHistory
);

/**
 * @swagger
 * /api/v1/subscriptions/pre-approval/request:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions]
 *     summary: Request pre-approval for recurring payments
 *     description: >
 *       Note: This endpoint is maintained for backward compatibility.
 *       Pesapal handles recurring payments differently.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Mobile money phone number
 *     responses:
 *       201:
 *         description: Pre-approval request sent
 */
router.post(
  "/pre-approval/request",
  authenticate,
  validateRequest(preApprovalSchema),
  auditWrite("Subscription Approval", "CREATE"),
  subscriptionController.requestPreApproval
);

/**
 * @swagger
 * /api/v1/subscriptions/pre-approval/{referenceId}/status:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions]
 *     summary: Check pre-approval status
 *     parameters:
 *       - in: path
 *         name: referenceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pre-approval status retrieved
 */
router.get(
  "/pre-approval/:referenceId/status",
  authenticate,
  subscriptionController.checkPreApprovalStatus
);

/**
 * @swagger
 * /api/v1/subscriptions/pesapal/payment-methods:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions, Pesapal]
 *     summary: Get available Pesapal payment methods for Rwanda
 *     description: Returns all payment methods available through Pesapal in Rwanda including mobile money and cards
 *     responses:
 *       200:
 *         description: Payment methods retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment_methods:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           type:
 *                             type: string
 *                           currencies:
 *                             type: array
 *                             items:
 *                               type: string
 */
router.get(
  "/pesapal/payment-methods",
  authenticate,
  subscriptionController.getPesapalPaymentMethods
);

/**
 * @swagger
 * /api/v1/subscriptions/pesapal/transaction/{orderTrackingId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions, Pesapal]
 *     summary: Get Pesapal transaction status
 *     description: Get detailed transaction status directly from Pesapal
 *     parameters:
 *       - in: path
 *         name: orderTrackingId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Pesapal order tracking ID
 *     responses:
 *       200:
 *         description: Transaction status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderTrackingId:
 *                       type: string
 *                     merchantReference:
 *                       type: string
 *                     status:
 *                       type: string
 *                     statusCode:
 *                       type: number
 *                     statusMessage:
 *                       type: string
 *                     paymentMethod:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     paymentDate:
 *                       type: string
 *                     confirmationCode:
 *                       type: string
 */
router.get(
  "/pesapal/transaction/:orderTrackingId",
  authenticate,
  subscriptionController.getPesapalTransactionStatus
);

/**
 * @swagger
 * /api/v1/subscriptions/payments/reconcile:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Subscriptions, Admin]
 *     summary: Reconcile pending payments
 *     description: Admin only - reconciles pending payments with Pesapal
 *     responses:
 *       200:
 *         description: Reconciliation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 */
router.post(
  "/payments/reconcile",
  authenticate,
  // Add admin middleware here if you have one
  // isAdmin,
  subscriptionController.reconcilePendingPayments
);

// Dev-only endpoint for manual plan setting
if (process.env.NODE_ENV !== "production") {
  /**
   * @swagger
   * /api/v1/subscriptions/set-plan-manually:
   *   post:
   *     tags: [Subscriptions, Dev]
   *     summary: (DEV ONLY) Manually set a subscription plan
   *     description: Development only - allows admins to manually set a user or company subscription plan
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - planId
   *             properties:
   *               planId:
   *                 type: string
   *                 enum: [basic, professional, enterprise]
   *               userId:
   *                 type: string
   *                 description: User ID (if setting for a user)
   *               companyId:
   *                 type: string
   *                 description: Company ID (if setting for a company)
   *     responses:
   *       200:
   *         description: Plan updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     success:
   *                       type: boolean
   *                     message:
   *                       type: string
   */
  router.post(
    "/set-plan-manually",
    authenticate,
    setActiveContext,
    validateRequest(manualSetPlanSchema),
    auditWrite("Subscription Manual", "CREATE"),
    subscriptionController.manuallySetPlan
  );
}

export const subscriptionRouter = router;