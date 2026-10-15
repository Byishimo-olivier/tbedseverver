import { Router } from "express";
import { companyController } from "./company.controller";
import { authenticate } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import {
  createCompanySchema,
  inviteMemberSchema,
  updateCompanySchema,
  updateMemberRoleSchema,
} from "./company.validation";
import {
  requireCompanyAdmin,
  requireCompanyMembership,
  requireCompanyPermission,
  requireCompanyRole,
} from "@/middleware/company-permissions.middleware";
import { upload } from "@/middleware/upload.middleware";
import { parseCompanyData } from "@/middleware/parse.middleware";
import { CompanyUserRole } from "@/types/enums";
import { checkUsageLimit } from "@/middleware/plan.middleware";
import {CompanyPermissions} from "@/config/company-permissions";

const router = Router();

/**
 * @swagger
 * /api/v1/companies:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Create a new company
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateCompanyDTO'
 *     responses:
 *       201:
 *         description: Company created successfully
 */
router.post(
  "/",
  authenticate,
  upload.fields([
    { name: 'experienceDocuments', maxCount: 10 },
    { name: 'certificationDocuments', maxCount: 10 }
  ]),
  parseCompanyData,
  validateRequest(createCompanySchema),
  companyController.createCompany
);
/**
 * @swagger
 * /api/v1/companies/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Get company details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company details retrieved successfully
 */
router.get(
  "/:id",
  authenticate,
  requireCompanyMembership("id"),
  companyController.getCompany
);

/**
 * @swagger
 * /api/v1/companies/user/me:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Get all companies for the current user
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
 */
router.get("/user/me", authenticate, companyController.getUserCompanies);

/**
 * @swagger
 * /api/v1/companies/{id}:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Update company details
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
 *             $ref: '#/components/schemas/UpdateCompanyDTO'
 *     responses:
 *       200:
 *         description: Company updated successfully
 */
router.patch(
  "/:id",
  authenticate,
  requireCompanyAdmin("id"),
  upload.fields([
    { name: 'experienceDocuments', maxCount: 10 },
    { name: 'certificationDocuments', maxCount: 10 }
  ]),
  validateRequest(updateCompanySchema),
  companyController.updateCompany
);
/**
 * @swagger
 * /api/v1/companies/invitation:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Invite a user to join a company
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InviteCompanyMemberDTO'
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 */
router.post(
  "/invitation",
  authenticate,
  requireCompanyAdmin("companyId"),
  checkUsageLimit("users"),
  requireCompanyRole([CompanyUserRole.ADMIN, CompanyUserRole.MANAGER]),
  validateRequest(inviteMemberSchema),
  companyController.inviteMember
);

/**
 * @swagger
 * /api/v1/companies/invitation/accept:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Accept a company invitation
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
router.post(
  "/invitation/accept",
  authenticate,
  companyController.acceptInvitation
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/members/{memberId}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Remove a member from a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 */
router.delete(
  "/:companyId/members/:memberId",
  authenticate,
  requireCompanyAdmin("companyId"),
  companyController.removeMember
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/members/{memberId}/role:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Update a member's role in a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCompanyMemberRoleDTO' # Ensure this DTO is in swagger.ts
 *     responses:
 *       200:
 *         description: Member role updated successfully
 */
router.patch(
  "/:companyId/members/:memberId/role",
  authenticate,
  requireCompanyAdmin("companyId"),
  requireCompanyRole([CompanyUserRole.MANAGER]),
  validateRequest(updateMemberRoleSchema),
  companyController.updateMemberRole
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/leave:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Leave a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully left the company
 */
router.post(
  "/:companyId/leave",
  authenticate,
  requireCompanyMembership("companyId"),
  companyController.leaveCompany
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/members:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Get all members of a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company members retrieved successfully
 */
router.get(
  "/:companyId/members",
  authenticate,
  requireCompanyMembership("companyId"),
  companyController.getCompanyMembers
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/invitations/pending:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Get pending invitations for a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pending invitations retrieved successfully
 */
router.get(
  "/:companyId/invitations/pending",
  authenticate,
  requireCompanyAdmin("companyId"),
  companyController.getPendingInvitations
);

/**
 * @swagger
 * /api/v1/companies/{companyId}/projects:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Companies
 *     summary: Get all projects for a company
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company projects retrieved successfully
 */
router.get(
  "/:companyId/projects",
  authenticate,
  requireCompanyMembership("companyId"),
  requireCompanyPermission([CompanyPermissions.COMPANY_VIEW_PROJECTS.action]),
  companyController.getCompanyProjects
);

export const companyRouter = router;
