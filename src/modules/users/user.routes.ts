import { Router } from "express";
import { userController } from "./user.controller";
import { authenticate, authorize } from "@/middleware/auth.middleware";
import { validateRequest } from "@/middleware/validate.middleware";
import { updateUserSchema } from "./user.validation";
// import { upload } from '../../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * /api/v1/users/admin/all:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Admin
 *       - Users
 *     summary: Get all users with their company details (Admin only)
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get("/admin/all", authenticate, authorize("admin"), userController.getAllUsersDetails);

/**
 * @swagger
 * /api/v1/users/admin/stats:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Admin
 *       - Users
 *     summary: Get resource usage statistics for all users (Admin only)
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get("/admin/stats", authenticate, authorize("admin"), userController.getAdminUserStats);

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Get user profile
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 */
router.get("/profile", authenticate, userController.getProfile);

/**
 * @swagger
 * /api/v1/users/profile:
 *   patch:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Update user profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserDTO'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.patch(
  "/profile",
  authenticate,
  validateRequest(updateUserSchema),
  userController.updateProfile
);

/**
 * @swagger
 * /api/v1/users/profile:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Delete user profile
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 */
router.delete("/profile", authenticate, userController.deleteProfile);

/**
 * @swagger
 * /api/v1/users/search:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Users
 *     summary: Search users by email
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get("/search", authenticate, userController.searchUsersByEmail);


export const userRouter = router;
