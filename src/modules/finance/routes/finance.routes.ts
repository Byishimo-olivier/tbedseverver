// src/modules/finance/routes/finance.routes.ts
import { Router } from "express";
import { financeController } from "../controller/finance.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { upload } from "@/middleware/upload.middleware";
import {
  createBudgetSchema,
  updateBudgetApprovalStatusSchema,
  updateBudgetSchema,
} from "../validation/budget.validation";
import {
  createExpenseSchema,
  updateExpenseApprovalStatusSchema,
  updateExpenseSchema,
} from "../validation/expense.validation";
import {
  createInvoiceSchema,
  updateInvoiceStatusSchema,
} from "../validation/invoice.validation";
import { inventoryRouter } from "./inventory.routes";
import { grnRouter } from "./grn.routes";
import { materialUsageRouter } from "./materialUsage.routes";
import { boqRouter } from "./boq.routes";
import {
    requireBudgetRole,
    requireExpenseRole,
    requireInvoiceRole, requireProjectPermission,
} from "@/middleware/permissions.middleware";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { requireCompanyPermission, requireCompanyRoles } from "@/middleware/company-permissions.middleware";
import { Permissions } from "@/config/permissions";
import { CompanyUserRole } from "@/types/enums";
import { canAccessFeature } from "@/middleware/plan.middleware";
import { auditWrite } from "@/middleware/audit.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Finance
 *   description: Financial management endpoints
 */

/**
 * @swagger
 * /api/v1/finance/budget:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Create a budget plan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBudgetDTO'
 *     responses:
 *       201:
 *         description: Budget created successfully
 */
router.post(
  "/budget",
  authenticate,
  setActiveContext,
  requireProjectPermission(["budget:create"]),
  requireCompanyPermission([Permissions.CREATE_BUDGET.action]),
  validateRequest(createBudgetSchema),
  auditWrite("Finance Create Budget", "CREATE"),
  financeController.createBudget
);

/**
 * @swagger
 * /api/v1/finance/budget/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Update a budget (only if rejected)
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
 *             $ref: '#/components/schemas/CreateBudgetDTO'
 *     responses:
 *       200:
 *         description: Budget updated successfully
 */
router.patch(
  "/budget/:id",
  authenticate,
  setActiveContext,
  requireBudgetRole(),
  requireProjectPermission(["budget:update"]),
  requireCompanyPermission([Permissions.UPDATE_BUDGET.action]),
  validateRequest(updateBudgetSchema),
  auditWrite("Finance Update Budget", "UPDATE"),
  financeController.updateBudget
);

/**
 * @swagger
 * /api/v1/finance/budget/{id}/approval-status:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Update budget approval status
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
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Budget approval status updated successfully
 */
router.patch(
  "/budget/:id/approval-status",
  authenticate,
  setActiveContext,
  requireBudgetRole(),
  requireProjectPermission(["budget:approve"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.MANAGING_DIRECTOR,
    CompanyUserRole.FINANCE_MANAGER
  ]),
  validateRequest(updateBudgetApprovalStatusSchema),
  auditWrite("Finance Update Budget Approval Status", "UPDATE"),
  financeController.updateBudgetApprovalStatus
);

/**
 * @swagger
 * /api/v1/finance/budget/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Get project budget
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: fiscalYear
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Budget fetched successfully
 */
router.get(
  "/budget/:projectId",
  authenticate,
  setActiveContext,
  requireProjectPermission(["budget:view"]),
  requireCompanyPermission([Permissions.VIEW_BUDGET.action]),
  financeController.getBudget
);

/**
 * @swagger
 * /api/v1/finance/budget/{projectId}/summary:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Get budget summary with expenses
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget summary fetched successfully
 */
router.get(
  "/budget/:projectId/summary",
  authenticate,
  setActiveContext,
  requireProjectPermission(["budget:view"]),
  requireCompanyPermission([Permissions.VIEW_BUDGET.action]),
  financeController.getBudgetSummary
);

/**
 * @swagger
 * /api/v1/finance/expense:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Record an expense
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateExpenseDTO'
 *     responses:
 *       201:
 *         description: Expense recorded successfully
 */
router.post(
  "/expense",
  authenticate,
  upload.single("document"),                  // moved up
  setActiveContext,
  requireProjectPermission(["expense:create"]),
  requireCompanyPermission([Permissions.CREATE_EXPENSE.action]),
  validateRequest(createExpenseSchema),
  auditWrite("Finance Create Expense", "CREATE"),
  financeController.createExpense
);

/**
 * @swagger
 * /api/v1/finance/expense/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Get project expenses
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [materials, labor, equipment, fuel, overheads]
 *     responses:
 *       200:
 *         description: Expenses fetched successfully
 */
router.get(
  "/expense/:projectId",
  authenticate,
  setActiveContext,
  requireProjectPermission(["expense:view"]),
  requireCompanyPermission([Permissions.VIEW_EXPENSE.action]),
  financeController.getExpenses
);

/**
 * @swagger
 * /api/v1/finance/expense/{projectId}/report:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Get expense report
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [category, date]
 *     responses:
 *       200:
 *         description: Expense report generated successfully
 */
router.get(
  "/expense/:projectId/report",
  authenticate,
  setActiveContext,
  requireProjectPermission(["expense:view"]),
  requireCompanyPermission([Permissions.VIEW_EXPENSE.action]),
  financeController.getExpenseReport
);

