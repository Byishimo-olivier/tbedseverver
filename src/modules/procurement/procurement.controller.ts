import { AuthRequest } from "./../../middleware/auth.middleware";
import { Request, Response, NextFunction } from "express";
import { MaterialRequest } from "./materialRequest.model";
import { PurchaseOrder } from "./purchaseOrder.model";
import { successResponse } from "../../utils/response";
import { uploadService } from "../file/upload.service";
import { notifyUser } from "../../utils/notify";
import fs from "fs";
import { financeService } from "../finance/service/finance.service";
import { Expense } from "../finance/models/expense.model";
import { ExpenseCategory, PriorityLevel } from "@/types/enums";
import { notificationService } from "../notifications/notifcation.service";
import { logger } from "@/utils/logger";
import { Project } from "../projects/project.model";

export class ProcurementController {
  // Create Material Request
  async createMaterialRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const materialRequest = new MaterialRequest({
        ...req.body,
        requestDate: req.body.requestDate
          ? new Date(req.body.requestDate)
          : new Date(),
      });
      await materialRequest.save();

      // Send notification if priority is high
      if (materialRequest.priorityLevel === PriorityLevel.HIGH) {
        try {
          // Get project owner information
          const project = await Project.findById(
            materialRequest.projectId
          ).populate<{
            createdBy: { email: string; fullName?: string; id: string };
          }>({
            path: "createdBy",
            select: "email fullName",
          });

          if (project && project.createdBy) {
            // Get the list of materials requested
            const materialList = materialRequest.materialDetails
              .map(
                (item) => `${item.materialName} (${item.quantity} ${item.unit})`
              )
              .join(", ");

            // Send notification email to project owner
            await notificationService.sendTemplateEmail(
              project.createdBy.email,
              "High Priority Material Request Needs Attention",
              "high-priority-material-request",
              {
                ownerName: project.createdBy.fullName || "Project Owner",
                projectName: project.name,
                requesterName: materialRequest.requesterName,
                department: materialRequest.department,
                materialList: materialList,
                purpose: materialRequest.purpose,
                requestLink: `${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/procurement/material-requests/${materialRequest._id}`,
                createPOLink: `${
                  process.env.FRONTEND_URL || "http://localhost:3000"
                }/procurement/purchase-orders/new?materialRequestId=${
                  materialRequest._id
                }`,
                year: new Date().getFullYear().toString(),
              }
            );

            logger.info(
              `High priority material request notification sent to ${project.createdBy.email}`
            );
          }
        } catch (notificationError) {
          logger.error(
            "Failed to send material request notification:",
            notificationError
          );
          // Continue processing even if notification fails
        }
      }

