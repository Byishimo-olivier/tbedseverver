import { Router } from "express";
import { grnController } from "../controller/grn.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { upload } from "@/middleware/upload.middleware";
import { createGRNSchema } from "../validation/grn.validation";
import { parseItemsMiddleware } from "@/middleware/parse.middleware";
import {
    requireGrnContext, requireProjectPermission,
} from "@/middleware/permissions.middleware";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { requireCompanyPermission, requireCompanyRoles } from "@/middleware/company-permissions.middleware";
import { Permissions } from "@/config/permissions";
import { CompanyUserRole } from "@/types/enums";
import { auditWrite } from "@/middleware/audit.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/finance/grn:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [GRN]
 *     summary: Create a new Goods Received Note
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/CreateGRNDTO'
 *               - type: object
 *                 properties:
 *                   documents:
 *                     type: array
 *                     items:
 *                       type: string
 *                       format: binary
 *     responses:
 *       201:
 *         description: GRN created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Project or Purchase Order not found
 */
router.post(
  "/",
  authenticate,
  setActiveContext,
  upload.array("documents", 5),
  requireProjectPermission(["grn:create"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROCUREMENT_MANAGER,
    CompanyUserRole.SITE_ENGINEER
  ]),
  parseItemsMiddleware,
  validateRequest(createGRNSchema),
  auditWrite("GRN", "CREATE"),
  grnController.createGRN
);

/**
 * @swagger
 * /api/v1/finance/grn/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [GRN]
 *     summary: Get GRN by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: GRN ID
 *     responses:
 *       200:
 *         description: GRN retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: GRN retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     projectId:
 *                       type: string
 *                     purchaseOrderId:
 *                       type: string
 *                     grnNumber:
 *                       type: string
 *                     receivedDate:
 *                       type: string
 *                       format: date-time
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           materialId:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           receivedQuantity:
 *                             type: number
 *                           pendingQuantity:
 *                             type: number
 *                           remarks:
 *                             type: string
 *                     status:
 *                       type: string
 *                       enum: [complete, partial]
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filePath:
 *                             type: string
 *                           description:
 *                             type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: GRN not found
 */
router.get(
  "/:id", 
  authenticate, 
  setActiveContext,
  requireGrnContext(),
  requireProjectPermission(["grn:view"]),
  requireCompanyPermission([Permissions.VIEW_PURCHASE_ORDER.action]),
  grnController.getGRN
);

/**
 * @swagger
 * /api/v1/finance/grn/project/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [GRN]
 *     summary: Get all GRNs for a specific project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the project
 *     responses:
 *       200:
 *         description: GRNs for project retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Project not found
 */
router.get(
  "/project/:projectId",
  authenticate,
  setActiveContext,
  requireProjectPermission(["grn:view"]),
  requireCompanyPermission([Permissions.VIEW_PURCHASE_ORDER.action]),
  grnController.getGRNsByProject
);

export const grnRouter = router;