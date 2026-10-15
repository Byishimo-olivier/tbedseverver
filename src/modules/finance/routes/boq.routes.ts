import { Router } from "express";
import { boqController } from "../controller/boq.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { createOrUpdateBoQSchema } from "../validation/boq.validation";
import {
    requireProjectPermission
} from "@/middleware/permissions.middleware";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { requireCompanyPermission, requireCompanyRoles } from "@/middleware/company-permissions.middleware";
import { Permissions } from "@/config/permissions";
import { CompanyUserRole } from "@/types/enums";
import { auditWrite } from "@/middleware/audit.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/finance/boq:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [BOQ]
 *     summary: Create or update a Bill of Quantities for a project
 *     description: Creates a new BoQ if one doesn't exist for the projectId, or updates the existing one.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrUpdateBoQDTO'
 *     responses:
 *       200:
 *         description: BoQ created or updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BoQ'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post(
  "/",
  authenticate,
  setActiveContext,
  requireProjectPermission(["boq:create"]),
  requireCompanyPermission([Permissions.CREATE_BOQ.action]),
  validateRequest(createOrUpdateBoQSchema),
  auditWrite("BOQ", "CREATE"),
  boqController.createOrUpdateBoQ
);

/**
 * @swagger
 * /api/v1/finance/boq/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [BOQ]
 *     summary: Get the Bill of Quantities for a project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: BoQ retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BoQ'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get(
  "/:projectId", 
  authenticate, 
  setActiveContext,
  requireProjectPermission(["boq:view"]),
  requireCompanyPermission([Permissions.VIEW_BOQ.action]),
  boqController.getBoQ
);

/**
 * @swagger
 * /api/v1/finance/boq/{projectId}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags: [BOQ]
 *     summary: Delete the Bill of Quantities for a project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: BoQ deleted successfully
 *       400:
 *         description: BoQ is in use and cannot be deleted
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete(
  "/:projectId",
  authenticate,
  setActiveContext,
  requireProjectPermission(["boq:delete"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.MANAGER
  ]),
  auditWrite("BOQ", "DELETE"),
  boqController.deleteBoQ
);

export const boqRouter = router;