      return res
        .status(201)
        .json(
          successResponse(
            materialRequest,
            "Material request created successfully"
          )
        );
    } catch (error) {
      return next(error);
    }
  }

  // Fetch all Material Requests
  async getMaterialRequests(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { projectId } = req.params;

      // Pagination logic
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;

      const query = { projectId: projectId };

      const [requests, totalDocs] = await Promise.all([
        MaterialRequest.find(query)
          .sort({ requestDate: -1 })
          .skip(skip)
          .limit(limit),
        MaterialRequest.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalDocs / limit);
      const paginatedData = {
        docs: requests,
        totalDocs,
        limit,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return res
        .status(200)
        .json(
          successResponse(
            paginatedData,
            "Material requests fetched successfully"
          )
        );
    } catch (error) {
      return next(error);
    }
  }
  // Fetch single Material Request by ID
  async getMaterialRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const requestDoc = await MaterialRequest.findById(req.params.id);
      if (!requestDoc) {
        return res.status(404).json({ message: "Material request not found" });
      }
      return res
        .status(200)
        .json(
          successResponse(requestDoc, "Material request fetched successfully")
        );
    } catch (error) {
      return next(error);
    }
  }

  // Update a Material Request
  async updateMaterialRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const updated = await MaterialRequest.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!updated) {
        return res.status(404).json({ message: "Material request not found" });
      }
      return res
        .status(200)
        .json(
          successResponse(updated, "Material request updated successfully")
        );
    } catch (error) {
      return next(error);
    }
  }

  // Delete a Material Request
  async deleteMaterialRequest(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const deleted = await MaterialRequest.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Material request not found" });
      }
      return res
        .status(200)
        .json(
          successResponse(deleted, "Material request deleted successfully")
        );
    } catch (error) {
      return next(error);
    }
  }

  // Create Purchase Order
  async createPurchaseOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    let uploadedFile: string | null = null;

    try {
      const poData = {
        ...req.body,
        orderDate: req.body.orderDate
          ? new Date(req.body.orderDate)
          : new Date(),
        deliveryDate: new Date(req.body.deliveryDate),
        expenseRecorded: false, // Initialize as false
      };

      // If creating from a material request, pre-fill details
      if (req.body.materialRequestId) {
        const materialRequest = await MaterialRequest.findById(
          req.body.materialRequestId
        );
        if (materialRequest) {
          poData.materialList = materialRequest.materialDetails.map((item) => ({
            materialName: item.materialName,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            unitPrice: item.estimatedCost / item.quantity, // Default unit price
          }));
          // Also calculate totalCost from the material request
          poData.totalCost = materialRequest.materialDetails.reduce(
            (acc, item) => acc + item.estimatedCost,
            0
          );
        }
      }

      // Handle file upload if present
      if (req.file) {
        const fileDescription =
          req.body.fileDescription || "Purchase Order Document";
        const upload = await uploadService.saveFileDetails(
          req.user,
          req.file,
          fileDescription
        );
        uploadedFile = req.file.path; // Store the file path for potential cleanup
        poData.documentFilePath = upload.filePath;
      }

      const purchaseOrder = new PurchaseOrder(poData);
      await purchaseOrder.save();

      // Schedule notification if notification time is provided
      if (req.body.notificationTime) {
        await notifyUser(
          req.body.projectId,
          `Reminder: Purchase Order ${
            purchaseOrder.poNumber
          } delivery is scheduled on ${purchaseOrder.deliveryDate.toLocaleString()}`,
          new Date(req.body.notificationTime)
        );
      }

      // Schedule a notification for the delivery date to remind about GRN creation
      try {
        // Get project owner information
        const project = await Project.findById(
          purchaseOrder.projectId
        ).populate<{
          createdBy: { email: string; fullName?: string; id: string };
        }>({
          path: "createdBy",
          select: "email fullName",
        });

        if (project && project.createdBy) {
          // Calculate the delivery date
          const deliveryDate = new Date(purchaseOrder.deliveryDate);

          // Schedule notification for the delivery date
          await notifyUser(
            purchaseOrder.projectId.toString(),
            `PO Delivery Due: Purchase Order ${purchaseOrder.poNumber} is due for delivery today. Please create a Goods Receipt Note (GRN) to track received items.`,
            deliveryDate
          );

          // Also send an immediate email notification about the PO creation
          await notificationService.sendTemplateEmail(
            project.createdBy.email,
            `New Purchase Order Created: ${purchaseOrder.poNumber}`,
            "purchase-order-created",
            {
              ownerName: project.createdBy.fullName || "Project Owner",
              projectName: project.name,
              poNumber: purchaseOrder.poNumber,
              supplier: purchaseOrder.supplierDetails,
              deliveryDate: deliveryDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              totalAmount: purchaseOrder.totalCost.toFixed(2),
              poLink: `${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }/procurement/purchase-orders/${purchaseOrder._id}`,
              createGRNLink: `${
                process.env.FRONTEND_URL || "http://localhost:3000"
              }/finance/grn/new?purchaseOrderId=${purchaseOrder._id}`,
              year: new Date().getFullYear().toString(),
            }
          );
        }
      } catch (notificationError) {
        logger.error(
          "Failed to schedule delivery notification:",
          notificationError
        );
        // Continue processing even if notification fails
      }

      // Create expenses for each category only if materialList exists and has items
      let expensesCreated = false;
      if (purchaseOrder.materialList && purchaseOrder.materialList.length > 0) {
        try {
          const expensesByCategory = purchaseOrder.materialList.reduce(
            (acc: { [key: string]: number }, item) => {
              acc[item.category] =
                (acc[item.category] || 0) + item.quantity * item.unitPrice;
              return acc;
            },
            {}
          );

          // Create expense records for each category
          for (const [category, amount] of Object.entries(expensesByCategory)) {
            const enumCategory = ExpenseCategory[
              category.toUpperCase() as keyof typeof ExpenseCategory
            ];
            
            if (enumCategory && amount > 0) {
              await financeService.createExpense(
                {
                  projectId: purchaseOrder.projectId,
                  date: purchaseOrder.orderDate,
                  category: enumCategory,
                  amount: Number(amount),
                  description: `Expense from Purchase Order ${purchaseOrder.poNumber}`,
                },
                req.user.id
              );
              expensesCreated = true;
            }
          }
        } catch (expenseError) {
          logger.error("Failed to create expenses for PO:", expenseError);
          // Continue processing even if expense creation fails
        }
      }

      // Only mark as recorded if expenses were actually created
      if (expensesCreated) {
        purchaseOrder.expenseRecorded = true;
        await purchaseOrder.save();
      }

      return res
        .status(201)
        .json(
          successResponse(purchaseOrder, "Purchase order created successfully")
        );
    } catch (error) {
      // Clean up uploaded file if there was an error
      if (uploadedFile && fs.existsSync(uploadedFile)) {
        fs.unlinkSync(uploadedFile);
      }
      return next(error);
    }
  }

  // Fetch all Purchase Orders
  async getPurchaseOrders(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const { projectId } = req.params;

      // Pagination logic
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;

      const query = { projectId: projectId };

      const [orders, totalDocs] = await Promise.all([
        PurchaseOrder.find(query)
          .sort({ orderDate: -1 })
          .skip(skip)
          .limit(limit),
        PurchaseOrder.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalDocs / limit);
      const paginatedData = {
        docs: orders,
        totalDocs,
        limit,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      return res
        .status(200)
        .json(
          successResponse(paginatedData, "Purchase orders fetched successfully")
        );
    } catch (error) {
      return next(error);
    }
  }

  // Fetch single Purchase Order by ID
  async getPurchaseOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const order = await PurchaseOrder.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" });
      }
      return res
        .status(200)
        .json(successResponse(order, "Purchase order fetched successfully"));
    } catch (error) {
      return next(error);
    }
  }

  // Update a Purchase Order
  async updatePurchaseOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const updateData = { ...req.body };
      if (updateData.orderDate) {
        updateData.orderDate = new Date(updateData.orderDate);
      }
      if (updateData.deliveryDate) {
        updateData.deliveryDate = new Date(updateData.deliveryDate);
      }

      const oldPO = await PurchaseOrder.findById(req.params.id);
      if (!oldPO) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // If expenses were already recorded, update them
      if (oldPO.expenseRecorded) {
        // First, delete all old expenses associated with this PO
        await Expense.deleteMany({
          projectId: oldPO.projectId,
          description: { $regex: oldPO.poNumber },
        });

        // Then, create new expenses from the updated material list
        const materialList = updateData.materialList as Array<{
          category: string;
          quantity: number;
          unitPrice: number;
        }>;

        if (materialList && materialList.length > 0) {
          const expensesByCategory = materialList.reduce(
            (acc: Record<string, number>, item) => {
              acc[item.category] =
                (acc[item.category] || 0) + item.quantity * item.unitPrice;
              return acc;
            },
            {}
          );

          for (const [category, amount] of Object.entries(expensesByCategory)) {
            const enumCategory =
              ExpenseCategory[
                category.toUpperCase() as keyof typeof ExpenseCategory
              ];
            if (enumCategory) {
              await financeService.createExpense(
                {
                  projectId: oldPO.projectId,
                  date: updateData.orderDate || oldPO.orderDate,
                  category: enumCategory,
                  amount: Number(amount),
                  description: `Expense from Purchase Order ${oldPO.poNumber}`,
                },
                req.user.id
              );
            }
          }
        }
      }
      const updated = await PurchaseOrder.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );
      return res
        .status(200)
        .json(
          successResponse(
            updated,
            "Purchase order and related expenses updated successfully"
          )
        );
    } catch (error) {
      return next(error);
    }
  }

  // Delete a Purchase Order
  async deletePurchaseOrder(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> {
    try {
      const deleted = await PurchaseOrder.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Purchase order not found" });
      }

      // Also delete associated expenses
      if (deleted.expenseRecorded) {
        await Expense.deleteMany({
          projectId: deleted.projectId,
          description: { $regex: deleted.poNumber },
        });
      }

      return res
        .status(200)
        .json(successResponse(deleted, "Purchase order deleted successfully"));
    } catch (error) {
      return next(error);
    }
  }
}

export const procurementController = new ProcurementController();
