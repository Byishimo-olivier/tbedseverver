import { Router } from "express";
import { projectController } from "./project.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { upload } from "@/middleware/upload.middleware";
import {
  createProjectSchema,
  updateProjectSchema,
  deleteDocumentSchema,
} from "./project.validation";
import { parseProjectData } from "@/middleware/parse.middleware";
import {requireProjectPermission, requireDocumentContext
} from "@/middleware/permissions.middleware";
import { invitationRouter } from "./projectInvitation.routes";
import { setActiveContext } from "@/middleware/activeContext.middleware";
import { requireCompanyPermission, requireCompanyRoles } from "@/middleware/company-permissions.middleware";
import { Permissions } from "@/config/permissions";
import { CompanyUserRole } from "@/types/enums";
import { auditWrite } from "@/middleware/audit.middleware";
import { checkUsageLimit } from "@/middleware/plan.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Create a new project
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectDTO'
 *     responses:
 *       201:
 *         description: Project created successfully
 */
router.post(
  "/",
  authenticate,
  setActiveContext,
  checkUsageLimit("projects"),
  requireCompanyPermission([Permissions.CREATE_PROJECT.action]),
  upload.single("file"),
  parseProjectData,
  validateRequest(createProjectSchema),
  auditWrite("Project", "CREATE"),
  projectController.createProject
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Get a project by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project details retrieved successfully
 */
router.get(
  "/:id",
  authenticate,
  setActiveContext,
  requireProjectPermission(["project:view"]),
  projectController.getProject
);

/**
 * @swagger
 * /api/v1/projects/user/me:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Get current user's projects
 *     responses:
 *       200:
 *         description: User projects retrieved successfully
 */
router.get(
  "/user/me",
  authenticate,
  setActiveContext,
  projectController.getUserProjects
);

/**
 * @swagger
 * /api/v1/projects:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Get all projects (admin only)
 *     responses:
 *       200:
 *         description: All projects retrieved successfully
 */
router.get(
  "/",
  authenticate,
  setActiveContext,
  requireCompanyRoles([CompanyUserRole.ADMIN, CompanyUserRole.MANAGING_DIRECTOR]),
  projectController.getAllProjects
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/members:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Get all project members
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All project members retrieved successfully
 */
router.get(
  "/:projectId/members",
  authenticate,
  setActiveContext,
  requireProjectPermission(["project:view"]),
  projectController.getProjectMembers
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Update a project
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
 *             $ref: '#/components/schemas/UpdateProjectDTO'
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.patch(
  "/:id",
  authenticate,
  setActiveContext,
  requireProjectPermission(["project:update"]),
  requireCompanyPermission([Permissions.UPDATE_PROJECT.action]),
  upload.single("file"),
  parseProjectData,
  validateRequest(updateProjectSchema),
  auditWrite("Project", "UPDATE"),
  projectController.updateProject
);

/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Delete a project
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 */
router.delete(
  "/:id",
  authenticate,
  setActiveContext,
  requireProjectPermission(["project:delete"]),
  requireCompanyRoles([CompanyUserRole.ADMIN, CompanyUserRole.MANAGER]),
  auditWrite("Project", "DELETE"),
  projectController.deleteProject
);

/**
 * @swagger
 * /api/v1/projects/documents/review:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Review a project document (approve/reject)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *               - status
 *             properties:
 *               documentId:
 *                 type: string
 *                 description: The ID of the document to review
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *                 description: The new status for the document
 *               comments:
 *                 type: string
 *                 description: Feedback or comments for the review (especially if rejected)
 *     responses:
 *       200:
 *         description: Document review status updated successfully
 */
router.patch(
  "/documents/review",
  authenticate,
  setActiveContext,
  requireDocumentContext(),
  requireProjectPermission(["document:review"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.MANAGER,
    CompanyUserRole.PROJECT_MANAGER
  ]),
  auditWrite("Project Review Document", "UPDATE"),
  projectController.reviewDocument
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/documents:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Get project documents with filtering
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by document type
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
 *     responses:
 *       200:
 *         description: Project documents retrieved successfully
 */
router.get(
  "/:projectId/documents",
  authenticate,
  setActiveContext,
  requireProjectPermission(["document:view"]),
  projectController.getProjectDocuments
);

/**
 * @swagger
 * /api/v1/projects/{projectId}/documents:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Delete a project document
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteDocumentDTO'
 *     responses:
 *       200:
 *         description: Document deleted successfully
 */
router.delete(
  "/:projectId/documents",
  authenticate,
  setActiveContext,
  requireProjectPermission(["document:delete"]),
  requireCompanyRoles([
    CompanyUserRole.ADMIN,
    CompanyUserRole.MANAGER,
    CompanyUserRole.PROJECT_MANAGER
  ]),
  validateRequest(deleteDocumentSchema),
  auditWrite("Project Delete Document", "DELETE"),
  projectController.deleteProjectDocument
);

router.use("/invitation", invitationRouter);

export const projectRouter = router;