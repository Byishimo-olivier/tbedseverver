import { AppError, ErrorType } from "@/utils/exceptions";
import { PlanId, getPlanById, plans } from "@/config/plans";
import { User } from "@/modules/users/user.model";
import { Company } from "@/modules/users/company/company.model";
import { Payment, PaymentStatus, PaymentProvider, IPayment } from "./payment.model";
import { pesapalService } from "./pesapal.service";
import { logger } from "@/utils/logger";
import { notificationService } from "@/modules/notifications/notifcation.service";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface InitiatePaymentResult {
  paymentId: string;
  referenceId: string;
  status: PaymentStatus;
  message: string;
  redirectUrl?: string;
}

export interface PaymentStatusResult {
  paymentId: string;
  status: PaymentStatus;
  planId: PlanId;
  amount: number;
  paidAt?: Date;
  failureReason?: string;
  message?: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan: PlanId;
  status: string;
  startDate?: Date;
  endDate?: Date;
  daysRemaining?: number;
  canRenew: boolean;
  canUpgrade: boolean;
}

export class SubscriptionService {
  /**
   * Get all available plans
   */
  getPlans() {
    return Object.values(plans).filter(p => p.price >= 0);
  }

  /**
   * Get current subscription status for user or company
   */
  async getSubscriptionStatus(
    userId?: string,
    companyId?: string
  ): Promise<SubscriptionStatus> {
    if (!userId && !companyId) {
      throw new AppError(
        "Either userId or companyId must be provided.",
        400,
        ErrorType.VALIDATION
      );
    }

    const now = new Date();
    let entity: any;

    if (companyId) {
      entity = await Company.findById(companyId).select(
        "plan subscriptionStatus subscriptionStartDate subscriptionEndDate"
      );
      if (!entity) {
        throw new AppError("Company not found.", 404, ErrorType.NOT_FOUND);
      }
    } else {
      entity = await User.findById(userId).select(
        "plan subscriptionStatus subscriptionStartDate subscriptionEndDate"
      );
      if (!entity) {
        throw new AppError("User not found.", 404, ErrorType.NOT_FOUND);
      }
    }

    const isActive = 
      entity.subscriptionStatus === "active" &&
      entity.subscriptionEndDate &&
      new Date(entity.subscriptionEndDate) > now;

    const daysRemaining = entity.subscriptionEndDate
      ? Math.max(0, Math.ceil(
          (new Date(entity.subscriptionEndDate).getTime() - now.getTime()) / 
          (1000 * 60 * 60 * 24)
        ))
      : 0;

    const currentPlan = getPlanById(entity.plan);
    const canUpgrade = currentPlan 
      ? Object.values(plans).some(p => p.price > currentPlan.price)
      : true;

    // Can renew if subscription is active and within 7 days of expiry, or if expired
    const canRenew = 
      entity.subscriptionStatus === "expired" ||
      (isActive && daysRemaining <= 7);

    return {
      isActive,
      plan: entity.plan,
      status: entity.subscriptionStatus,
      startDate: entity.subscriptionStartDate,
      endDate: entity.subscriptionEndDate,
      daysRemaining: isActive ? daysRemaining : 0,
      canRenew,
      canUpgrade,
    };
  }

