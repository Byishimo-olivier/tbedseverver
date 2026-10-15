import cron from "node-cron";
import { PurchaseOrder } from "../modules/procurement/purchaseOrder.model";
// import { MaterialRequest } from "../modules/procurement/materialRequest.model";
import { notificationService } from "../modules/notifications/notifcation.service";
import { logger } from "./logger";
import { Project } from "../modules/projects/project.model";

// Schedule notifications for a specific user
export async function notifyUser(
  projectId: string,
  message: string,
  scheduledTime: Date
): Promise<void> {
  try {
    // Store the notification in the database or use a job queue system
    // For simplicity, we'll just log it and implement a basic check in the cron job
    logger.info(
      `Scheduled notification for project ${projectId} at ${scheduledTime.toISOString()}: ${message}`
    );

    // If the scheduled time is today or has passed, send it immediately
    const now = new Date();
    if (scheduledTime <= now) {
      // Get project and owner info
      const project = await Project.findById(projectId).populate<{
        createdBy: { email: string; fullName?: string; id: string };
      }>({
        path: "createdBy",
        select: "email fullName",
      });

      if (project && project.createdBy) {
        // Send email notification
        await notificationService.sendTemplateEmail(
          project.createdBy.email,
          "Action Required: Purchase Order Delivery Due",
          "po-delivery-due",
          {
            ownerName: project.createdBy.fullName || "Project Owner",
            projectName: project.name,
            poNumber: message.includes("Purchase Order")
              ? message.split("Purchase Order ")[1].split(" ")[0]
              : "N/A",
            supplier: "Your Supplier", // Would need to fetch this from the PO
            totalAmount: "0.00", // Would need to fetch this from the PO
            createGRNLink: `${
              process.env.FRONTEND_URL || "http://localhost:3000"
            }/finance/grn/new`,
            year: new Date().getFullYear().toString(),
          }
        );
      }
    }
  } catch (error) {
    logger.error(`Error scheduling notification: ${error}`);
  }
}

// This cron job runs every day at 8 AM to check for upcoming deadlines.
if (process.env.VERCEL !== "1") {
  cron.schedule("0 8 * * *", async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Notify for Purchase Order delivery deadlines due today
      const orders = await PurchaseOrder.find({
        deliveryDate: {
          $gte: today,
          $lt: tomorrow,
        },
      });

      for (const order of orders) {
        try {
          // Get project and owner info
          const project = await Project.findById(order.projectId).populate<{
            createdBy: { email: string; fullName?: string; id: string };
          }>({
            path: "createdBy",
            select: "email fullName",
          });

          if (project && project.createdBy) {
            // Send email notification
            await notificationService.sendTemplateEmail(
              project.createdBy.email,
              "Action Required: Purchase Order Delivery Due Today",
              "po-delivery-due",
              {
                ownerName: project.createdBy.fullName || "Project Owner",
                projectName: project.name,
                poNumber: order.poNumber,
                supplier: order.supplierDetails,
                totalAmount: order.totalCost.toFixed(2),
                createGRNLink: `${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/finance/grn/new?purchaseOrderId=${order._id}`,
                year: new Date().getFullYear().toString(),
              }
            );

            logger.info(
              `Delivery due notification sent for PO ${order.poNumber} to ${project.createdBy.email}`
            );
          }
        } catch (error) {
          logger.error(
            `Error sending delivery notification for PO ${order._id}: ${error}`
          );
        }
      }

      // Also check for high priority material requests from the last 24 hours
      // that might not have had notifications sent
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // TODO: Implement notification logic for high priority material requests
      // const requests = await MaterialRequest.find({
      //   requestDate: { $gte: yesterday },
      //   priorityLevel: "HIGH",
      // });

      // Logic for material request notifications would go here...
    } catch (error) {
      logger.error("Error during scheduled notifications:", error);
    }
  });
}
