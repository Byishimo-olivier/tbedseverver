import mongoose from "mongoose";
import { IUser } from "./user.model";
import { User } from "./user.model";
import { Upload } from "../file/upload.model";
import { AppError, ErrorType } from "../../utils/exceptions";
import { logger } from "../../utils/logger";

export class UserService {
  async getUserById(id: string): Promise<IUser> {
    try {
      const user = await User.findById(id);
      if (!user) {
        throw new AppError("User not found", 404, ErrorType.NOT_FOUND);
      }
      return user;
    } catch (error) {
      logger.error("Failed to get user:", error);
      throw error instanceof AppError
        ? error
        : new AppError("Failed to get user", 500, ErrorType.INTERNAL);
    }
  }

  async updateProfile(
    userId: string,
    updateData: Partial<IUser>,
    profilePicture?: string
  ): Promise<IUser> {
    let session: mongoose.ClientSession | null = null;

    try {
      // Start transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // Find and update user
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new AppError("User not found", 404, ErrorType.NOT_FOUND);
      }

      // Filter out protected fields
      const protectedFields = ["password", "role", "isEmailVerified"];
      const sanitizedData = (
        Object.entries(updateData) as [keyof IUser, any][]
      ).reduce((acc, [key, value]) => {
        if (!protectedFields.includes(key as string)) {
          acc[key] = value;
        }
        return acc;
      }, {} as Partial<IUser>);

      // Update user data
      Object.assign(user, sanitizedData);

      // Update profile picture if provided
      if (profilePicture) {
        user.profilePicture = profilePicture;
      }

      // Save changes
      await user.save({ session });

      // Commit transaction
      await session.commitTransaction();

      return user.toObject();
    } catch (error) {
      // Rollback transaction on error
      if (session) {
        await session.abortTransaction();
      }

      logger.error("Failed to update profile:", error);
      throw error instanceof AppError
        ? error
        : new AppError("Failed to update profile", 500, ErrorType.INTERNAL);
    } finally {
      // Always end session
      if (session) {
        session.endSession();
      }
    }
  }

  async getAllUsersDetails(): Promise<IUser[]> {
    try {
      // Get all users and populate companies they belong to
      const users = await User.find({})
        .populate("companies") // populate Company details
        .select("-password")
        .sort({ createdAt: -1 });
      return users;
    } catch (error) {
      logger.error("Failed to get all users details:", error);
      throw error instanceof AppError
        ? error
        : new AppError(
            "Failed to get users details",
            500,
            ErrorType.INTERNAL
          );
    }
  }

  async getAdminUserStats(): Promise<any[]> {
    try {
      const users = await User.find({})
        .populate("companies", "name plan subscriptionStatus members type")
        .select("-password")
        .sort({ createdAt: -1 })
        .lean();

      const uploadStats = await Upload.aggregate([
        {
          $group: {
            _id: "$userId",
            totalStorageUsed: { $sum: "$fileSize" },
            documentCount: { $sum: 1 },
          },
        },
      ]);

      const statsMap = new Map(
        uploadStats.map((stat) => [stat._id.toString(), stat])
      );

      return users.map((user: any) => {
        const stats = statsMap.get(user._id.toString()) || {
          totalStorageUsed: 0,
          documentCount: 0,
        };

        return {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          plan: user.plan,
          subscriptionStatus: user.subscriptionStatus,
          isIndividual: user.isIndividual,
          totalStorageUsed: stats.totalStorageUsed,
          documentCount: stats.documentCount,
          companyCount: user.companies ? user.companies.length : 0,
          companies: (user.companies || []).map((company: any) => ({
            _id: company._id,
            name: company.name,
            type: company.type,
            plan: company.plan,
            subscriptionStatus: company.subscriptionStatus,
            teamMemberCount: company.members ? company.members.length : 0,
          })),
        };
      });
    } catch (error) {
      logger.error("Failed to get admin user stats:", error);
      throw error instanceof AppError
        ? error
        : new AppError(
            "Failed to get admin user stats",
            500,
            ErrorType.INTERNAL
          );
    }
  }

  async deleteUser(id: string): Promise<void> {
    let session: mongoose.ClientSession | null = null;

    try {
      // Start transaction
      session = await mongoose.startSession();
      session.startTransaction();

      // Delete user
      const user = await User.findByIdAndDelete(id).session(session);
      if (!user) {
        throw new AppError("User not found", 404, ErrorType.NOT_FOUND);
      }

      // Commit transaction
      await session.commitTransaction();
    } catch (error) {
      // Rollback transaction on error
      if (session) {
        await session.abortTransaction();
      }

      logger.error("Failed to delete user:", error);
      throw error instanceof AppError
        ? error
        : new AppError("Failed to delete user", 500, ErrorType.INTERNAL);
    } finally {
      // Always end session
      if (session) {
        session.endSession();
      }
    }
  }
}

export const userService = new UserService();