/**
 * @swagger
 * /api/v1/finance/expense/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Delete an expense
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 */
router.delete(
  "/expense/:id",
  authenticate,
  setActiveContext,
  requireExpenseRole(),
  requireProjectPermission(["expense:delete"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.FINANCE_MANAGER
  ]),
  auditWrite("Finance Delete Expense", "DELETE"),
  financeController.deleteExpense
);

/**
 * @swagger
 * /api/v1/finance/expense/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Update an expense (only if rejected)
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
 *             $ref: '#/components/schemas/CreateExpenseDTO'
 *     responses:
 *       200:
 *         description: Expense updated successfully
 */
router.patch(
  "/expense/:id",
  authenticate,
  setActiveContext,
  requireExpenseRole(),
    requireProjectPermission(["expense:update"]),
  requireCompanyPermission([Permissions.UPDATE_EXPENSE.action]),
  validateRequest(updateExpenseSchema),
  auditWrite("Finance Update Expense", "UPDATE"),
  financeController.updateExpense
);

/**
 * @swagger
 * /api/v1/finance/expense/{id}/approval-status:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Update expense approval status
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
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Expense approval status updated successfully
 */
router.patch(
  "/expense/:id/approval-status",
  authenticate,
  setActiveContext,
  requireExpenseRole(),
  requireProjectPermission(["expense:approve"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.MANAGING_DIRECTOR,
    CompanyUserRole.FINANCE_MANAGER
  ]),
  validateRequest(updateExpenseApprovalStatusSchema),
  auditWrite("Finance Update Expense Approval Status", "UPDATE"),
  financeController.updateExpenseApprovalStatus
);

/**
 * @swagger
 * /api/v1/finance/invoice:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Create an invoice
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoiceDTO'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 */
router.post(
  "/invoice",
  authenticate,
  upload.array("documents"),
  setActiveContext,
  canAccessFeature("canCreateInvoices"),
  requireProjectPermission(["invoice:create"]),
  requireCompanyPermission([Permissions.CREATE_INVOICE.action]),
  validateRequest(createInvoiceSchema),
  auditWrite("Finance Create Invoice", "CREATE"),
  financeController.createInvoice
);

/**
 * @swagger
 * /api/v1/finance/invoice/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Get project invoices
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, paid, void]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [contractor, consultant]
 *     responses:
 *       200:
 *         description: Invoices fetched successfully
 */
router.get(
  "/invoice/:projectId",
  authenticate,
  setActiveContext,
  requireProjectPermission(["invoice:view"]),
  requireCompanyPermission([Permissions.VIEW_INVOICE.action]),
  financeController.getInvoices
);

/**
 * @swagger
 * /api/v1/finance/invoice/{id}/status:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Update invoice status
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
 *             $ref: '#/components/schemas/UpdateInvoiceStatusDTO'
 *     responses:
 *       200:
 *         description: Invoice status updated successfully
 */
router.patch(
  "/invoice/:id/status",
  authenticate,
  setActiveContext,
  requireInvoiceRole(),
  requireProjectPermission(["invoice:update-status"]),
  requireCompanyPermission([Permissions.UPDATE_INVOICE_STATUS.action]),
  validateRequest(updateInvoiceStatusSchema),
  auditWrite("Finance Update Invoice Status", "UPDATE"),
  financeController.updateInvoiceStatus
);

/**
 * @swagger
 * /api/v1/finance/invoice/{id}/void:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Void an invoice
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
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice voided successfully
 */
router.post(
  "/invoice/:id/void",
  authenticate,
  setActiveContext,
  requireInvoiceRole(),
  requireProjectPermission(["invoice:approve"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.FINANCE_MANAGER
  ]),
  auditWrite("Finance Void Invoice", "CREATE"),
  financeController.voidInvoice
);

/**
 * @swagger
 * /api/v1/finance/budget/{projectId}/check-thresholds:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Check budget thresholds and send notifications if needed
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget thresholds checked successfully
 */
router.post(
  "/budget/:projectId/check-thresholds",
  authenticate,
  setActiveContext,
  requireProjectPermission(["budget:view"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.FINANCE_MANAGER,
    CompanyUserRole.MANAGING_DIRECTOR
  ]),
  financeController.checkBudgetThresholds
);

/**
 * @swagger
 * /api/v1/finance/budget/{projectId}/report:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Generate a detailed finance report
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Finance report generated successfully
 */
router.get(
  "/budget/:projectId/report",
  authenticate,
  setActiveContext,
  requireProjectPermission(["budget:view"]),
  requireCompanyPermission([Permissions.VIEW_BUDGET.action]),
  financeController.generateFinanceReport
);

/**
 * @swagger
 * /api/v1/finance/budget/{projectId}/send-report:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Finance]
 *     summary: Generate and send finance report via email
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *           format: email
 *         description: Email to send the report to (optional, defaults to project owner)
 *     responses:
 *       200:
 *         description: Finance report sent successfully
 */
router.post(
  "/budget/:projectId/send-report",
  authenticate,
  setActiveContext,
  requireProjectPermission(["budget:approve"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.MANAGING_DIRECTOR,
    CompanyUserRole.FINANCE_MANAGER
  ]),
  auditWrite("Finance Send Report", "CREATE"),
  financeController.sendFinanceReport
);

router.use("/inventory", inventoryRouter);
router.use("/grn", grnRouter);
router.use("/material-usage", materialUsageRouter);
router.use("/boq", boqRouter);
export const financeRouter = router;