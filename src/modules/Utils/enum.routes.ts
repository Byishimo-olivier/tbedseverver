import { Router } from "express";
import { enumController } from "./enum.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Utils
 *   description: Utility endpoints
 */

/**
 * @swagger
 * /api/v1/utils/enums:
 *   get:
 *     tags: [Utils]
 *     summary: Get all enum values used in the application
 *     description: Returns all enum values for reference
 *     responses:
 *       200:
 *         description: List of all enums and their values
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
 *                   example: Enums fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     ProjectType:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Capital", "Maintenance"]
 *                     ProjectStatus:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"]
 *                     ExpenseCategory:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["materials", "labor", "equipment", "fuel", "overheads"]
 *                     # Other enums follow the same pattern...
 */
router.get("/enums", enumController.getAllEnums);

export const utilsRouter = router;
