import { Router } from "express";
import { inventoryController } from "../controller/inventory.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
} from "../validation/inventory.validation";
import {
    requireInventoryContext,
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
 * /api/v1/finance/inventory:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Inventory]
 *     summary: Create a new inventory item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInventoryItemDTO'
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
  "/",
  authenticate,
  setActiveContext,
  validateRequest(createInventoryItemSchema),
  requireProjectPermission(["inventory:manage"]),
  requireCompanyPermission([Permissions.MANAGE_INVENTORY.action]),
  auditWrite("Inventory", "CREATE"),
  inventoryController.createInventoryItem
);

/**
 * @swagger
 * /api/v1/finance/inventory/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Inventory]
 *     summary: Update an inventory item
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
 *             $ref: '#/components/schemas/UpdateInventoryItemDTO'
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Inventory item not found
 */
router.patch(
  "/:id",
  authenticate,
  setActiveContext,
  requireInventoryContext(),
  requireProjectPermission(["inventory:manage"]),
  validateRequest(updateInventoryItemSchema),
  requireCompanyPermission([Permissions.MANAGE_INVENTORY.action]),
  auditWrite("Inventory", "UPDATE"),
  inventoryController.updateInventoryItem
);

/**
 * @swagger
 * /api/v1/finance/inventory/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Inventory]
 *     summary: Get an inventory item by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory item fetched successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Inventory item not found
 */
router.get(
  "/:id",
  authenticate,
  setActiveContext,
  requireInventoryContext(),
  requireProjectPermission(["inventory:view"]),
  requireCompanyPermission([Permissions.VIEW_INVENTORY.action]),
  inventoryController.getInventoryItem
);

/**
 * @swagger
 * /api/v1/finance/inventory/project/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Inventory]
 *     summary: Get all inventory items for a project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the project to fetch inventory items for.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [materials, labor, equipment, fuel, overheads]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or material code
 *     responses:
 *       200:
 *         description: Inventory items fetched successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
  "/project/:projectId",
  authenticate,
  setActiveContext,
  requireProjectPermission(["inventory:view"]),
  requireCompanyPermission([Permissions.VIEW_INVENTORY.action]),
  inventoryController.getInventoryItems
);

/**
 * @swagger
 * /api/v1/finance/inventory/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags: [Inventory]
 *     summary: Delete an inventory item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Inventory item deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Inventory item not found
 */
router.delete(
  "/:id",
  authenticate,
  setActiveContext,
  requireInventoryContext(),
  requireProjectPermission(["inventory:manage"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROCUREMENT_MANAGER,
    CompanyUserRole.SITE_ENGINEER
  ]),
  auditWrite("Inventory", "DELETE"),
  inventoryController.deleteInventoryItem
);

/**
 * @swagger
 * /api/v1/finance/inventory/{id}/documents:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Inventory]
 *     summary: Get related documents for an inventory item
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *           enum: [GRN, ISSUE]
 *     responses:
 *       200:
 *         description: Related documents fetched successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Inventory item not found
 */
router.get(
  "/:id/documents",
  authenticate,
  setActiveContext,
  requireInventoryContext(),
    requireProjectPermission(["inventory:view"]),
  requireCompanyPermission([Permissions.VIEW_INVENTORY.action]),
  inventoryController.getRelatedDocuments
);

export const inventoryRouter = router;