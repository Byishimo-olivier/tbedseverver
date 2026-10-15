import express from "express";
import { authenticate } from "@/middleware/auth.middleware";
import { materialUsageController } from "../controller/materialUsage.controller";
import { createMaterialUsageSchema } from "../validation/materialUsage.validation";
import { validateRequest } from "@/middleware/validate.middleware";
import { requireProjectPermission} from "@/middleware/permissions.middleware";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { requireCompanyPermission, requireCompanyRoles } from "@/middleware/company-permissions.middleware";
import { Permissions } from "@/config/permissions";
import { CompanyUserRole } from "@/types/enums";
import { auditWrite } from "@/middleware/audit.middleware";

const router = express.Router();

/**
 * @swagger
 * /api/v1/finance/material-usage:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Material Usage]
 *     summary: Record material usage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMaterialUsageDTO'
 *     responses:
 *       201:
 *         description: Material usage recorded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  "/",
  authenticate,
  setActiveContext,
  requireProjectPermission(["material-usage:record"]),
  requireCompanyPermission([Permissions.MANAGE_INVENTORY.action]),
  validateRequest(createMaterialUsageSchema),
  auditWrite("Material Usage", "CREATE"),
  materialUsageController.recordMaterialUsage
);

/**
 * @swagger
 * /api/v1/finance/material-usage/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Material Usage]
 *     summary: Get material usage records
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
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Material usage records retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  "/:projectId",
  authenticate,
  setActiveContext,
  requireProjectPermission(["material-usage:view"]),
  requireCompanyPermission([Permissions.VIEW_INVENTORY.action]),
  materialUsageController.getMaterialUsage
);

/**
 * @swagger
 * /api/v1/finance/material-usage/{projectId}/report:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Material Usage]
 *     summary: Generate material usage report
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: sendEmail
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Material usage report generated successfully
 *       400:
 *         description: Missing parameters
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  "/:projectId/report",
  authenticate,
  setActiveContext,
  requireProjectPermission(["material-usage:view"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.MANAGING_DIRECTOR,
    CompanyUserRole.PROJECT_MANAGER,
    CompanyUserRole.PROCUREMENT_MANAGER,
    CompanyUserRole.SITE_ENGINEER
  ]),
  materialUsageController.generateMaterialUsageReport
);

export const materialUsageRouter = router;