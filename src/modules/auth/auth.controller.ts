import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { successResponse } from "@/utils/response";
// import { LoginDTO } from "./auth.types";
import { uploadService } from "../file/upload.service";
import { User } from "../users/user.model";
import { logger } from "@/utils/logger";

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userData = { ...req.body };
      delete userData.profilePicture;

      const result = await authService.register(userData);

      if (req.file) {
        try {
          // Get the Mongoose document by ID to use save()
          const userDoc = await User.findById(result.user._id);
          if (userDoc) {
            const upload = await uploadService.saveFileDetails(
              userDoc,
              req.file,
              "Profile picture"
            );

            // Update user's profile picture
            userDoc.profilePicture = upload.filePath;
            await userDoc.save();

            // Update the result.user for response with fresh data
            result.user = userDoc.toObject();
          }
        } catch (uploadError) {
          console.error("Failed to process profile picture:", uploadError);
        }
      }
      res
        .status(201)
        .json(successResponse(result, "User registered successfully"));
    } catch (error) {
      next(error);
    }
  }

  // async registerWithInvitation(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<void> {
  //   try {
  //     const { email, password, fullName, invitationToken } = req.body;

  //     const user = await authService.registerWithInvitation(
  //       { email, password, fullName },
  //       invitationToken
  //     );

  //     res
  //       .status(201)
  //       .json(
  //         successResponse(
  //           { id: user._id, email: user.email },
  //           "User registered successfully"
  //         )
  //       );
  //   } catch (error) {
  //     logger.error("Registration with invitation error:", error);
  //     next(error);
  //   }
  // }

  // Add to your existing AuthController class

  async registerWithCompanyInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, fullName, companyInvitationToken } = req.body;

      const user = await authService.registerWithCompanyInvitation(
        { email, password, fullName },
        companyInvitationToken
      );

      res
        .status(201)
        .json(
          successResponse(
            { id: user._id, email: user.email },
            "User registered successfully with company invitation"
          )
        );
    } catch (error) {
      logger.error("Registration with company invitation error:", error);
      next(error);
    }
  }

  // Update existing registerWithInvitation method to accept both types of invitations
  async registerWithInvitation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        email,
        password,
        fullName,
        invitationToken,
        companyInvitationToken,
      } = req.body;

      const user = await authService.registerWithInvitation(
        { email, password, fullName },
        invitationToken,
        companyInvitationToken
      );

      res
        .status(201)
        .json(
          successResponse(
            { id: user._id, email: user.email },
            "User registered successfully"
          )
        );
    } catch (error) {
      logger.error("Registration with invitation error:", error);
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, companyId } = req.body;
      const result = await authService.login(email, password, companyId);
      res.json(successResponse(result, "Login successful"));
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      await authService.verifyEmail(token);
      res.json(successResponse(null, "Email verified successfully"));
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      res.json(successResponse(null, "Password reset email sent"));
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);
      res.json(successResponse(null, "Password reset successful"));
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