  /**
   * Initiate a payment via Pesapal for subscription
   */
  async initiatePayment(
    planId: PlanId,
    phoneNumber?: string,
    userId?: string,
    companyId?: string,
    enableRecurring: boolean = true
  ): Promise<InitiatePaymentResult> {
    if (!userId && !companyId) {
      throw new AppError(
        "Either userId or companyId must be provided.",
        400,
        ErrorType.VALIDATION
      );
    }

    const plan = getPlanById(planId);
    if (!plan) {
      throw new AppError("Invalid plan ID provided.", 400, ErrorType.VALIDATION);
    }

    if (plan.price <= 0) {
      throw new AppError(
        "This plan cannot be purchased. Please contact sales for Enterprise plans.",
        400,
        ErrorType.VALIDATION
      );
    }

    const now = new Date();

    if (companyId) {
      const company = await Company.findById(companyId);
      if (!company) {
        throw new AppError("Company not found.", 404, ErrorType.NOT_FOUND);
      }

      // Check if company has an active subscription that's not expiring soon
      const hasActiveSubscription = 
        company.subscriptionStatus === "active" &&
        company.subscriptionEndDate &&
        new Date(company.subscriptionEndDate) > now;

      if (hasActiveSubscription) {
        const daysRemaining = Math.ceil(
          (new Date(company.subscriptionEndDate!).getTime() - now.getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        const currentPlan = getPlanById(company.plan);
        const isUpgrade = currentPlan && plan.price > currentPlan.price;
        const isSamePlan = planId === company.plan;
        const canRenewEarly = daysRemaining <= 7;

        // Block if: same plan AND more than 7 days remaining
        if (isSamePlan && !canRenewEarly) {
          throw new AppError(
            `Company already has an active ${currentPlan?.name} subscription until ${company.subscriptionEndDate!.toLocaleDateString()}. You can renew within 7 days of expiry.`,
            400,
            ErrorType.VALIDATION
          );
        }

        // Block if: trying to downgrade
        if (!isUpgrade && !isSamePlan) {
          throw new AppError(
            `Cannot downgrade while subscription is active. Current plan expires on ${company.subscriptionEndDate!.toLocaleDateString()}.`,
            400,
            ErrorType.VALIDATION
          );
        }
      }
    } else if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        throw new AppError("User not found.", 404, ErrorType.NOT_FOUND);
      }

      const hasActiveSubscription = 
        user.subscriptionStatus === "active" &&
        user.subscriptionEndDate &&
        new Date(user.subscriptionEndDate) > now;

      if (hasActiveSubscription) {
        const daysRemaining = Math.ceil(
          (new Date(user.subscriptionEndDate!).getTime() - now.getTime()) / 
          (1000 * 60 * 60 * 24)
        );

        const currentPlan = getPlanById(user.plan);
        const isUpgrade = currentPlan && plan.price > currentPlan.price;
        const isSamePlan = planId === user.plan;
        const canRenewEarly = daysRemaining <= 7;

        if (isSamePlan && !canRenewEarly) {
          throw new AppError(
            `You already have an active ${currentPlan?.name} subscription until ${user.subscriptionEndDate!.toLocaleDateString()}. You can renew within 7 days of expiry.`,
            400,
            ErrorType.VALIDATION
          );
        }

        if (!isUpgrade && !isSamePlan) {
          throw new AppError(
            `Cannot downgrade while subscription is active. Current plan expires on ${user.subscriptionEndDate!.toLocaleDateString()}.`,
            400,
            ErrorType.VALIDATION
          );
        }
      }
    }

    // Check for pending payments to prevent duplicate requests
    const pendingPayment = await Payment.findOne({
      ...(companyId 
        ? { companyId: new mongoose.Types.ObjectId(companyId) }
        : { userId: new mongoose.Types.ObjectId(userId) }),
      status: PaymentStatus.PENDING,
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });

    if (pendingPayment) {
      throw new AppError(
        "You have a pending payment. Please complete or wait for it to expire before initiating a new one.",
        400,
        ErrorType.VALIDATION
      );
    }

    const orderTrackingId = uuidv4();

    // Create payment record BEFORE calling the API
    const payment = new Payment({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      companyId: companyId ? new mongoose.Types.ObjectId(companyId) : undefined,
      planId,
      amount: plan.price,
      currency: "RWF",
      provider: PaymentProvider.PESAPAL,
      providerReferenceId: orderTrackingId,
      status: PaymentStatus.PENDING,
      phoneNumber: phoneNumber || undefined,
      metadata: {
        planName: plan.name,
        initiatedAt: new Date().toISOString(),
        phoneNumber: phoneNumber || undefined,
      },
    });

    await payment.save();

    let redirectUrl: string | undefined;

    try {
      // Get user/company details for billing
      let email = "";
      let firstName = "";
      let lastName = "";
      let entityName = "";

      if (companyId) {
        const company = await Company.findById(companyId);
        email = company?.email || "";
        firstName = company?.name || "";
        entityName = company?.name || "Company";
      } else if (userId) {
        const user = await User.findById(userId);
        email = user?.email || "";
        const nameParts = user?.fullName?.split(" ") || [];
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
        entityName = user?.fullName || "User";
      }

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      // Submit order to Pesapal
      const submitOrderParams: Parameters<typeof pesapalService.submitOrder>[0] = {
        orderTrackingId,
        amount: plan.price,
        currency: "RWF",
        description: `Subscription to ${plan.name} plan - ${entityName}`,
        email,
        firstName,
        lastName,
        phoneNumber,
        returnUrl: `${frontendUrl}/payment/result`,
        cancelUrl: `${frontendUrl}/billing`,
      };

      // Enable recurring / auto-renewal option on Pesapal iframe
      if (enableRecurring) {
        const now = new Date();
        const oneYearLater = new Date(now);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        const formatDate = (d: Date) =>
          `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

        submitOrderParams.accountNumber = companyId || userId;
        submitOrderParams.subscriptionDetails = {
          startDate: formatDate(now),
          endDate: formatDate(oneYearLater),
          frequency: 'MONTHLY',
        };
      }

      const orderResult = await pesapalService.submitOrder(submitOrderParams);

      // Save Pesapal tracking information
      payment.providerOrderTrackingId = orderResult.pesapalTrackingId;
      payment.metadata = {
        ...payment.metadata,
        pesapalMerchantReference: orderResult.pesapalMerchantReference,
        pesapalTrackingId: orderResult.pesapalTrackingId,
      };
      await payment.save();

      redirectUrl = orderResult.redirectUrl;

      logger.info(`Pesapal Payment initiated: ${payment._id} with orderTrackingId: ${orderTrackingId}`);
    } catch (error) {
      // If the Pesapal API call fails, mark the payment as FAILED
      payment.status = PaymentStatus.FAILED;
      payment.failureReason = error instanceof Error ? error.message : "Failed to initiate payment with provider";
      await payment.save();
      throw error;
    }

    return {
      paymentId: payment._id.toString(),
      referenceId: orderTrackingId,
      status: PaymentStatus.PENDING,
      message: "Please complete the payment on the Pesapal page.",
      redirectUrl,
    };
  }

  /**
   * Check payment status and update subscription if successful
   */
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatusResult> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError("Payment not found.", 404, ErrorType.NOT_FOUND);
    }

    // If already finalized, return current status
    if (payment.status === PaymentStatus.SUCCESSFUL) {
      return {
        paymentId: payment._id.toString(),
        status: payment.status,
        planId: payment.planId,
        amount: payment.amount,
        paidAt: payment.paidAt,
        message: "Payment successful! Your subscription is now active.",
      };
    }

    if (payment.status === PaymentStatus.FAILED) {
      return {
        paymentId: payment._id.toString(),
        status: payment.status,
        planId: payment.planId,
        amount: payment.amount,
        failureReason: payment.failureReason,
        message: "Payment failed. Please try again.",
      };
    }

    // Check Pesapal status using order tracking ID
    let pesapalStatus;
    try {
      // Use the Pesapal tracking ID (from submitOrder response) for status lookup
      // Fall back to providerReferenceId (our UUID stored as merchant_reference)
      const pesapalTrackingId = payment.providerOrderTrackingId || payment.providerReferenceId;
      pesapalStatus = await pesapalService.getTransactionStatus(pesapalTrackingId);
    } catch (error) {
      logger.error(`Error checking Pesapal status for ${payment.providerOrderTrackingId || payment.providerReferenceId}:`, error);
      // If payment is older than 30 minutes, mark as failed
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      if (payment.createdAt < thirtyMinutesAgo) {
        await this.handleFailedPayment(payment, "Payment timeout - no response from provider");
        const updatedPayment = await Payment.findById(paymentId);
        return {
          paymentId: updatedPayment!._id.toString(),
          status: updatedPayment!.status,
          planId: updatedPayment!.planId,
          amount: updatedPayment!.amount,
          failureReason: updatedPayment!.failureReason,
          message: "Payment timed out. Please try again.",
        };
      }
      // Otherwise, keep as pending
      return {
        paymentId: payment._id.toString(),
        status: PaymentStatus.PENDING,
        planId: payment.planId,
        amount: payment.amount,
        message: "Payment is pending. Please complete the payment on the Pesapal page.",
      };
    }

    if (pesapalStatus.status === "COMPLETED") {
      await this.handleSuccessfulPayment(payment, pesapalStatus.confirmationCode || pesapalStatus.orderTrackingId);
    } else if (pesapalStatus.status === "FAILED") {
      await this.handleFailedPayment(payment, pesapalStatus.statusMessage || "Payment failed");
    }
    // PENDING or NOT_FOUND leaves it pending

    // Refresh payment data
    const updatedPayment = await Payment.findById(paymentId);

    let message: string;
    switch (updatedPayment!.status) {
      case PaymentStatus.SUCCESSFUL:
        message = "Payment successful! Your subscription is now active.";
        break;
      case PaymentStatus.FAILED:
        message = "Payment failed. Please try again.";
        break;
      case PaymentStatus.PENDING:
      default:
        message = "Payment is pending. Please complete the payment on the Pesapal page.";
        break;
    }

    return {
      paymentId: updatedPayment!._id.toString(),
      status: updatedPayment!.status,
      planId: updatedPayment!.planId,
      amount: updatedPayment!.amount,
      paidAt: updatedPayment!.paidAt,
      failureReason: updatedPayment!.failureReason,
      message,
    };
  }

  /**
   * Handle successful payment - activate subscription
   */
  private async handleSuccessfulPayment(
    payment: IPayment,
    transactionId?: string
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      payment.status = PaymentStatus.SUCCESSFUL;
      payment.providerTransactionId = transactionId;
      payment.paidAt = new Date();
      await payment.save({ session });

      const now = new Date();
      let currentEndDate: Date | undefined;
      let entityName = "";

      // Get current subscription end date for extension
      if (payment.companyId) {
        const company = await Company.findById(payment.companyId).session(session);
        if (company?.subscriptionEndDate && new Date(company.subscriptionEndDate) > now) {
          currentEndDate = new Date(company.subscriptionEndDate);
        }
        entityName = company?.name || "Company";
      } else if (payment.userId) {
        const user = await User.findById(payment.userId).session(session);
        if (user?.subscriptionEndDate && new Date(user.subscriptionEndDate) > now) {
          currentEndDate = new Date(user.subscriptionEndDate);
        }
        entityName = user?.fullName || "User";
      }

      // Calculate new end date (extend if renewing, otherwise from now)
      const newEndDate = this.calculateEndDate(currentEndDate);
      const startDate = currentEndDate && currentEndDate > now ? currentEndDate : now;

      const subscriptionDetails = {
        plan: payment.planId,
        subscriptionId: `pesapal-${payment.providerReferenceId}`,
        subscriptionStatus: "active",
        subscriptionStartDate: startDate,
        subscriptionEndDate: newEndDate,
      };

      if (payment.companyId) {
        await Company.findByIdAndUpdate(
          payment.companyId,
          { $set: subscriptionDetails },
          { new: true, session }
        );
      } else if (payment.userId) {
        await User.findByIdAndUpdate(
          payment.userId,
          { $set: subscriptionDetails },
          { new: true, session }
        );
      }

      await session.commitTransaction();

      logger.info(
        `Subscription activated for ${entityName} with plan ${payment.planId}, expires: ${newEndDate.toISOString()}`
      );

      await this.sendPaymentConfirmation(payment, entityName, newEndDate);
    } catch (error) {
      await session.abortTransaction();
      logger.error("Failed to process successful payment:", error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(
    payment: IPayment,
    reason?: string
  ): Promise<void> {
    payment.status = PaymentStatus.FAILED;
    payment.failureReason = reason || "Payment was declined";
    await payment.save();

    logger.warn(
      `Payment failed: ${payment._id}, Reason: ${payment.failureReason}`
    );
  }

  /**
   * Calculate subscription end date
   * If extending, add 30 days to current end date
   * Otherwise, 30 days from now
   */
  private calculateEndDate(currentEndDate?: Date): Date {
    const baseDate = currentEndDate && currentEndDate > new Date() 
      ? new Date(currentEndDate) 
      : new Date();
    baseDate.setDate(baseDate.getDate() + 30);
    return baseDate;
  }

  /**
   * Send payment confirmation notification
   */
  private async sendPaymentConfirmation(
    payment: IPayment,
    entityName: string,
    endDate: Date
  ): Promise<void> {
    try {
      const plan = getPlanById(payment.planId);
      let email: string | undefined;

      if (payment.userId) {
        const user = await User.findById(payment.userId).select("email");
        email = user?.email;
      } else if (payment.companyId) {
        const company = await Company.findById(payment.companyId).select("email");
        email = company?.email;
      }

      if (email) {
        await notificationService.sendTemplateEmail(
          email,
          "Payment Successful - Subscription Activated",
          "payment-success",
          {
            entityName,
            planName: plan?.name || payment.planId,
            amount: payment.amount.toString(),
            currency: payment.currency,
            transactionId: payment.providerTransactionId || payment.providerReferenceId,
            date: new Date().toLocaleDateString(),
            expiryDate: endDate.toLocaleDateString(),
            year: new Date().getFullYear().toString(),
            dashboardUrl: `${process.env.FRONTEND_URL}/dashboard`,
          }
        );
      }
    } catch (error) {
      logger.error("Failed to send payment confirmation:", error);
    }
  }

  /**
   * Get payment history for user or company
   */
  async getPaymentHistory(
    userId?: string,
    companyId?: string
  ): Promise<IPayment[]> {
    if (!userId && !companyId) {
      throw new AppError(
        "Either userId or companyId must be provided.",
        400,
        ErrorType.VALIDATION
      );
    }

    const query: any = {};
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);
    if (companyId) query.companyId = new mongoose.Types.ObjectId(companyId);

    return Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
  }

  /**
   * Request pre-approval for recurring payments
   * Note: Pesapal handles recurring payments differently - this is a placeholder
   */
  async requestPreApproval(_phoneNumber: string): Promise<string> {
    // For Pesapal, recurring payments are handled through their recurring billing feature
    // This would need to be implemented based on Pesapal's recurring API
    logger.warn("Pre-approval for recurring payments not implemented for Pesapal");
    throw new AppError(
      "Recurring payment pre-approval is not available. Please use Pesapal's recurring billing feature.",
      400,
      ErrorType.VALIDATION
    );
  }

  /**
   * Check pre-approval status
   */
  async checkPreApprovalStatus(_referenceId: string) {
    logger.warn("Pre-approval status check not implemented for Pesapal");
    throw new AppError(
      "Pre-approval status check is not available for Pesapal.",
      400,
      ErrorType.VALIDATION
    );
  }

  /**
   * Manually set plan (for admin/testing purposes)
   */
  async manuallySetPlan(
    planId: PlanId,
    userId?: string,
    companyId?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!userId && !companyId) {
      throw new AppError(
        "Either userId or companyId must be provided.",
        400,
        ErrorType.VALIDATION
      );
    }

    const plan = getPlanById(planId);
    if (!plan) {
      throw new AppError("Invalid plan ID provided.", 400, ErrorType.VALIDATION);
    }

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const subscriptionDetails = {
      plan: planId,
      subscriptionId: `manual-override-${Date.now()}`,
      subscriptionStatus: "active",
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
    };

    if (companyId) {
      const company = await Company.findByIdAndUpdate(
        companyId,
        { $set: subscriptionDetails },
        { new: true, upsert: false }
      );
      if (!company)
        throw new AppError("Company not found.", 404, ErrorType.NOT_FOUND);

      logger.info(`Company plan updated: ${company.name} -> ${company.plan}`);
      return {
        success: true,
        message: `Company '${company.name}' is now on the ${plan.name} plan until ${endDate.toLocaleDateString()}.`,
      };
    }

    if (userId) {
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: subscriptionDetails },
        { new: true, upsert: false }
      );
      if (!user)
        throw new AppError("User not found.", 404, ErrorType.NOT_FOUND);

      logger.info(`User plan updated: ${user.fullName} -> ${user.plan}`);
      return {
        success: true,
        message: `User '${user.fullName}' is now on the ${plan.name} plan until ${endDate.toLocaleDateString()}.`,
      };
    }

    throw new AppError("Could not update plan.", 500, ErrorType.INTERNAL);
  }

  /**
   * Handle Pesapal callback/webhook
   */
  async handlePesapalCallback(
    orderTrackingId: string, 
    success: boolean, 
    failureReason?: string
  ): Promise<void> {
    // Find payment by providerReferenceId (orderTrackingId)
    let payment = await Payment.findOne({ providerReferenceId: orderTrackingId });
    
    // Also check providerOrderTrackingId if it exists
    if (!payment) {
      payment = await Payment.findOne({ providerOrderTrackingId: orderTrackingId });
    }

    // If still not found, check if it's a valid ObjectId
    if (!payment && mongoose.Types.ObjectId.isValid(orderTrackingId)) {
      payment = await Payment.findOne({ _id: orderTrackingId });
    }

    if (!payment) {
      logger.warn(`Pesapal callback received for unknown order: ${orderTrackingId}`);
      return;
    }

    // Verify the payment status with Pesapal to confirm
    try {
      const verification = await pesapalService.getTransactionStatus(
        payment.providerOrderTrackingId || payment.providerReferenceId
      );
      
      // Use the verification result to confirm
      if (verification.status === "COMPLETED") {
        await this.handleSuccessfulPayment(
          payment, 
          verification.confirmationCode || verification.orderTrackingId
        );
        return;
      } else if (verification.status === "FAILED") {
        await this.handleFailedPayment(
          payment, 
          verification.statusMessage || failureReason || "Payment failed"
        );
        return;
      }
    } catch (error) {
      logger.error(`Error verifying payment ${orderTrackingId}:`, error);
      // If we can't verify, use the callback data
    }

    // Fallback to using the callback data
    if (success) {
      await this.handleSuccessfulPayment(payment, orderTrackingId);
    } else {
      await this.handleFailedPayment(payment, failureReason || "Pesapal payment failed");
    }
  }

  /**
   * Reconcile pending Pesapal payments
   * This should be run as a scheduled job (e.g., every 15 minutes)
   */
  async reconcilePendingPayments(): Promise<void> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const pendingPayments = await Payment.find({
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.PESAPAL,
      createdAt: { $lt: fifteenMinutesAgo },
    });

    logger.info(`Reconciling ${pendingPayments.length} pending Pesapal payments`);

    for (const payment of pendingPayments) {
      if (!payment.providerReferenceId) continue;

      try {
        const status = await pesapalService.getTransactionStatus(payment.providerOrderTrackingId || payment.providerReferenceId);
        
        if (status.status === 'COMPLETED') {
          await this.handleSuccessfulPayment(
            payment, 
            status.confirmationCode || status.orderTrackingId
          );
          logger.info(`Reconciled payment ${payment._id} as COMPLETED`);
        } else if (status.status === 'FAILED') {
          await this.handleFailedPayment(
            payment, 
            status.statusMessage || "Reconciliation discovered failure"
          );
          logger.info(`Reconciled payment ${payment._id} as FAILED`);
        } else if (status.status === 'NOT_FOUND') {
          // If payment is older than 24 hours and not found, mark as failed
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          if (payment.createdAt < twentyFourHoursAgo) {
            await this.handleFailedPayment(
              payment, 
              "Transaction not found on provider after 24 hours"
            );
            logger.info(`Reconciled payment ${payment._id} as FAILED (not found)`);
          }
        }
        // PENDING -> leave as PENDING for next cycle
      } catch (error) {
        logger.error(`Error reconciling payment ${payment._id}:`, error);
      }
    }
  }

  /**
   * Cancel pending payments that have expired (no status change after N minutes)
   * This handles payments where the user abandoned the Pesapal page without completing
   */
  async cancelExpiredPendingPayments(maxAgeMinutes: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    const expiredPayments = await Payment.find({
      status: PaymentStatus.PENDING,
      provider: PaymentProvider.PESAPAL,
      createdAt: { $lt: cutoff },
    });

    if (expiredPayments.length === 0) return 0;

    let cancelledCount = 0;
    for (const payment of expiredPayments) {
      // Try to verify with Pesapal first — maybe it went through after all
      try {
        const trackingId = payment.providerOrderTrackingId || payment.providerReferenceId;
        const pesapalStatus = await pesapalService.getTransactionStatus(trackingId);
        if (pesapalStatus.status === 'COMPLETED') {
          await this.handleSuccessfulPayment(payment, pesapalStatus.confirmationCode || trackingId);
          logger.info(`Expired payment ${payment._id} found COMPLETED on Pesapal — activated`);
          continue; // skip cancellation
        }
        if (pesapalStatus.status === 'FAILED') {
          await this.handleFailedPayment(payment, pesapalStatus.statusMessage || 'Payment failed');
          continue;
        }
        // NOT_FOUND or PENDING → abandon/cancelled
      } catch {
        // Pesapal unreachable — still mark as cancelled to avoid stuck payments
      }

      // Mark as CANCELLED (not FAILED — user didn't actually attempt payment)
      payment.status = PaymentStatus.CANCELLED;
      payment.failureReason = 'Payment session expired — user did not complete payment';
      await payment.save();
      cancelledCount++;
    }

    if (cancelledCount > 0) {
      logger.info(`Cancelled ${cancelledCount} expired pending payments (older than ${maxAgeMinutes} min)`);
    }

    return cancelledCount;
  }

  /**
   * Get Pesapal payment methods for Rwanda
   */
  async getPesapalPaymentMethods() {
    try {
      return await pesapalService.getPaymentMethods();
    } catch (error) {
      logger.error("Error fetching Pesapal payment methods:", error);
      return { payment_methods: [] };
    }
  }

  /**
   * Cancel a pending payment (user cancelled on Pesapal page or abandoned)
   */
  async cancelPendingPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError("Payment not found.", 404, ErrorType.NOT_FOUND);
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new AppError(
        `Cannot cancel payment with status "${payment.status}". Only pending payments can be cancelled.`,
        400,
        ErrorType.VALIDATION
      );
    }

    payment.status = PaymentStatus.CANCELLED;
    payment.failureReason = "Cancelled by user";
    await payment.save();

    logger.info(`Payment ${paymentId} cancelled by user`);

    return {
      success: true,
      message: "Payment has been cancelled.",
    };
  }
}

export const subscriptionService = new SubscriptionService();