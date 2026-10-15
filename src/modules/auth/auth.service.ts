import { logger } from "@/utils/logger";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User, IUser } from "../users/user.model";
import { AppError, ErrorType } from "@/utils/exceptions";
import { notificationService } from "../notifications/notifcation.service";
import { ProjectInvitation } from "../projects/projectInvitation.model";
import { projectInvitationService } from "../projects/projectInvitation.service";
import { CompanyInvitation } from "../users/company/companyInvitation.model";
import { companyService } from "../users/company/company.service";
import {Company} from "@/modules/users/company/company.model";

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = "7d";

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        "JWT_SECRET is missing. Create a .env file from .env.example and set JWT_SECRET to a private random value."
      );
    }
    this.JWT_SECRET = secret;
  }

  async register(
    userData: Partial<IUser>
  ): Promise<{ user: IUser; token: string }> {
    // Input validation
    if (!userData.email) {
      throw new AppError("Email is required", 400, ErrorType.VALIDATION);
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new AppError("Email already in use", 400, ErrorType.VALIDATION);
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(8).toString("hex");
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day trial

      // Create user with verification token
      const user = new User({
        ...userData,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: tokenExpires,
        isEmailVerified: false,
        trialEndsAt
      });

      // Save user
      await user.save();

      // Generate JWT token
      const token = jwt.sign({ id: user._id }, this.JWT_SECRET, {
        expiresIn: this.JWT_EXPIRES_IN,
      });

      // Send verification email asynchronously (non-blocking)
      this.sendVerificationEmailAsync(user.email, verificationToken).catch(
        (error) => logger.error("Failed to send verification email:", error)
      );

      return {
        user: user.toObject(),
        token,
      };
    } catch (error) {
      logger.error("Registration error:", error);
      throw error instanceof AppError
        ? error
        : new AppError("Registration failed", 500, ErrorType.INTERNAL);
    }
  }

  // async registerWithInvitation(
  //   userData: any,
  //   invitationToken: string
  // ): Promise<any> {
  //   // First register the user normally
  //   const result = await this.register(userData);

  //   // If there's an invitation token, try to accept it
  //   if (invitationToken) {
  //     try {
  //       // Find the invitation
  //       const invitation = await ProjectInvitation.findOne({
  //         token: invitationToken,
  //         expired: false,
  //         accepted: false,
  //         expiresAt: { $gt: new Date() },
  //       });

  //       if (
  //         invitation &&
  //         invitation.email.toLowerCase() === result.user.email.toLowerCase()
  //       ) {
  //         // Process the invitation
  //         await projectInvitationService.acceptInvitation(
  //           invitationToken,
  //           result.user._id
  //         );
  //       }
  //     } catch (error) {
  //       logger.error("Error processing invitation during registration:", error);
  //     }
  //   }

  //   return result;
  // }

  async login(
      email: string,
      password: string,
      companyId?: string
  ): Promise<{ user: IUser; token: string; activeContext: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("Invalid credentials", 401, ErrorType.AUTHENTICATION);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError("Invalid credentials", 401, ErrorType.AUTHENTICATION);
    }

    let activeContext = "individual";
    let role: string | undefined = user.role; // Default to user's global role

    if (companyId) {
      const isMember = user.companies?.some(
          (id: any) => id.toString() === companyId
      );

      if (!isMember) {
        throw new AppError(
            "You are not a member of the specified company.",
            403,
            ErrorType.AUTHORIZATION
        );
      }

      // Fetch only the user's role, not the entire company
      const company = await Company.findById(companyId, { members: 1 }).lean();
      const member = company?.members?.find(
          (m: any) => m.userId.toString() === user._id.toString()
      );
      // For company context, override global role with context role unless we need both
      role = member?.role || user.role; 
      activeContext = companyId;
    }

    const token = this.generateToken(user, activeContext, role);
    return { user, token, activeContext };
  }



  async registerWithCompanyInvitation(
    userData: any,
    companyInvitationToken: string
  ): Promise<any> {
    // First register the user normally
    const result = await this.register(userData);

    // If there's a company invitation token, try to accept it
    if (companyInvitationToken) {
      try {
        // Find the invitation
        const invitation = await CompanyInvitation.findOne({
          token: companyInvitationToken,
          expired: false,
          accepted: false,
          expiresAt: { $gt: new Date() },
        });

        if (
          invitation &&
          invitation.email.toLowerCase() === result.user.email.toLowerCase()
        ) {
          // Process the company invitation
          await companyService.acceptInvitation(
            companyInvitationToken,
            result.user._id
          );
        }
      } catch (error) {
        logger.error(
          "Error processing company invitation during registration:",
          error
        );
      }
    }

    return result;
  }

  // Update your existing registerWithInvitation method to check for company invitations too
  async registerWithInvitation(
    userData: any,
    invitationToken: string,
    companyInvitationToken?: string
  ): Promise<any> {
    // First register the user normally
    const result = await this.register(userData);

    // Process project invitation if present
    if (invitationToken) {
      try {
        const invitation = await ProjectInvitation.findOne({
          token: invitationToken,
          expired: false,
          accepted: false,
          expiresAt: { $gt: new Date() },
        });

        if (
          invitation &&
          invitation.email.toLowerCase() === result.user.email.toLowerCase()
        ) {
          await projectInvitationService.acceptInvitation(
            invitationToken,
            result.user._id
          );
        }
      } catch (error) {
        logger.error("Error processing invitation during registration:", error);
      }
    }

    // Process company invitation if present
    if (companyInvitationToken) {
      try {
        const invitation = await CompanyInvitation.findOne({
          token: companyInvitationToken,
          expired: false,
          accepted: false,
          expiresAt: { $gt: new Date() },
        });

        if (
          invitation &&
          invitation.email.toLowerCase() === result.user.email.toLowerCase()
        ) {
          await companyService.acceptInvitation(
            companyInvitationToken,
            result.user._id
          );
        }
      } catch (error) {
        logger.error(
          "Error processing company invitation during registration:",
          error
        );
      }
    }

    return result;
  }

  private generateToken(user: IUser, activeContext?: string, role?: string): string {
    return jwt.sign(
      { id: user._id, email: user.email, role, activeContext },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 404, ErrorType.NOT_FOUND);
    }

    const resetToken = crypto.randomBytes(8).toString("hex");
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await notificationService.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError(
        "Invalid or expired reset token",
        400,
        ErrorType.AUTHENTICATION
      );
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError(
        "Invalid or expired verification token",
        400,
        ErrorType.AUTHENTICATION
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
  }

  // Helper method to send verification email without blocking the registration
  private async sendVerificationEmailAsync(
    email: string,
    token: string
  ): Promise<void> {
    try {
      await notificationService.sendVerificationEmail(email, token);
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send verification email to ${email}:`, error);
    }
  }
}

export const authService = new AuthService();
