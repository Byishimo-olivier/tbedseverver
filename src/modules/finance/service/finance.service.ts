import { Budget, IBudget } from "../models/budget.model";
import { Expense, IExpense } from "../models/expense.model";
import { Invoice, IInvoice, InvoiceStatus } from "../models/invoice.model";
import { Project } from "../../projects/project.model";
import { AppError, ErrorType } from "@/utils/exceptions";
import mongoose from "mongoose";
import { notificationService } from "../../notifications/notifcation.service";
import fs from "fs";
import { User } from "../../users/user.model";
import path from "path";
import {
  BudgetApprovalStatus,
  ExpenseApprovalStatus,
  InvoiceType,
  // _UserRole,
} from "@/types/enums";
import { logger } from "@/utils/logger";
import { BoQ, IBoQLineItem } from "../models/boq.model";

export class FinanceService {
  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid ID format", 400, ErrorType.VALIDATION);
    }
  }

  private async calculateTotalExpenses(
    projectId: mongoose.Types.ObjectId
  ): Promise<number> {
    const expenses = await Expense.find({ projectId });
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }

  async createBudget(
    budgetData: Partial<IBudget>,
    userId: string
  ): Promise<IBudget> {
    this.validateObjectId(userId);

    // Verify project exists
    const project = await Project.findById(budgetData.projectId);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    // Calculate total budget from individual categories
    const totalPlannedBudget =
      (budgetData.materialsBudget || 0) +
      (budgetData.laborBudget || 0) +
      (budgetData.equipmentBudget || 0) +
      (budgetData.fuelBudget || 0) +
      (budgetData.overheadsBudget || 0);

    const budget = new Budget({
      ...budgetData,
      totalPlannedBudget, // Set the calculated total
      createdBy: userId,
      updatedBy: userId,
    });
    await budget.save();

    return budget;
  }

  async updateBudget(
    id: string,
    updateData: Partial<IBudget>,
    userId: string
  ): Promise<IBudget> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    const budget = await Budget.findById(id);
    if (!budget) {
      throw new AppError("Budget not found", 404, ErrorType.NOT_FOUND);
    }

    // Verify project owner or budget creator
    const project = await Project.findById(budget.projectId);
    if (!project) {
      throw new AppError(
        "Project not found for this budget",
        404,
        ErrorType.NOT_FOUND
      );
    }

    const isOwner = project.createdBy.toString() === userId;
    const isCreator = budget.createdBy.toString() === userId;

    if (!isOwner && !isCreator) {
      throw new AppError(
        "Only the project owner or the budget creator can update the budget",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Only allow updates if the budget is rejected
    if (budget.approvalStatus !== BudgetApprovalStatus.REJECTED) {
      throw new AppError(
        "Budget can only be updated if its status is 'rejected'",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Recalculate total budget if category budgets are updated
    const newTotal =
      (updateData.materialsBudget ?? budget.materialsBudget) +
      (updateData.laborBudget ?? budget.laborBudget) +
      (updateData.equipmentBudget ?? budget.equipmentBudget) +
      (updateData.fuelBudget ?? budget.fuelBudget) +
      (updateData.overheadsBudget ?? budget.overheadsBudget);

    // Apply updates
    Object.assign(budget, updateData);
    budget.totalPlannedBudget = newTotal;
    budget.updatedBy = new mongoose.Types.ObjectId(userId);
    // Set status back to pending for re-approval
    budget.approvalStatus = BudgetApprovalStatus.PENDING;

    await budget.save();
    return budget;
  }

  async updateBudgetApprovalStatus(
    id: string,
    status: BudgetApprovalStatus,
    userId: string,
    comments?: string
  ): Promise<IBudget> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    // Validate status
    if (!Object.values(BudgetApprovalStatus).includes(status)) {
      throw new AppError(
        `Invalid status. Must be one of: ${Object.values(
          BudgetApprovalStatus
        ).join(", ")}`,
        400,
        ErrorType.VALIDATION
      );
    }

    const budget = await Budget.findById(id).populate(
      "createdBy",
      "fullName email"
    );
    if (!budget) {
      throw new AppError("Budget not found", 404, ErrorType.NOT_FOUND);
    }

    // Update budget approval status
    budget.approvalStatus = status;
    budget.updatedBy = new mongoose.Types.ObjectId(userId);
    if (status === BudgetApprovalStatus.REJECTED && comments) {
      budget.comments = comments;
    }

    await budget.save();

    if (status === BudgetApprovalStatus.REJECTED) {
      const creator = budget.createdBy as any;
      const project = await Project.findById(budget.projectId);
      if (creator && creator.email && project) {
        await notificationService.sendTemplateEmail(
          creator.email,
          `Budget Rejected for Project: ${project.name}`,
          "budget-rejected",
          {
            userName: creator.fullName || "User",
            projectName: project.name,
            fiscalYear: budget.fiscalYear.toString(),
            comments: comments || "No comments provided.",
            budgetLink: `${process.env.FRONTEND_URL}/projects/${project._id}/finance`,
            year: new Date().getFullYear().toString(),
          }
        );
      }
    }
    return budget;
  }

  async createExpense(
    expenseData: Partial<IExpense>,
    userId: string,
    file?: Express.Multer.File
  ): Promise<IExpense> {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      this.validateObjectId(userId);

      // Validate required projectId
      if (!expenseData.projectId) {
        throw new AppError("Project ID is required", 400, ErrorType.VALIDATION);
      }
      this.validateObjectId(expenseData.projectId.toString());

      // Verify project exists and user is owner
      const project = await Project.findById(expenseData.projectId);
      if (!project) {
        throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
      }

      // Check budget limits
      const budget = await Budget.findOne({
        projectId: expenseData.projectId,
        fiscalYear: new Date().getFullYear(),
      });

      if (budget) {
        const totalExpenses = await this.calculateTotalExpenses(
          expenseData.projectId
        );
        if (
          totalExpenses + (expenseData.amount || 0) >
          budget.totalPlannedBudget
        ) {
          const owner = await User.findById(project.createdBy);
          if (owner && owner.email) {
            const emailTemplate = await this.loadEmailTemplate("budget-alert", {
              ownerName: owner.fullName,
              projectName: project.name,
              budgetAmount: budget.totalPlannedBudget.toString(),
              currentExpenses: totalExpenses.toString(),
              newExpenseAmount: expenseData.amount?.toString() || "0",
              category: expenseData.category || "",
              budgetUrl: `${process.env.FRONTEND_URL}/projects/${project._id}/finance`,
              year: new Date().getFullYear().toString(),
            });

            await notificationService.sendEmail(
              owner.email,
              "Budget Alert",
              emailTemplate
            );
          }
        }
      }

      const expense = new Expense({
        ...expenseData,
        createdBy: userId,
        updatedBy: userId,
      });

      if (file) {
        expense.documents.push({
          filePath: file.path,
          description: "Expense supporting document",
        });
      }

      await expense.save({ session });

      //Check budget thresholds after creating the expense
      await this.checkBudgetThresholds(expenseData.projectId.toString());

      await session.commitTransaction();
      return expense;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async updateExpense(
    id: string,
    updateData: Partial<IExpense>,
    userId: string
  ): Promise<IExpense> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    const expense = await Expense.findById(id);
    if (!expense) {
      throw new AppError("Expense not found", 404, ErrorType.NOT_FOUND);
    }

    // Verify project owner or expense creator
    const project = await Project.findById(expense.projectId);
    if (!project) {
      throw new AppError(
        "Project not found for this expense",
        404,
        ErrorType.NOT_FOUND
      );
    }

    const isOwner = project.createdBy.toString() === userId;
    const isCreator = expense.createdBy.toString() === userId;

    if (!isOwner && !isCreator) {
      throw new AppError(
        "Only the project owner or the person who created the expense can update it",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Only allow updates if the expense is rejected
    if (expense.approvalStatus !== ExpenseApprovalStatus.REJECTED) {
      throw new AppError(
        "Expense can only be updated if its status is 'rejected'",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Apply updates
    Object.assign(expense, updateData);
    expense.updatedBy = new mongoose.Types.ObjectId(userId);
    // Set status back to pending for re-approval
    expense.approvalStatus = ExpenseApprovalStatus.PENDING;

    await expense.save();
    return expense;
  }

  async updateExpenseApprovalStatus(
    id: string,
    status: ExpenseApprovalStatus,
    userId: string,
    comments?: string
  ): Promise<IExpense> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    if (!Object.values(ExpenseApprovalStatus).includes(status)) {
      throw new AppError(
        `Invalid status. Must be one of: ${Object.values(
          ExpenseApprovalStatus
        ).join(", ")}`,
        400,
        ErrorType.VALIDATION
      );
    }

    const expense = await Expense.findById(id).populate(
      "createdBy",
      "fullName email"
    );
    if (!expense) {
      throw new AppError("Expense not found", 404, ErrorType.NOT_FOUND);
    }

    // Verify project owner
    const project = await Project.findById(expense.projectId);
    if (!project || project.createdBy.toString() !== userId) {
      throw new AppError(
        "Only project owner can update expense approval status",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    expense.approvalStatus = status;
    expense.updatedBy = new mongoose.Types.ObjectId(userId);

    await expense.save();

    // Send notification based on status change
    if (status === ExpenseApprovalStatus.REJECTED) {
      const creator = expense.createdBy as any;
      const project = await Project.findById(expense.projectId);
      if (creator && creator.email && project) {
        await notificationService.sendTemplateEmail(
          creator.email,
          `Expense Rejected for Project: ${project.name}`,
          "expense-rejected",
          {
            userName: creator.fullName || "User",
            projectName: project.name,
            expenseDescription: expense.description,
            expenseAmount: expense.amount.toFixed(2),
            comments: comments || "No comments provided.",
            expenseLink: `${process.env.FRONTEND_URL}/projects/${project._id}/finance/expenses`,
            year: new Date().getFullYear().toString(),
          }
        );
      }
    }
    return expense;
  }

  async createInvoice(
    invoiceData: any,
    userId: string,
    _userRole: string,
    files?: Express.Multer.File[]
  ): Promise<IInvoice> {
    this.validateObjectId(invoiceData.projectId);
    this.validateObjectId(userId);

    // Helper to safely parse JSON strings from multipart/form-data
    const parseField = (field: any) => {
      if (typeof field === "string") {
        try {
          return JSON.parse(field);
        } catch (e) {
          try {
            return JSON.parse(`[${field}]`);
          } catch (e2) {
            return field;
          }
        }
      }
      return field;
    };

    // Parse JSON string fields
    invoiceData.workPeriod = parseField(invoiceData.workPeriod);
    invoiceData.paymentDetails = parseField(invoiceData.paymentDetails);
    invoiceData.invoiceItems = parseField(invoiceData.invoiceItems);

    // Verify project exists
    const project = await Project.findById(invoiceData.projectId);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    let processedItems = [];

    if (invoiceData.type === InvoiceType.BOQ_BASED) {
      // Process and validate claimed BoQ items
      const boq = await BoQ.findOne({ projectId: invoiceData.projectId });
      if (!boq) {
        throw new AppError(
          "A Bill of Quantities for this project does not exist.",
          404,
          ErrorType.NOT_FOUND
        );
      }

      const boqItemsMap = new Map<string, IBoQLineItem>();
      boq.sections.forEach((section) => {
        section.items.forEach((item) => {
          boqItemsMap.set(item._id.toString(), item);
        });
      });

      if (!Array.isArray(invoiceData.invoiceItems)) {
        throw new AppError("invoiceItems must be an array", 400, ErrorType.VALIDATION);
      }

      for (const rawItem of invoiceData.invoiceItems) {
        const item = typeof rawItem === "string" ? parseField(rawItem) : rawItem;
        const boqItemId = item.boqItemId;

        if (!boqItemId) {
           throw new AppError("Each item must have a valid boqItemId", 400, ErrorType.VALIDATION);
        }

        const boqLineItem = boqItemsMap.get(boqItemId);
        if (!boqLineItem) {
          throw new AppError(
            `BoQ Item with id ${boqItemId} not found in this project's BoQ.`,
            404,
            ErrorType.NOT_FOUND
          );
        }

        const claimedQuantity = Number(item.claimedQuantity);
        const previouslyClaimed = await this.getClaimedQuantity(
          new mongoose.Types.ObjectId(boqItemId)
        );
        const remainingQty = boqLineItem.quantity - previouslyClaimed;

        if (claimedQuantity > remainingQty) {
          throw new AppError(
            `Claimed quantity for ${
              boqLineItem.description
            } exceeds available quantity of ${remainingQty.toFixed(2)}.`,
            400,
            ErrorType.VALIDATION
          );
        }

        // Calculate amount immediately to satisfy schema validation
        const rate = boqLineItem.rate;
        const amount = claimedQuantity * rate;

        processedItems.push({
          boqItemId: boqItemId,
          claimedQuantity: claimedQuantity,
          description: boqLineItem.description,
          unit: boqLineItem.unit,
          rate: rate,
          amount: amount // Required by schema
        });
      }
    } else if (invoiceData.type === InvoiceType.SERVICE_BASED) {
      if (!Array.isArray(invoiceData.invoiceItems)) {
        throw new AppError("invoiceItems must be an array", 400, ErrorType.VALIDATION);
      }
      
      processedItems = invoiceData.invoiceItems.map((rawItem: any) => {
        const item = typeof rawItem === "string" ? parseField(rawItem) : rawItem;
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice ?? item.rate ?? 0);
        
        return {
          description: item.description,
          quantity: quantity,
          unitPrice: unitPrice,
          amount: quantity * unitPrice // Required by schema
        };
      });
    } else {
      throw new AppError("Invalid invoice type specified.", 400, ErrorType.VALIDATION);
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(
      new mongoose.Types.ObjectId(invoiceData.projectId)
    );

    // Exclude raw 'documents' and 'invoiceItems' from spread to avoid casting errors
    const { documents, invoiceItems, ...safeInvoiceData } = invoiceData;

    const invoice = new Invoice({
      ...safeInvoiceData,
      invoiceNumber,
      invoiceItems: processedItems,
      issuerId: userId,
      createdBy: userId,
      updatedBy: userId,
      status: InvoiceStatus.DRAFT,
      totalAmount: processedItems.reduce((sum: any, item: { amount: any; }) => sum + item.amount, 0)
    });

    // Handle file uploads
    if (files && files.length > 0) {
      invoice.documents = files.map((file) => ({
        filePath: file.path,
        description: "Invoice supporting document",
        uploadedAt: new Date(),
      }));
    }

    await invoice.save();

 // The pre-save hook calculates totalAmount

    // Send notification to project owner
    const owner = await User.findById(project.createdBy);
    if (owner && owner.email) {
      await notificationService.sendTemplateEmail(
          owner.email,
          `New Invoice Submitted for ${project.name}`,
          "invoice-created",
          {
            ownerName: owner.fullName || "Project Owner",
            projectName: project.name,
            invoiceNumber: invoice.invoiceNumber,
            type: invoice.type,
            amount: invoice.totalAmount.toFixed(2),
            dueDate: invoice.dueDate.toLocaleDateString(),
            invoiceId: invoice._id.toString(),
            dashboardUrl: process.env.FRONTEND_URL || "http://localhost:3000",
            year: new Date().getFullYear().toString(),
          }
      );
    }

    return invoice;
  }

  // Helper method to generate unique invoice number
  private async generateInvoiceNumber(
    projectId: mongoose.Types.ObjectId
  ): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");

    // Get count of invoices for this project
    const invoiceCount = await Invoice.countDocuments({ projectId });
    const sequence = (invoiceCount + 1).toString().padStart(4, "0");

    return `INV-${year}${month}-${projectId.toString().slice(-4)}-${sequence}`;
  }

  private async loadEmailTemplate(
    templateName: string,
    replacements: { [key: string]: string }
  ): Promise<string> {
    const templatePath = path.join(
      __dirname,
      "../../../templates",
      `${templateName}.html`
    );
    let template = fs.readFileSync(templatePath, "utf8");

    for (const key in replacements) {
      template = template.replace(
        new RegExp(`{{${key}}}`, "g"),
        replacements[key]
      );
    }

    return template;
  }

  async getBudget(projectId: string, fiscalYear?: number): Promise<IBudget> {
    this.validateObjectId(projectId);

    let budget: IBudget | null = null;

    // If a fiscal year is provided, try to find that specific budget first
    if (fiscalYear) {
      budget = await Budget.findOne({ projectId, fiscalYear });
    }

    // If no budget is found for the specific year, or no year was provided,
    // find the latest budget for the project.
    if (!budget) {
      budget = await Budget.findOne({ projectId }).sort({ fiscalYear: -1 });
    }

    if (!budget) {
      // Return a default budget object instead of throwing an error
      return {
        projectId: new mongoose.Types.ObjectId(projectId),
        fiscalYear: new Date().getFullYear(),
        totalPlannedBudget: 0,
        materialsBudget: 0,
        laborBudget: 0,
        equipmentBudget: 0,
        fuelBudget: 0,
        overheadsBudget: 0,
        approvalStatus: BudgetApprovalStatus.PENDING,
        createdBy: new mongoose.Types.ObjectId(),
        updatedBy: new mongoose.Types.ObjectId(),
      } as IBudget;
    }

    return budget;
  }

  async getExpenses(
    projectId: string,
    startDate?: string,
    endDate?: string,
    category?: string
  ): Promise<IExpense[]> {
    this.validateObjectId(projectId);

    const query: any = { projectId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (category) {
      query.category = category;
    }

    return Expense.find(query).sort({ date: -1 });
  }

  async getInvoices(
    projectId: string,
    status?: string,
    type?: string
  ): Promise<IInvoice[]> {
    this.validateObjectId(projectId);

    const query: any = { projectId };
    if (status) query.status = status;
    if (type) query.type = type;

    return Invoice.find(query)
      .populate("issuerId", "fullName email")
      .sort({ createdAt: -1 });
  }

  async updateInvoiceStatus(
    id: string,
    status: InvoiceStatus,
    userId: string,
    comments?: string
  ): Promise<IInvoice> {
    this.validateObjectId(id);
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const invoice = await Invoice.findById(id).session(session);
      if (!invoice) {
        throw new AppError("Invoice not found", 404, ErrorType.NOT_FOUND);
      }

      const originalStatus = invoice.status;
      if (originalStatus === status) {
        return invoice; // No change
      }

      // Logic to update BoQ completed quantities
      const bulkOps = [];
      // If moving TO approved FROM a non-approved state
      if (
        status === InvoiceStatus.APPROVED &&
        originalStatus !== InvoiceStatus.APPROVED
      ) {
        for (const item of invoice.invoiceItems) {
          bulkOps.push({
            updateOne: {
              filter: { _id: item.boqItemId },
              update: { $inc: { completedQuantity: item.claimedQuantity } },
            },
          });
        }
      }
      // If moving FROM approved TO a non-approved state (e.g., rejected)
      else if (
        originalStatus === InvoiceStatus.APPROVED &&
        status !== InvoiceStatus.APPROVED
      ) {
        for (const item of invoice.invoiceItems) {
          bulkOps.push({
            updateOne: {
              filter: { _id: item.boqItemId },
              update: { $inc: { completedQuantity: -(item.claimedQuantity ?? 0) } },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await BoQ.bulkWrite(bulkOps, { session });
      }

      // Update invoice fields
      invoice.status = status;
      invoice.updatedBy = new mongoose.Types.ObjectId(userId);
      invoice.approvalWorkflow = {
        ...invoice.approvalWorkflow,
        approvedBy: new mongoose.Types.ObjectId(userId),
        approvedAt: new Date(),
        comments: comments,
      };

      await invoice.save({ session });
      await session.commitTransaction();

      // Send notification
      try {
        await this.sendInvoiceStatusChangeNotification(
          invoice,
          originalStatus,
          userId,
          comments
        );
      } catch (error) {
        logger.error(`Failed to send invoice status notification: ${error}`);
      }

      return invoice;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Helper to get total claimed quantity for a BoQ item from approved invoices
  private async getClaimedQuantity(
    boqItemId: mongoose.Types.ObjectId
  ): Promise<number> {
    const result = await Invoice.aggregate([
      { $match: { status: InvoiceStatus.APPROVED } },
      { $unwind: "$invoiceItems" },
      { $match: { "invoiceItems.boqItemId": boqItemId } },
      {
        $group: {
          _id: "$invoiceItems.boqItemId",
          totalClaimed: { $sum: "$invoiceItems.claimedQuantity" },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalClaimed : 0;
  }

  async getBudgetSummary(projectId: string): Promise<any> {
    this.validateObjectId(projectId);

    const [budget, expenses] = await Promise.all([
      Budget.findOne({ projectId }).sort({ fiscalYear: -1 }),
      Expense.find({ projectId }),
    ]);

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const expensesByCategory = expenses.reduce((acc: any, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});

    if (!budget) {
      return {
        budget: {
          totalPlanned: 0,
          materials: 0,
          labor: 0,
          equipment: 0,
          fuel: 0,
          overheads: 0,
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory,
        },
        remaining: -totalExpenses,
        utilizationPercentage: totalExpenses > 0 ? 100 : 0,
      };
    }

    const utilizationPercentage =
      budget.totalPlannedBudget > 0
        ? (totalExpenses / budget.totalPlannedBudget) * 100
        : totalExpenses > 0
        ? 100
        : 0;

    return {
      budget: {
        totalPlanned: budget.totalPlannedBudget,
        materials: budget.materialsBudget,
        labor: budget.laborBudget,
        equipment: budget.equipmentBudget,
        fuel: budget.fuelBudget,
        overheads: budget.overheadsBudget,
      },
      expenses: {
        total: totalExpenses,
        byCategory: expensesByCategory,
      },
      remaining: budget.totalPlannedBudget - totalExpenses,
      utilizationPercentage,
    };
  }

  async getExpenseReport(
    projectId: string,
    groupBy: "category" | "date" = "category"
  ): Promise<any> {
    this.validateObjectId(projectId);

    const expenses = await Expense.find({ projectId });

    if (groupBy === "category") {
      return expenses.reduce((acc: any, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {});
    } else {
      return expenses.reduce((acc: any, expense) => {
        const date = expense.date.toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + expense.amount;
        return acc;
      }, {});
    }
  }

  async deleteExpense(id: string, userId: string): Promise<void> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    const expense = await Expense.findById(id);
    if (!expense) {
      throw new AppError("Expense not found", 404, ErrorType.NOT_FOUND);
    }

    await expense.deleteOne();
  }

  async voidInvoice(id: string, reason: string, userId: string): Promise<void> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw new AppError("Invoice not found", 404, ErrorType.NOT_FOUND);
    }

    // Store old status
    const oldStatus = invoice.status;

    // Update invoice
    invoice.status = InvoiceStatus.VOID;
    invoice.approvalWorkflow = {
      ...invoice.approvalWorkflow,
      comments: reason,
      approvedBy: new mongoose.Types.ObjectId(userId),
      approvedAt: new Date(),
    };

    await invoice.save();

    // Send notification about voided invoice
    try {
      await this.sendInvoiceStatusChangeNotification(
        invoice,
        oldStatus,
        userId,
        reason
      );
    } catch (error) {
      logger.error(`Failed to send invoice void notification: ${error}`);
      // Continue processing even if notification fails
    }
  }

  /**
   * Sends notification when invoice status changes
   */
  private async sendInvoiceStatusChangeNotification(
    invoice: IInvoice,
    oldStatus: string,
    updatedByUserId: string,
    voidReason?: string
  ): Promise<void> {
    // Only send notification if status actually changed
    if (invoice.status === oldStatus) {
      return;
    }

    // Get issuer of the invoice
    const issuer = await User.findById(invoice.issuerId);
    if (!issuer || !issuer.email) {
      logger.warn(
        `Invoice issuer not found or has no email: ${invoice.issuerId}`
      );
      return;
    }

    // Get the project and updater info
    const [project, updatedBy] = await Promise.all([
      Project.findById(invoice.projectId),
      User.findById(updatedByUserId),
    ]);

    if (!project) {
      logger.warn(`Project not found for invoice: ${invoice._id}`);
      return;
    }

    const updaterName = updatedBy?.fullName || "Project Owner";

    // Determine template and subject based on new status
    let templateName: string;
    let emailSubject: string;

    switch (invoice.status) {
      case InvoiceStatus.VOID:
        templateName = "invoice-voided";
        emailSubject = `Invoice #${invoice.invoiceNumber} has been voided`;
        break;
      case InvoiceStatus.APPROVED:
        templateName = "invoice-approved";
        emailSubject = `Invoice #${invoice.invoiceNumber} has been approved`;
        break;
      case InvoiceStatus.PAID:
        templateName = "invoice-paid";
        emailSubject = `Invoice #${invoice.invoiceNumber} has been paid`;
        break;
      default:
        return; // Don't send notification for other status changes
    }

    // Format dates for email
    const formattedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const workPeriodStart = invoice.workPeriod.start.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );

    const workPeriodEnd = invoice.workPeriod.end.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create template replacements
    const replacements = {
      issuerName: issuer.fullName || issuer.email,
      invoiceNumber: invoice.invoiceNumber,
      projectName: project.name,
      invoiceAmount: invoice.totalAmount.toFixed(2),
      workPeriodStart,
      workPeriodEnd,
      updatedDate: formattedDate,
      updatedBy: updaterName,
      voidReason: voidReason || "Not provided",
      year: new Date().getFullYear().toString(),
      dashboardUrl: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/invoices/${invoice._id}`,
    };

    // Load and send the email
    const emailTemplate = await this.loadEmailTemplate(
      templateName,
      replacements
    );
    await notificationService.sendEmail(
      issuer.email,
      emailSubject,
      emailTemplate
    );

    logger.info(
      `Invoice ${invoice.status} notification sent to ${issuer.email} for invoice #${invoice.invoiceNumber}`
    );
  }

  async checkBudgetThresholds(projectId: string): Promise<void> {
    this.validateObjectId(projectId);

    const budgetSummary = await this.getBudgetSummary(projectId);
    const project = await Project.findById(projectId);

    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    const owner = await User.findById(project.createdBy);
    if (!owner || !owner.email) {
      return; // No owner email to notify
    }

    const utilizationPercentage = budgetSummary.utilizationPercentage;
    const remainingBudget = budgetSummary.remaining;
    const totalBudget = budgetSummary.budget.totalPlanned;

    // Define thresholds for notifications (50%, 80%, 100%)
    const thresholds = [
      { level: 50, template: "budget-threshold-50" },
      { level: 80, template: "budget-threshold-80" },
      { level: 100, template: "budget-threshold-100" },
    ];

    // Find the appropriate threshold
    let templateToUse = null;
    for (const threshold of thresholds) {
      if (utilizationPercentage >= threshold.level) {
        templateToUse = threshold.template;
      }
    }

    if (templateToUse) {
      try {
        const emailTemplate = await this.loadEmailTemplate(templateToUse, {
          ownerName: owner.fullName,
          projectName: project.name,
          budgetAmount: totalBudget.toString(),
          remainingAmount: remainingBudget.toString(),
          usedPercentage: Math.round(utilizationPercentage).toString(),
          budgetUrl: `${process.env.FRONTEND_URL}/projects/${project._id}/finance`,
          year: new Date().getFullYear().toString(),
        });

        await notificationService.sendEmail(
          owner.email,
          `Budget Alert - ${Math.round(utilizationPercentage)}% Used`,
          emailTemplate
        );
      } catch (error) {
        logger.error(`Failed to send budget threshold notification: ${error}`);
      }
    }
  }

  async generateFinanceReport(projectId: string): Promise<any> {
    this.validateObjectId(projectId);

    const [budget, expenses, project] = await Promise.all([
      Budget.findOne({ projectId }).sort({ fiscalYear: -1 }),
      Expense.find({ projectId }),
      Project.findById(projectId),
    ]);

    if (!budget) {
      throw new AppError("Budget not found", 404, ErrorType.NOT_FOUND);
    }

    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    // Group expenses by category
    const expensesByCategory = expenses.reduce((acc: any, expense) => {
      const category = expense.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = {
          planned: 0,
          actual: 0,
          difference: 0,
          percentageUsed: 0,
          items: [],
        };
      }

      acc[category].actual += expense.amount;
      acc[category].items.push({
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
      });

      return acc;
    }, {});

    // Map budget categories to expenses
    const categoryMap: { [key: string]: string } = {
      Materials: "materialsBudget",
      Labor: "laborBudget",
      Equipment: "equipmentBudget",
      Fuel: "fuelBudget",
      Overheads: "overheadsBudget",
    };

    // Calculate differences and percentages
    Object.keys(categoryMap).forEach((category) => {
      const budgetField = categoryMap[category];
      const budgetAmount =
        (budget[budgetField as keyof IBudget] as number) || 0;

      if (!expensesByCategory[category]) {
        expensesByCategory[category] = {
          planned: budgetAmount,
          actual: 0,
          difference: budgetAmount,
          percentageUsed: 0,
          items: [],
        };
      } else {
        expensesByCategory[category].planned = budgetAmount;
        expensesByCategory[category].difference =
          budgetAmount - expensesByCategory[category].actual;
        expensesByCategory[category].percentageUsed =
          budgetAmount > 0
            ? (expensesByCategory[category].actual / budgetAmount) * 100
            : 0;
      }
    });

    // Calculate totals
    const totalBudget = budget.totalPlannedBudget;
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const totalRemaining = totalBudget - totalExpenses;
    const utilizationPercentage = (totalExpenses / totalBudget) * 100;

    return {
      projectName: project.name,
      projectCode: project.projectCode,
      fiscalYear: budget.fiscalYear,
      generatedDate: new Date(),
      categoryDetails: expensesByCategory,
      summary: {
        totalBudget,
        totalExpenses,
        totalRemaining,
        utilizationPercentage,
        status: totalRemaining >= 0 ? "Within Budget" : "Over Budget",
      },
    };
  }
  async sendFinanceReportByEmail(
    projectId: string,
    recipientEmail?: string
  ): Promise<void> {
    try {
      // Generate the finance report
      const report = await this.generateFinanceReport(projectId);
      const project = await Project.findById(projectId);

      if (!project) {
        throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
      }

      // If no recipient specified, send to project owner
      if (!recipientEmail) {
        const owner = await User.findById(project.createdBy);
        if (!owner || !owner.email) {
          throw new AppError(
            "Project owner email not found",
            404,
            ErrorType.NOT_FOUND
          );
        }
        recipientEmail = owner.email;
      }

      // Create category rows for the email template
      const categoryRows = Object.entries(report.categoryDetails)
        .map(([category, details]: [string, any]) => {
          const percentageClass =
            details.difference >= 0 ? "under-budget" : "over-budget";
          return `
            <tr>
              <td>${category}</td>
              <td>$${details.planned.toFixed(2)}</td>
              <td>$${details.actual.toFixed(2)}</td>
              <td class="${percentageClass}">$${details.difference.toFixed(
            2
          )}</td>
              <td>${details.percentageUsed.toFixed(1)}%</td>
            </tr>
          `;
        })
        .join("");

      // Determine budget status class
      const budgetClass =
        report.summary.totalRemaining >= 0 ? "under-budget" : "over-budget";

      // Format date
      const formattedDate = report.generatedDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Create email template replacements
      const replacements = {
        logoUrl: `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/images/logo.png`,
        projectName: report.projectName,
        projectCode: report.projectCode || "N/A",
        fiscalYear: report.fiscalYear.toString(),
        generatedDate: formattedDate,
        categoryRows: categoryRows,
        totalBudget: report.summary.totalBudget.toFixed(2),
        totalExpenses: report.summary.totalExpenses.toFixed(2),
        totalRemaining: Math.abs(report.summary.totalRemaining).toFixed(2),
        utilizationPercentage: report.summary.utilizationPercentage.toFixed(1),
        status: report.summary.status,
        budgetClass: budgetClass,
        year: new Date().getFullYear().toString(),
        dashboardUrl: `${
          process.env.FRONTEND_URL || "http://localhost:3000"
        }/projects/${projectId}/finance`,
      };

      // Load and send the email
      const emailTemplate = await this.loadEmailTemplate(
        "finance-report",
        replacements
      );
      await notificationService.sendEmail(
        recipientEmail,
        `Finance Report: ${report.projectName}`,
        emailTemplate
      );

      logger.info(
        `Finance report sent to ${recipientEmail} for project ${report.projectName}`
      );
    } catch (error) {
      logger.error(`Failed to send finance report email: ${error}`);
      throw error;
    }
  }
}

export const financeService = new FinanceService();
