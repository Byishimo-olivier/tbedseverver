import { Project } from "./project.model";
import {
  IProjectInvitation,
  ProjectInvitation,
} from "./projectInvitation.model";
import { User } from "../users/user.model";
import { AppError, ErrorType } from "../../utils/exceptions";
import { notificationService } from "../notifications/notifcation.service";
import { UserRole } from "@/types/enums";
import crypto from "crypto";
import mongoose from "mongoose";
import { Company } from "../users/company/company.model";

export class ProjectInvitationService {
  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid ID format", 400, ErrorType.VALIDATION);
    }
  }

  async inviteToProject(
    projectId: string,
    email: string,
    role: UserRole,
    invitedBy: string
  ): Promise<IProjectInvitation> {
    this.validateObjectId(projectId);

    // Check if project exists
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    // Check if user is already on the team
    const existingUser = await User.findOne({ email });

    // If it's a company project, the user must be a member of the company
    if (project.companyId) {
      if (!existingUser) {
        throw new AppError(
          "User must be a member of the company to be added to a company project. Please invite them to the company first.",
          400,
          ErrorType.VALIDATION
        );
      }

      const company = await Company.findById(project.companyId);
      if (!company) {
        throw new AppError(
          "Associated company not found",
          404,
          ErrorType.NOT_FOUND
        );
      }

      const isCompanyMember = company.members.some(
        (member) => member.userId.toString() === existingUser._id.toString()
      );

      if (!isCompanyMember) {
        throw new AppError(
          "User is not a member of the company that owns this project.",
          403,
          ErrorType.AUTHORIZATION
        );
      }
    }
    if (existingUser) {
      const isAlreadyMember = project.team.some(
        (member) => member.user.toString() === existingUser._id.toString()
      );
      if (isAlreadyMember) {
        throw new AppError(
          "User is already a member of the project team",
          400,
          ErrorType.VALIDATION
        );
      }
    }

    // Generate a unique token
    const token = crypto.randomBytes(8).toString("hex");

    // Token expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create or update invitation
    const invitation = await ProjectInvitation.findOneAndUpdate(
      { projectId, email },
      {
        projectId,
        email,
        role,
        token,
        expired: false,
        accepted: false,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    // Send different emails for existing vs new users
    const inviter = await User.findById(invitedBy);
    const inviterName = inviter?.fullName || "The project owner";

    if (existingUser) {
      await this.sendInvitationToExistingUser(
        existingUser,
        project,
        invitation,
        inviterName
      );
    } else {
      await this.sendInvitationToNewUser(
        email,
        project,
        invitation,
        inviterName
      );
    }

    return invitation;
  }

  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ project: any; role: string }> {
    // Find the invitation by token
    const invitation = await ProjectInvitation.findOne({
      token,
      expired: false,
      accepted: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invitation) {
      throw new AppError(
        "Invalid or expired invitation",
        400,
        ErrorType.VALIDATION
      );
    }

    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, ErrorType.NOT_FOUND);
    }

    // Check if the user's email matches the invitation email
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new AppError(
        "This invitation was not sent to your email address",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Get the project
    const project = await Project.findById(invitation.projectId);
    if (!project) {
      throw new AppError("Project not found", 404, ErrorType.NOT_FOUND);
    }

    // Check if user is already in the team to avoid duplicates
    const isAlreadyMember = project.team.some(
      (member) => member.user.toString() === user._id.toString()
    );

    // Add user to the team if they are not already a member
    if (!isAlreadyMember) {
      project.team.push({
        user: user._id,
        role: invitation.role,
      });
    }

    // Save the project
    await project.save();

    // Mark invitation as accepted
    invitation.accepted = true;
    await invitation.save();

    // Notify the project owner
    await this.notifyProjectOwner(project, user, invitation.role);

    return {
      project,
      role: invitation.role,
    };
  }

  async getPendingInvitations(
    projectId: string
  ): Promise<IProjectInvitation[]> {
    this.validateObjectId(projectId);
    const invitations = await ProjectInvitation.find({
      projectId,
      accepted: false,
      expired: false,
      expiresAt: { $gt: new Date() },
    }).lean();
    return invitations;
  }

  private async sendInvitationToExistingUser(
    user: any,
    project: any,
    invitation: IProjectInvitation,
    inviterName: string
  ): Promise<void> {
    const invitationLink = `${process.env.FRONTEND_URL}/projects/invitation/accept/${invitation.token}`;

    await notificationService.sendTemplateEmail(
      user.email,
      `Invitation to join project: ${project.name}`,
      "project-invitation",
      {
        userName: user.fullName || user.email,
        projectName: project.name,
        role: invitation.role.toLowerCase(),
        inviterName,
        acceptLink: invitationLink,
        expiryDays: "7",
        year: new Date().getFullYear().toString(),
      }
    );
  }

  private async sendInvitationToNewUser(
    email: string,
    project: any,
    invitation: IProjectInvitation,
    inviterName: string
  ): Promise<void> {
    const registrationLink = `${process.env.FRONTEND_URL}/register/${invitation.token}`;

    await notificationService.sendTemplateEmail(
      email,
      `Invitation to join project: ${project.name}`,
      "project-invitation-new-user",
      {
        email,
        projectName: project.name,
        role: invitation.role.toLowerCase(),
        inviterName,
        registerLink: registrationLink,
        expiryDays: "7",
        year: new Date().getFullYear().toString(),
      }
    );
  }

  private async notifyProjectOwner(
    project: any,
    user: any,
    role: string
  ): Promise<void> {
    const owner = await User.findById(project.createdBy);
    if (owner && owner.email) {
      await notificationService.sendTemplateEmail(
        owner.email,
        `Team Member Joined: ${project.name}`,
        "project-invitation-accepted",
        {
          ownerName: owner.fullName || "Project Owner",
          userName: user.fullName || user.email,
          userEmail: user.email,
          projectName: project.name,
          role: role.toLowerCase(),
          projectLink: `${process.env.FRONTEND_URL}/projects/${project._id}`,
          year: new Date().getFullYear().toString(),
        }
      );
    }
  }
}

export const projectInvitationService = new ProjectInvitationService();
