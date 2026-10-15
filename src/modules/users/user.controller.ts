import { Request, Response, NextFunction } from "express";
import { userService } from "./user.service";
import { successResponse } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth.middleware";
import { User } from "./user.model";
import { logger } from "@/utils/logger";
// import { uploadService } from '../file/upload.service';

export class UserController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.user.id);
      res.json(successResponse(user));
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateProfile(req.user.id, req.body);
      res.json(successResponse(user, "Profile updated successfully"));
    } catch (error) {
      next(error);
    }
  }

  async deleteProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await userService.deleteUser(req.user.id);
      res.json(successResponse(null, "Profile deleted successfully"));
    } catch (error) {
      next(error);
    }
  }

  async searchUsersByEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ message: "Email parameter is required" });
      }

      const users = await User.find({
        email: { $regex: email, $options: "i" },
      }).select("email fullName role _id");

      return res
        .status(200)
        .json(successResponse(users, "Users retrieved successfully"));
    } catch (error) {
      logger.error("Error searching users:", error);
      return next(error);
    }
  }

  async getAllUsersDetails(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsersDetails();
      res.json(successResponse(users, "Users retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  async getAdminUserStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await userService.getAdminUserStats();
      res.json(successResponse(stats, "Admin user statistics retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  // async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
  //   try {
  //     if (!req.file) {
  //       throw new Error('File is required');
  //     }

  //     const { description } = req.body;
  //     if (!description) {
  //       throw new Error('Description is required');
  //     }

  //     const upload = await uploadService.saveFileDetails(req.user, req.file, description);
  //     res.json(successResponse({ upload }, 'File uploaded successfully'));
  //   } catch (error) {
  //     next(error);
  //   }
  // }
}

export const userController = new UserController();
