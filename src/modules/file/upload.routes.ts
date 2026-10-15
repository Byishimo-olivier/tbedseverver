import { Router } from "express";
import path from "path";
import fs from "fs";
import { uploadService } from "./upload.service";
import mongoose from "mongoose";
import { successResponse } from "@/utils/response";
import { logger } from "@/utils/logger";
import { authenticate, AuthRequest } from "@/middleware/auth.middleware";
import { upload } from "@/middleware/upload.middleware";
import { Project } from "@/modules/projects/project.model";

const router = Router();

/**
 * @swagger
 * /api/v1/upload/documents:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Upload
 *     summary: Upload a miscellaneous document (e.g., contract) with description
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - description
 *               - projectId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *                 description: Description of the document
 *               projectId:
 *                 type: string
 *                 description: Project ID to associate the document with
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient permissions for project
 *       404:
 *         description: Project not found
 */
router.post(
  "/documents",
  authenticate,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const authReq = req as AuthRequest;

      if (!authReq.file) {
        res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
        return;
      }

      const { description, projectId } = authReq.body;
      if (!description) {
        res.status(400).json({
          success: false,
          message: "Description is required",
        });
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: "Project ID is required",
        });
        return;
      }

      // Validate projectId
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        res.status(400).json({
          success: false,
          message: "Invalid project ID",
        });
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          message: "Project not found",
        });
        return;
      }

      // Check permissions: Owner or Team Member
      const userId = authReq.user!.id;
      const isOwner = project.createdBy.toString() === userId;
      const isTeamMember = project.team.some(
        (member) => member.user?.toString() === userId
      );

      if (!isOwner && !isTeamMember) {
        res.status(403).json({
          success: false,
          message:
            "You do not have permission to add documents to this project",
        });
        return;
      }

      const uploadedDoc = await uploadService.saveFileDetails(
        authReq.user!,
        authReq.file,
        description,
        projectId
      );

      // Associate with project
      project.documents.push({
        filePath: uploadedDoc.filePath,
        description: uploadedDoc.description,
      });
      await project.save();

      res
        .status(201)
        .json(successResponse(uploadedDoc, "Document uploaded successfully"));
    } catch (error) {
      logger.error("Error uploading document:", error);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/upload/download/{filename}:
 *   get:
 *     tags:
 *       - Upload
 *     summary: Download a file by filename
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the file to download
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       404:
 *         description: File not found
 */
router.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join("uploads", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found" });
  }

  return res.download(filePath);
});

export const uploadRouter = router;
