import { Router } from "express";
import { timelineController } from "./timeline.controller";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createProjectStageSchema,
  createProgressTrackingSchema,
  updateProjectStageSchema,
  updateProgressTrackingSchema,
} from "./timeline.validation";
import {
  requireProgressTrackingContext,
  requireProjectMembership,
  requireProjectOwnership,
  requireProjectStageContext,
  requireProjectPermission,
} from "@/middleware/permissions.middleware";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { requireCompanyPermission, requireCompanyRoles } from "@/middleware/company-permissions.middleware";
import { Permissions } from "@/config/permissions";
import { CompanyUserRole } from "@/types/enums";
import { upload } from "@/middleware/upload.middleware";
import { parseItemsMiddleware } from "@/middleware/parse.middleware";
import { auditWrite } from "@/middleware/audit.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/timeline/project-stage:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Timeline]
 *     summary: Create a project stage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectStageDTO'
 *     responses:
 *       201:
 *         description: Project stage created successfully
 */
router.post(
  "/project-stage",
  authenticate,
  setActiveContext,
  requireProjectOwnership(),
  requireCompanyPermission([
    Permissions.CREATE_PROJECT_STAGE.action
  ]),
  validateRequest(createProjectStageSchema),
  auditWrite("Project Stage", "CREATE"),
  timelineController.createProjectStage
);

/**
 * @swagger
 * /api/v1/timeline/progress-tracking:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags: [Timeline]
 *     summary: Create progress tracking with document uploads
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - reportingPeriod
 *               - stageProgress
 *             properties:
 *               projectId:
 *                 type: string
 *               reportingPeriod:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *               stageProgress:
 *                 type: string
 *                 description: JSON string of stage progress array
 *               comments:
 *                 type: string
 *               supportingDocumentation:
 *                 type: string
 *                 description: JSON array of {description} objects
 *               delayDocumentation:
 *                 type: string
 *                 description: JSON array of {description} objects
 *               supportingDocumentation[0][file]:
 *                 type: string
 *                 format: binary
 *               supportingDocumentation[1][file]:
 *                 type: string
 *                 format: binary
 *               delayDocumentation[0][file]:
 *                 type: string
 *                 format: binary
 *               delayDocumentation[1][file]:
 *                 type: string
 *                 format: binary
 *               correctiveActions:
 *                 type: string
 *                 description: JSON array of corrective action strings
 *     responses:
 *       201:
 *         description: Progress tracking created successfully
 */
router.post(
  "/progress-tracking",
  authenticate,
  setActiveContext,
  upload.any(),
  parseItemsMiddleware,
  requireProjectPermission(["progress:create"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROJECT_MANAGER,
    CompanyUserRole.SITE_ENGINEER,
  ]),
  validateRequest(createProgressTrackingSchema),
  auditWrite("Progress Tracking", "CREATE"),
  timelineController.createProgressTracking
);

/**
 * @swagger
 * /api/v1/timeline/project-stage/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Timeline]
 *     summary: Update a project stage
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
 *             $ref: '#/components/schemas/CreateProjectStageDTO'
 *     responses:
 *       200:
 *         description: Project stage updated successfully
 */
router.patch(
  "/project-stage/:id",
  authenticate,
  setActiveContext,
  requireProjectStageContext(),
  requireCompanyPermission([
    Permissions.UPDATE_PROJECT_STAGE.action
  ]),
  validateRequest(updateProjectStageSchema),
  auditWrite("Project Stage", "UPDATE"),
  timelineController.updateProjectStage
);

/**
 * @swagger
 * /api/v1/timeline/project-stage/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags: [Timeline]
 *     summary: Delete a project stage
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project stage deleted successfully
 */
router.delete(
  "/project-stage/:id",
  authenticate,
  setActiveContext,
  requireProjectStageContext(),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROJECT_MANAGER,
    CompanyUserRole.MANAGER
  ]),
  auditWrite("Project Stage", "DELETE"),
  timelineController.deleteProjectStage
);


/**
 * @swagger
 * /api/v1/timeline/progress-tracking/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags: [Timeline]
 *     summary: Update progress tracking with document uploads
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               stageProgress:
 *                 type: string
 *                 description: JSON string of stage progress array
 *               comments:
 *                 type: string
 *               supportingDocumentation:
 *                 type: string
 *                 description: JSON array of {description} objects for new documents
 *               delayDocumentation:
 *                 type: string
 *                 description: JSON array of {description} objects for new documents
 *               supportingDocumentation[0][file]:
 *                 type: string
 *                 format: binary
 *               supportingDocumentation[1][file]:
 *                 type: string
 *                 format: binary
 *               delayDocumentation[0][file]:
 *                 type: string
 *                 format: binary
 *               delayDocumentation[1][file]:
 *                 type: string
 *                 format: binary
 *               correctiveActions:
 *                 type: string
 *                 description: JSON array of corrective action strings
 *     responses:
 *       200:
 *         description: Progress tracking updated successfully
 */
router.patch(
  "/progress-tracking/:id",
  authenticate,
  setActiveContext,
  upload.any(),
  parseItemsMiddleware,
  requireProgressTrackingContext(),
  requireProjectPermission(["progress:update"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROJECT_MANAGER,
    CompanyUserRole.SITE_ENGINEER,
  ]),
  validateRequest(updateProgressTrackingSchema),
  auditWrite("Progress Tracking", "UPDATE"),
  timelineController.updateProgressTracking
);

/**
 * @swagger
 * /api/v1/timeline/progress-tracking/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags: [Timeline]
 *     summary: Delete progress tracking
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress tracking deleted successfully
 */
router.delete(
  "/progress-tracking/:id",
  authenticate,
  setActiveContext,
  requireProgressTrackingContext(),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.PROJECT_MANAGER,
    CompanyUserRole.SITE_ENGINEER
  ]),
  auditWrite("Progress Tracking", "DELETE"),
  timelineController.deleteProgressTracking
);


/**
 * @swagger
 * /api/v1/timeline/project-stages/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Timeline]
 *     summary: Get project stages
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project stages fetched successfully
 */
router.get(
  "/project-stages/:projectId",
  authenticate,
  requireProjectMembership(),
  timelineController.getProjectStages
);

/**
 * @swagger
 * /api/v1/timeline/progress-tracking/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags: [Timeline]
 *     summary: Get progress tracking
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress tracking fetched successfully
 */
router.get(
  "/progress-tracking/:projectId",
  authenticate,
  setActiveContext,
  requireProjectMembership(),
  timelineController.getProgressTracking
);
export const timelineRouter = router;
