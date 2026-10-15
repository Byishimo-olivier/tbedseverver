import { Request, Response, NextFunction } from "express";
import { subscriptionService } from "./subscription.service";
import { pesapalService } from "./pesapal.service";
import { AuthRequest } from "@/middleware/auth.middleware";
import { successResponse } from "@/utils/response";
import { logger } from "@/utils/logger";

export class SubscriptionController {
  /**
   * Get all available subscription plans
   */
  getPlans(_req: Request, res: Response): Response {
    const plans = subscriptionService.getPlans();
    return res.json(successResponse(plans, "Plans retrieved successfully"));
  }

  /**
   * Initiate a payment for subscription via Pesapal
   */
  async initiatePayment(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { planId, phoneNumber, companyId, enableRecurring } = req.body;
      const userId = req.user!.id;

      const result = await subscriptionService.initiatePayment(
        planId,
        phoneNumber,
        companyId ? undefined : userId,
        companyId,
        enableRecurring
      );

      return res.status(201).json(successResponse(result, "Payment initiated successfully"));
    } catch (error) {
      logger.error("Error initiating payment:", error);
      next(error);
      return;
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { paymentId } = req.params;
      const result = await subscriptionService.checkPaymentStatus(paymentId);
      return res.json(successResponse(result, "Payment status retrieved"));
    } catch (error) {
      logger.error("Error checking payment status:", error);
      next(error);
      return;
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { companyId } = req.query;
      const userId = req.user!.id;

      const status = await subscriptionService.getSubscriptionStatus(
        companyId ? undefined : userId,
        companyId as string
      );

      return res.json(successResponse(status, "Subscription status retrieved"));
    } catch (error) {
      logger.error("Error fetching subscription status:", error);
      next(error);
      return;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { companyId } = req.query;
      const userId = req.user!.id;

      const payments = await subscriptionService.getPaymentHistory(
        companyId ? undefined : userId,
        companyId as string
      );

      return res.json(successResponse(payments, "Payment history retrieved"));
    } catch (error) {
      logger.error("Error fetching payment history:", error);
      next(error);
      return;
    }
  }

  /**
   * Request pre-approval for recurring payments
   * Note: This is not supported by Pesapal in the same way as mobile money
   */
  async requestPreApproval(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { phoneNumber } = req.body;
      const referenceId = await subscriptionService.requestPreApproval(phoneNumber);

      return res.status(201).json(
        successResponse(
          { referenceId },
          "Pre-approval request sent. Please approve on your phone."
        )
      );
    } catch (error) {
      logger.error("Error requesting pre-approval:", error);
      next(error);
      return;
    }
  }

  /**
   * Check pre-approval status
   */
  async checkPreApprovalStatus(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { referenceId } = req.params;
      const result = await subscriptionService.checkPreApprovalStatus(referenceId);
      return res.json(successResponse(result, "Pre-approval status retrieved"));
    } catch (error) {
      logger.error("Error checking pre-approval status:", error);
      next(error);
      return;
    }
  }

  /**
   * Manually set plan (dev/admin only)
   */
  async manuallySetPlan(
    req: Request, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { planId, userId, companyId } = req.body;
      const result = await subscriptionService.manuallySetPlan(planId, userId, companyId);
      return res.json(successResponse(result, "Plan updated successfully"));
    } catch (error) {
      logger.error("Error manually setting plan:", error);
      next(error);
      return;
    }
  }

  /**
   * Handle Pesapal callback/webhook for payment notifications
   */
  async handlePesapalCallback(
    req: Request, 
    res: Response, 
    _next: NextFunction
  ): Promise<Response> {
    try {
      logger.info(`Received Pesapal callback: ${JSON.stringify(req.body)}`);
      
      const payloads = Array.isArray(req.body) ? req.body : [req.body];

      for (const payload of payloads) {
        const orderTrackingId = payload.order_tracking_id || payload.orderTrackingId;
        const merchantReference = payload.merchant_reference || payload.merchantReference;
        const status = payload.status || payload.payment_status;
        const statusDescription = payload.payment_status_description || payload.statusDescription;

        const trackingId = orderTrackingId || merchantReference;

        if (!trackingId) {
          logger.warn("Pesapal callback received without tracking ID:", payload);
          continue;
        }

        logger.info(`Processing Pesapal callback for order: ${trackingId}, status: ${status}`);

        try {
          const verification = await pesapalService.getTransactionStatus(trackingId);
          
          if (verification.status === 'COMPLETED') {
            await subscriptionService.handlePesapalCallback(trackingId, true, verification.statusMessage);
            logger.info(`Payment confirmed for ${trackingId} via callback verification`);
          } else if (verification.status === 'FAILED') {
            await subscriptionService.handlePesapalCallback(trackingId, false, verification.statusMessage);
            logger.warn(`Payment failed for ${trackingId}: ${verification.statusMessage}`);
          } else {
            logger.info(`Callback for ${trackingId} has status ${verification.status} - ignoring`);
          }
        } catch (verifyError) {
          logger.error(`Error verifying payment ${trackingId}:`, verifyError);
          
          const isSuccessful = status === 'COMPLETED' || status === 'SUCCESS' || status === '1';
          await subscriptionService.handlePesapalCallback(
            trackingId,
            isSuccessful,
            statusDescription || 'Payment status unknown'
          );
        }
      }

      return res.sendStatus(200);
    } catch (error) {
      logger.error("Error handling Pesapal callback:", error);
      return res.sendStatus(200);
    }
  }

  /**
   * Get available Pesapal payment methods for the current country
   */
  async getPesapalPaymentMethods(
    _req: Request, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const methods = await subscriptionService.getPesapalPaymentMethods();
      return res.json(successResponse(methods, "Payment methods retrieved successfully"));
    } catch (error) {
      logger.error("Error getting Pesapal payment methods:", error);
      next(error);
      return;
    }
  }

  /**
   * Get Pesapal transaction status for a specific order
   * Useful for manual checks or debugging
   */
  async getPesapalTransactionStatus(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { orderTrackingId } = req.params;

      if (!orderTrackingId) {
        return res.status(400).json({
          success: false,
          message: "Order tracking ID is required",
        });
      }

      const status = await pesapalService.getTransactionStatus(orderTrackingId);
      return res.json(successResponse(status, "Transaction status retrieved"));
    } catch (error) {
      logger.error("Error getting Pesapal transaction status:", error);
      next(error);
      return;
    }
  }

  /**
   * Reconcile pending payments manually
   * This can be triggered by an admin or a scheduled job
   */
  async reconcilePendingPayments(
    _req: Request, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      await subscriptionService.reconcilePendingPayments();
      return res.json(
        successResponse(
          { message: "Payment reconciliation completed" },
          "Pending payments reconciled successfully"
        )
      );
    } catch (error) {
      logger.error("Error reconciling pending payments:", error);
      next(error);
      return;
    }
  }

  /**
   * Cancel a pending payment
   */
  async cancelPayment(
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { paymentId } = req.params;
      const result = await subscriptionService.cancelPendingPayment(paymentId);
      return res.json(successResponse(result, "Payment cancelled successfully"));
    } catch (error) {
      logger.error("Error cancelling payment:", error);
      next(error);
      return;
    }
  }
}

export const subscriptionController = new SubscriptionController();