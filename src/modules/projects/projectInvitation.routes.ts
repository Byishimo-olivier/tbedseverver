import { Router } from "express";
import { invitationController } from "./projectInvitation.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { requireProjectPermission} from "@/middleware/permissions.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { createInvitationSchema } from "./projectInvitation.validation";
import { auditWrite } from "@/middleware/audit.middleware";

const router = Router();

/**
 * @swagger
 * /api/v1/projects/invitation:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Invite a user to join a project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvitationDTO'
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 */
router.post(
  "/",
  authenticate,
  requireProjectPermission(["project:manage-team"]),
  validateRequest(createInvitationSchema),
  auditWrite("Project Invitation", "CREATE"),
  invitationController.createInvitation
);

/**
 * @swagger
 * /api/v1/projects/invitation/pending/{projectId}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Get pending invitations for a project
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pending invitations retrieved successfully
 */
router.get(
  "/pending/:projectId",
  authenticate,
  requireProjectPermission(["project:manage-team"]),
  invitationController.getPendingInvitations
);

/**
 * @swagger
 * /api/v1/projects/invitation/accept:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Projects
 *     summary: Accept a project invitation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 */
router.post("/accept", authenticate, invitationController.acceptInvitation);

export const invitationRouter = router;
