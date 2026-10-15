import { Router } from "express";
import { procurementController } from "./procurement.controller";
import { upload } from "@/middleware/upload.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import {
  createMaterialRequestSchema,
  createPurchaseOrderSchema,
} from "./procurement.validation";
import { authenticate } from "@/middleware/auth.middleware";
import { parseProjectData } from "@/middleware/parse.middleware";
// import { requirePermission } from "@/middleware/roleauth.middleware";
// import { Permissions } from "@/config/permissions";
import {
    requireMaterialRequestRole
, requireProjectPermission,
    requirePurchaseOrderRole,
} from "@/middleware/permissions.middleware";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { requireCompanyPermission, requireCompanyRoles } from "@/middleware/company-permissions.middleware";
import { Permissions } from "@/config/permissions";
import { CompanyUserRole } from "@/types/enums";
import { AppError, ErrorType } from "@/utils/exceptions";
import { auditWrite } from "@/middleware/audit.middleware";
const router = Router();

// const ALL_PROJECT_ROLES = [
//   UserRole.OWNER,
//   UserRole.CONTRACTOR,
//   UserRole.CONSULTANT,
// ];

const ensureProjectIdQuery = (req: any, _res: any, next: any) => {
  const queryValue =
    typeof req.query.projectId === "string" ? req.query.projectId.trim() : "";
  const paramValue =
    typeof req.params?.projectId === "string" ? req.params.projectId.trim() : "";
  const projectId = queryValue || paramValue;

  if (!projectId) {
    return next(
      new AppError(
        "projectId query parameter is required",
        400,
        ErrorType.VALIDATION
      )
    );
  }

  req.params.projectId = projectId;
  next();
};

/**
 * @swagger
 * /api/v1/procurement/material-requests:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Create a material request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMaterialRequestDTO'
 *     responses:
 *       201:
 *         description: Material request created successfully
 */
// Only ADMIN, PROCUREMENT_MANAGER, SITE_ENGINEER can create material requests
router.post(
  "/material-requests",
  authenticate,
  setActiveContext,
  requireProjectPermission(["material-request:create"]),
  requireCompanyPermission([
    Permissions.CREATE_MATERIAL_REQUEST.action
  ]),
  parseProjectData,
  validateRequest(createMaterialRequestSchema),
  auditWrite("Material Request", "CREATE"),
  procurementController.createMaterialRequest
);

/**
 * @swagger
 * /api/v1/procurement/material-requests/project/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Fetch all material requests for a project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the project to fetch material requests for.
 *     responses:
 *       200:
 *         description: Material requests fetched successfully
 */
router.get(
  "/material-requests/project/:projectId",
  authenticate,
  setActiveContext,
  requireProjectPermission(["material-request:view"]),
  requireCompanyPermission([
    Permissions.VIEW_MATERIAL_REQUEST.action
  ]),
  procurementController.getMaterialRequests
);


/**
 * @swagger
 * /api/v1/procurement/material-requests/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Fetch a material request by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Material request fetched successfully
 */
router.get(
  "/material-requests/:id",
  authenticate,
  setActiveContext,
  requireMaterialRequestRole(),
  requireProjectPermission(["material-request:view"]),
  requireCompanyPermission([
    Permissions.VIEW_MATERIAL_REQUEST.action
  ]),
  procurementController.getMaterialRequest
);

/**
 * @swagger
 * /api/v1/procurement/material-requests/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Update a material request
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
 *             $ref: '#/components/schemas/CreateMaterialRequestDTO'
 *     responses:
 *       200:
 *         description: Material request updated successfully
 */
router.patch(
  "/material-requests/:id",
  authenticate,
  setActiveContext,
  requireMaterialRequestRole(),
    requireProjectPermission(["material-request:update"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROCUREMENT_MANAGER,
    CompanyUserRole.SITE_ENGINEER
  ]),
  auditWrite("Material Request", "UPDATE"),
  procurementController.updateMaterialRequest
);

/**
 * @swagger
 * /api/v1/procurement/material-requests/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Delete a material request
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Material request deleted successfully
 */
router.delete(
  "/material-requests/:id",
  authenticate,
  setActiveContext,
  requireMaterialRequestRole(),
  requireProjectPermission(["material-request:delete"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROCUREMENT_MANAGER
  ]),
  auditWrite("Material Request", "DELETE"),
  procurementController.deleteMaterialRequest
);

/**
 * @swagger
 * /api/v1/procurement/purchase-orders:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Create a purchase order
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreatePurchaseOrderDTO'
 *     responses:
 *       201:
 *         description: Purchase order created successfully
 */
// Only ADMIN, PROCUREMENT_MANAGER can create purchase orders
router.post(
  "/purchase-orders",
  authenticate,
  upload.single("file"),
  parseProjectData,
  setActiveContext,
  requireProjectPermission(["purchase-order:create"]),
  requireCompanyPermission([
    Permissions.CREATE_PURCHASE_ORDER.action
  ]),
  validateRequest(createPurchaseOrderSchema),
  auditWrite("Purchase Order", "CREATE"),
  procurementController.createPurchaseOrder
);

/**
 * @swagger
 * /api/v1/procurement/purchase-orders/project/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Fetch all purchase orders for a project (path variant)
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the project to fetch purchase orders for.
 *     responses:
 *       200:
 *         description: Purchase orders fetched successfully
 */
router.get(
  "/purchase-orders/project/:projectId",
  authenticate,
  setActiveContext,
  ensureProjectIdQuery,
  requireProjectPermission(["purchase-order:view"]),
  requireCompanyPermission([Permissions.VIEW_PURCHASE_ORDER.action]),
  procurementController.getPurchaseOrders
);

/**
 * @swagger
 * /api/v1/procurement/purchase-orders/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Fetch a purchase order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase order fetched successfully
 */
router.get(
  "/purchase-orders/:id",
  authenticate,
  setActiveContext,
  requirePurchaseOrderRole(),
    requireProjectPermission(["purchase-order:view"]),
  requireCompanyPermission([
    Permissions.VIEW_PURCHASE_ORDER.action
  ]),
  procurementController.getPurchaseOrder
);

/**
 * @swagger
 * /api/v1/procurement/purchase-orders/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Update a purchase order
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
 *             $ref: '#/components/schemas/CreatePurchaseOrderDTO'
 *     responses:
 *       200:
 *         description: Purchase order updated successfully
 */
router.patch(
  "/purchase-orders/:id",
  authenticate,
  setActiveContext,
  requirePurchaseOrderRole(),
    requireProjectPermission(["purchase-order:update"]),
  requireCompanyPermission([
    Permissions.UPDATE_PURCHASE_ORDER.action
  ]),
  upload.single("file"),
  parseProjectData,
  auditWrite("Purchase Order", "UPDATE"),
  procurementController.updatePurchaseOrder
);

/**
 * @swagger
 * /api/v1/procurement/purchase-orders/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Procurement
 *     summary: Delete a purchase order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase order deleted successfully
 */
router.delete(
  "/purchase-orders/:id",
  authenticate,
  setActiveContext,
  requirePurchaseOrderRole(),
    requireProjectPermission(["purchase-order:delete"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROCUREMENT_MANAGER
  ]),
  auditWrite("Purchase Order", "DELETE"),
  procurementController.deletePurchaseOrder
);

export const procurementRouter = router;
