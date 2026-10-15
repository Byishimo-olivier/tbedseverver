import cron from "node-cron";
import { User } from "@/modules/users/user.model";
import { Company } from "@/modules/users/company/company.model";
import { subscriptionService } from "./subscription.service";
import { Payment } from "./payment.model"; // Import Payment model directly
import { notificationService } from "@/modules/notifications/notifcation.service";
import { logger } from "@/utils/logger";
import { PlanId } from "@/config/plans";

/**
 * Check for expiring subscriptions and handle renewals
 * Runs every day at 8:00 AM
 */
cron.schedule("0 8 * * *", async () => {
  logger.info("Running subscription expiry check...");
  
  try {
    await checkExpiringSubscriptions();
    await handleExpiredSubscriptions();
  } catch (error) {
    logger.error("Error in subscription cron job:", error);
  }
});

/**
 * Reconcile pending Pesapal payments and cancel expired ones
 * Runs every 5 minutes
 */
cron.schedule("*/5 * * * *", async () => {
  logger.info("Running pending Pesapal payments reconciliation...");
  
  try {
    await subscriptionService.reconcilePendingPayments();
    // Cancel payments abandoned on Pesapal page (older than 30 min)
    await subscriptionService.cancelExpiredPendingPayments(30);
  } catch (error) {
    logger.error("Error in Pesapal reconciliation cron job:", error);
  }
});

/**
 * Reconcile pending Pesapal payments - less frequent but more thorough
 * Runs every hour to catch any payments that might have been missed
 */
cron.schedule("0 * * * *", async () => {
  logger.info("Running thorough Pesapal payments reconciliation...");
  
  try {
    // Check for payments older than 30 minutes that are still pending
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const pendingPayments = await Payment.find({
      status: 'pending',
      provider: 'pesapal',
      createdAt: { $lt: thirtyMinutesAgo },
    });
    
    if (pendingPayments.length > 0) {
      logger.info(`Found ${pendingPayments.length} pending payments to reconcile`);
      await subscriptionService.reconcilePendingPayments();
    }
  } catch (error) {
    logger.error("Error in hourly Pesapal reconciliation:", error);
  }
});

/**
 * Send reminders for subscriptions expiring soon (3 days, 1 day before)
 */
