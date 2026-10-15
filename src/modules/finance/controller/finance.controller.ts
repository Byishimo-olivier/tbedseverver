// src/modules/finance/controller/finance.controller.ts
import { Request, Response, NextFunction } from "express";
import { financeService } from "../service/finance.service";
import { successResponse } from "../../../utils/response";
import { AuthRequest } from "../../../middleware/auth.middleware";
import { logger } from "../../../utils/logger";

export class FinanceController {
  async createBudget(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const budget = await financeService.createBudget(req.body, req.user.id);
      res
        .status(201)
        .json(successResponse(budget, "Budget created successfully"));
    } catch (error) {
      logger.error("Error creating budget:", error);
      next(error);
    }
  }

  async updateBudget(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const budget = await financeService.updateBudget(
        id,
        req.body,
        req.user.id
      );
      res.json(successResponse(budget, "Budget updated successfully"));
    } catch (error) {
      logger.error("Error updating budget:", error);
      next(error);
    }
  }

  async updateBudgetApprovalStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status, comments } = req.body;
      const budget = await financeService.updateBudgetApprovalStatus(
        id,
        status,
        req.user.id,
        comments
      );
      res.json(
        successResponse(budget, "Budget approval status updated successfully")
      );
    } catch (error) {
      logger.error("Error updating budget approval status:", error);
      next(error);
    }
  }

  async createExpense(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const expense = await financeService.createExpense(
        req.body,
        req.user.id,
        req.file
      );
      res
        .status(201)
        .json(successResponse(expense, "Expense recorded successfully"));
    } catch (error) {
      logger.error("Error creating expense:", error);
      next(error);
    }
  }

  async updateExpense(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const expense = await financeService.updateExpense(
        id,
        req.body,
        req.user.id
      );
      res.json(successResponse(expense, "Expense updated successfully"));
    } catch (error) {
      logger.error("Error updating expense:", error);
      next(error);
    }
  }

  async updateExpenseApprovalStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status, comments } = req.body;
      const expense = await financeService.updateExpenseApprovalStatus(
        id,
        status,
        req.user.id,
        comments
      );
      res.json(
        successResponse(expense, "Expense approval status updated successfully")
      );
    } catch (error) {
      logger.error("Error updating expense approval status:", error);
      next(error);
    }
  }

  async createInvoice(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const invoice = await financeService.createInvoice(
        req.body,
        req.user.id,
        req.user.contextRole || req.user.role,
        req.files as Express.Multer.File[]
      );
      res
        .status(201)
        .json(successResponse(invoice, "Invoice created successfully"));
    } catch (error) {
      logger.error("Error creating invoice:", error);
      next(error);
    }
  }

  async getBudget(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Change from req.query to req.params for projectId
      const { projectId } = req.params;
      const { fiscalYear } = req.query;

      const budget = await financeService.getBudget(
        projectId,
        fiscalYear ? Number(fiscalYear) : new Date().getFullYear()
      );

      res.json(successResponse(budget, "Budget retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving budget:", error);
      next(error);
    }
  }

  async getExpenses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const { startDate, endDate, category } = req.query;

      const expenses = await financeService.getExpenses(
        projectId,
        startDate as string,
        endDate as string,
        category as string
      );
      res.json(successResponse(expenses, "Expenses retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving expenses:", error);
      next(error);
    }
  }

  async getInvoices(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { status, type } = req.query;
      const { projectId } = req.params;
      const invoices = await financeService.getInvoices(
        projectId as string,
        status as string,
        type as string
      );
      res.json(successResponse(invoices, "Invoices retrieved successfully"));
    } catch (error) {
      logger.error("Error retrieving invoices:", error);
      next(error);
    }
  }

  async updateInvoiceStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const invoice = await financeService.updateInvoiceStatus(
        id,
        status,
        req.user.id
      );
      res.json(successResponse(invoice, "Invoice status updated successfully"));
    } catch (error) {
      logger.error("Error updating invoice status:", error);
      next(error);
    }
  }

  async getBudgetSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const summary = await financeService.getBudgetSummary(projectId);
      res.json(
        successResponse(summary, "Budget summary retrieved successfully")
      );
    } catch (error) {
      logger.error("Error retrieving budget summary:", error);
      next(error);
    }
  }

  async getExpenseReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { groupBy } = req.query;
      const { projectId } = req.params;
      const report = await financeService.getExpenseReport(
        projectId as string,
        groupBy as "category" | "date"
      );
      res.json(
        successResponse(report, "Expense report generated successfully")
      );
    } catch (error) {
      logger.error("Error generating expense report:", error);
      next(error);
    }
  }

  async deleteExpense(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      await financeService.deleteExpense(id, req.user.id);
      res.json(successResponse(null, "Expense deleted successfully"));
    } catch (error) {
      logger.error("Error deleting expense:", error);
      next(error);
    }
  }

  async voidInvoice(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      await financeService.voidInvoice(id, reason, req.user.id);
      res.json(successResponse(null, "Invoice voided successfully"));
    } catch (error) {
      logger.error("Error voiding invoice:", error);
      next(error);
    }
  }

  async generateFinanceReport(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      const report = await financeService.generateFinanceReport(projectId);

      res.json(
        successResponse(report, "Finance report generated successfully")
      );
    } catch (error) {
      logger.error("Error generating finance report:", error);
      next(error);
    }
  }

  async sendFinanceReport(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const { email } = req.query;

      await financeService.sendFinanceReportByEmail(projectId, email as string);

      res.json(successResponse(null, "Finance report sent successfully"));
    } catch (error) {
      logger.error("Error sending finance report:", error);
      next(error);
    }
  }

  async checkBudgetThresholds(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      await financeService.checkBudgetThresholds(projectId);

      res.json(successResponse(null, "Budget thresholds checked successfully"));
    } catch (error) {
      logger.error("Error checking budget thresholds:", error);
      next(error);
    }
  }
}

export const financeController = new FinanceController();