async function checkExpiringSubscriptions(): Promise<void> {
  const now = new Date();
  
  // Check for subscriptions expiring in 3 days
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
  // Check for subscriptions expiring in 1 day
  const oneDayFromNow = new Date(now);
  oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

  // Find companies with expiring subscriptions
  const expiringCompanies = await Company.find({
    subscriptionStatus: "active",
    subscriptionEndDate: {
      $gte: now,
      $lte: threeDaysFromNow,
    },
  });

  for (const company of expiringCompanies) {
    const daysLeft = Math.ceil(
      (company.subscriptionEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Only send if days left is 1 or 3 (not for 2 days)
    if (daysLeft === 3 || daysLeft === 1) {
      await sendExpiryReminder(company.email, company.name, daysLeft, "company");
    }
  }

  // Find users with expiring subscriptions
  const expiringUsers = await User.find({
    subscriptionStatus: "active",
    subscriptionEndDate: {
      $gte: now,
      $lte: threeDaysFromNow,
    },
  });

  for (const user of expiringUsers) {
    const daysLeft = Math.ceil(
      (user.subscriptionEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysLeft === 3 || daysLeft === 1) {
      await sendExpiryReminder(user.email, user.fullName, daysLeft, "user");
    }
  }

  logger.info(
    `Sent expiry reminders: ${expiringCompanies.length} companies, ${expiringUsers.length} users`
  );
}

/**
 * Handle subscriptions that have expired
 */
async function handleExpiredSubscriptions(): Promise<void> {
  const now = new Date();

  // Update expired company subscriptions
  const expiredCompanies = await Company.updateMany(
    {
      subscriptionStatus: "active",
      subscriptionEndDate: { $lt: now },
    },
    {
      $set: {
        subscriptionStatus: "expired",
        plan: PlanId.BASIC, // Downgrade to basic plan
      },
    }
  );

  // Update expired user subscriptions
  const expiredUsers = await User.updateMany(
    {
      subscriptionStatus: "active",
      subscriptionEndDate: { $lt: now },
    },
    {
      $set: {
        subscriptionStatus: "expired",
        plan: PlanId.BASIC,
      },
    }
  );

  if (expiredCompanies.modifiedCount > 0 || expiredUsers.modifiedCount > 0) {
    logger.info(
      `Expired subscriptions: ${expiredCompanies.modifiedCount} companies, ${expiredUsers.modifiedCount} users`
    );
  }

  // Send expiry notifications for subscriptions that just expired (within last 24 hours)
  const justExpiredCompanies = await Company.find({
    subscriptionStatus: "expired",
    subscriptionEndDate: {
      $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Expired in last 24 hours
      $lt: now,
    },
  });

  for (const company of justExpiredCompanies) {
    await sendExpiredNotification(company.email, company.name, "company");
  }

  const justExpiredUsers = await User.find({
    subscriptionStatus: "expired",
    subscriptionEndDate: {
      $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      $lt: now,
    },
  });

  for (const user of justExpiredUsers) {
    await sendExpiredNotification(user.email, user.fullName, "user");
  }
}

/**
 * Send expiry reminder email
 */
async function sendExpiryReminder(
  email: string,
  name: string,
  daysLeft: number,
  entityType: "user" | "company"
): Promise<void> {
  try {
    const planName = entityType === "company" 
      ? await getCompanyPlan(name)
      : await getUserPlan(name);
      
    await notificationService.sendTemplateEmail(
      email,
      `Your subscription expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`,
      "subscription-expiry-reminder",
      {
        name,
        daysLeft: daysLeft.toString(),
        entityType,
        planName: planName || "your current plan",
        renewUrl: `${process.env.FRONTEND_URL}/dashboard/subscriptions/renew`,
        year: new Date().getFullYear().toString(),
      }
    );
  } catch (error) {
    logger.error(`Failed to send expiry reminder to ${email}:`, error);
  }
}

/**
 * Send subscription expired notification
 */
async function sendExpiredNotification(
  email: string,
  name: string,
  entityType: "user" | "company"
): Promise<void> {
  try {
    await notificationService.sendTemplateEmail(
      email,
      "Your subscription has expired",
      "subscription-expired",
      {
        name,
        entityType,
        renewUrl: `${process.env.FRONTEND_URL}/dashboard/subscriptions/renew`,
        upgradeUrl: `${process.env.FRONTEND_URL}/dashboard/subscriptions/plans`,
        year: new Date().getFullYear().toString(),
      }
    );
  } catch (error) {
    logger.error(`Failed to send expired notification to ${email}:`, error);
  }
}

/**
 * Helper function to get company plan name
 */
async function getCompanyPlan(companyName: string): Promise<string | null> {
  try {
    const company = await Company.findOne({ name: companyName }).select("plan");
    return company?.plan || null;
  } catch (error) {
    logger.error(`Error getting company plan for ${companyName}:`, error);
    return null;
  }
}

/**
 * Helper function to get user plan name
 */
async function getUserPlan(userName: string): Promise<string | null> {
  try {
    const user = await User.findOne({ fullName: userName }).select("plan");
    return user?.plan || null;
  } catch (error) {
    logger.error(`Error getting user plan for ${userName}:`, error);
    return null;
  }
}

/**
 * Clean up old pending payments (older than 7 days)
 * Runs every day at 2:00 AM
 */
cron.schedule("0 2 * * *", async () => {
  logger.info("Running old payment cleanup...");
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Find and mark old pending payments as cancelled
    const oldPayments = await Payment.updateMany(
      {
        status: "pending",
        createdAt: { $lt: sevenDaysAgo },
      },
      {
        $set: {
          status: "cancelled",
          failureReason: "Payment expired after 7 days",
        },
      }
    );
    
    if (oldPayments.modifiedCount > 0) {
      logger.info(`Cleaned up ${oldPayments.modifiedCount} old pending payments`);
    }
  } catch (error) {
    logger.error("Error cleaning up old payments:", error);
  }
});

// Export functions for testing and manual execution
export { 
  checkExpiringSubscriptions, 
  handleExpiredSubscriptions,
  sendExpiryReminder,
  sendExpiredNotification
};