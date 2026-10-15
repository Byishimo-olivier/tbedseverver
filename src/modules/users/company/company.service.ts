import mongoose from "mongoose";
import crypto from "crypto";
import { Company, ICompany } from "./company.model";
import { CompanyInvitation } from "./companyInvitation.model";
import { CompanyUserRole } from "@/types/enums";
import { AppError, ErrorType } from "@/utils/exceptions";
import { User } from "../user.model";
// import { getCompanyPermissionsForRole } from "@/config/company-permissions";
import { notificationService } from "@/modules/notifications/notifcation.service";
import { IProject, Project } from "@/modules/projects/project.model";

export class CompanyService {
  private validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError("Invalid ID format", 400, ErrorType.VALIDATION);
    }
  }

  async createCompany(
    companyData: Partial<ICompany>,
    userId: string
  ): Promise<ICompany> {
    this.validateObjectId(userId);

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, ErrorType.NOT_FOUND);
    }

    // Create company
    const trialEnds = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day trial
    const company = new Company({
      ...companyData,
      ownerId: userId,
      trialEnds,
      members: [
        {
          userId: userId,
          role: CompanyUserRole.ADMIN,
        },
      ],
    });

    await company.save();

    // Associate company with user
    user.isIndividual = false;
    if (!user.companies) {
      user.companies = [];
    }
    user.companies.push(company._id);
    await user.save();

    return company;
  }

  async getCompanyById(id: string): Promise<ICompany> {
    this.validateObjectId(id);
    const company = await Company.findById(id).populate(
      "members.userId",
      "fullName email profilePicture"
    );
    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }
    return company;
  }

  async getUserCompanies(userId: string): Promise<ICompany[]> {
    this.validateObjectId(userId);
    const companies = await Company.find({
      "members.userId": userId,
    }).populate("ownerId", "fullName email");
    return companies;
  }

  async updateCompany(
    id: string,
    updateData: Partial<ICompany>,
    userId: string
  ): Promise<ICompany> {
    this.validateObjectId(id);
    this.validateObjectId(userId);

    // Verify company exists and user is admin
    const company = await Company.findById(id);
    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }

    // Check if user is company admin
    const memberInfo = company.members.find(
      (member) =>
        member.userId.toString() === userId &&
        member.role === CompanyUserRole.ADMIN
    );

    if (!memberInfo) {
      throw new AppError(
        "Only company admins can update company information",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Update company data
    const updatedCompany = await Company.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedCompany) {
      throw new AppError(
        "Company not found after update",
        404,
        ErrorType.NOT_FOUND
      );
    }

    return updatedCompany;
  }

    async getCompanyProjects(companyId: string): Promise<IProject[]> {
    this.validateObjectId(companyId);
    return Project.find({ companyId })
      .populate("team.user", "fullName email profilePicture");
  }

  async createCompanyProject(
    companyId: string,
    projectData: Partial<IProject>,
    createdBy: string
  ): Promise<IProject> {
    this.validateObjectId(companyId);
    this.validateObjectId(createdBy);

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }

    // Create project with company association
    const project = new Project({
      ...projectData,
      companyId,
      createdBy,
      updatedBy: createdBy,
    });
    await project.save();
    return project;
  }

  async inviteToCompany(
    companyId: string,
    email: string,
    role: CompanyUserRole,
    invitedBy: string
  ): Promise<any> {
    this.validateObjectId(companyId);
    this.validateObjectId(invitedBy);

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isMember = company.members.some(
        (member) => member.userId.toString() === existingUser._id.toString()
      );

      if (isMember) {
        throw new AppError(
          "User is already a member of this company",
          400,
          ErrorType.VALIDATION
        );
      }
    }

    // Generate a unique token
    const token = crypto.randomBytes(32).toString("hex");

    // Token expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create or update invitation
    const invitation = await CompanyInvitation.findOneAndUpdate(
      { companyId, email },
      {
        companyId,
        email,
        role,
        token,
        expired: false,
        accepted: false,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    // Get inviter information
    const inviterUser = await User.findById(invitedBy);
    const inviterName = inviterUser?.fullName || "A company administrator";

    // Send invitation email
    if (existingUser) {
      await this.sendExistingUserInvitation(
        existingUser,
        company,
        invitation,
        inviterName
      );
    } else {
      await this.sendNewUserInvitation(email, company, invitation, inviterName);
    }

    return invitation;
  }

  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<{ company: ICompany; role: string }> {
    // Find the invitation by token
    const invitation = await CompanyInvitation.findOne({
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

    // Get the company
    const company = await Company.findById(invitation.companyId);
    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }

    // Add user to company members
    company.members.push({
      userId: user._id,
      role: invitation.role,
    });

    // Save the company
    await company.save();

    // Update user to associate with company
    if (!user.companies) {
      user.companies = [];
    }
    user.companies.push(company._id);
    user.isIndividual = false;
    await user.save();

    // Mark invitation as accepted
    invitation.accepted = true;
    await invitation.save();

    // Notify company admin
    await this.notifyCompanyAdmin(company, user, invitation.role);

    return {
      company,
      role: invitation.role,
    };
  }

  async removeMemberFromCompany(
    companyId: string,
    memberUserIdToRemove: string,
    removedByUserId: string
  ): Promise<ICompany> {
    this.validateObjectId(companyId);
    this.validateObjectId(memberUserIdToRemove);
    this.validateObjectId(removedByUserId);

    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }

    // Prevent owner from being removed
    if (company.ownerId.toString() === memberUserIdToRemove) {
      throw new AppError(
        "Company owner cannot be removed. Transfer ownership first.",
        400,
        ErrorType.VALIDATION
      );
    }

    const memberIndex = company.members.findIndex(
      (member) => member.userId.toString() === memberUserIdToRemove
    );

    if (memberIndex === -1) {
      throw new AppError(
        "User is not a member of this company",
        404,
        ErrorType.NOT_FOUND
      );
    }

    company.members.splice(memberIndex, 1);
    await company.save();

    // Remove user from all associated company projects
    await Project.updateMany(
      { companyId: companyId },
      {
        $pull: {
          "team.contractor": memberUserIdToRemove,
          "team.consultant": memberUserIdToRemove,
        },
      }
    );

    // Remove company from user's list of companies
    const userToRemove = await User.findById(memberUserIdToRemove);
    if (userToRemove) {
      if (userToRemove.companies) {
        userToRemove.companies = userToRemove.companies.filter(
          (compId) => compId.toString() !== companyId
        );
        if (userToRemove.companies.length === 0) {
          userToRemove.isIndividual = true; // Revert to individual if no other companies
        }
        await userToRemove.save();
      }
    }

    // Use findById instead of relying on the saved company document
    // This helps avoid potential issues with populated fields
    const updatedCompany = await Company.findById(companyId).populate(
      "members.userId",
      "fullName email profilePicture"
    );

    if (!updatedCompany) {
      throw new AppError(
        "Company not found after removing member",
        404,
        ErrorType.NOT_FOUND
      );
    }

    return updatedCompany;
  }

  async updateMemberRole(
    companyId: string,
    memberUserIdToUpdate: string,
    newRole: CompanyUserRole,
    updatedByUserId: string
  ): Promise<ICompany> {
    this.validateObjectId(companyId);
    this.validateObjectId(memberUserIdToUpdate);
    this.validateObjectId(updatedByUserId);

    if (!Object.values(CompanyUserRole).includes(newRole)) {
      throw new AppError("Invalid role specified", 400, ErrorType.VALIDATION);
    }

    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }

    // Prevent owner's role from being changed inappropriately
    if (
      company.ownerId.toString() === memberUserIdToUpdate &&
      newRole !== CompanyUserRole.ADMIN
    ) {
      throw new AppError(
        "Company owner must have the ADMIN role.",
        400,
        ErrorType.VALIDATION
      );
    }

    const memberToUpdate = company.members.find(
      (member) => member.userId.toString() === memberUserIdToUpdate
    );

    if (!memberToUpdate) {
      throw new AppError(
        "User is not a member of this company",
        404,
        ErrorType.NOT_FOUND
      );
    }

    memberToUpdate.role = newRole;
    await company.save();

    // Use findById instead of relying on the saved company document
    // This helps avoid potential issues with populated fields
    const updatedCompany = await Company.findById(companyId).populate(
      "members.userId",
      "fullName email profilePicture"
    );

    if (!updatedCompany) {
      throw new AppError(
        "Company not found after updating member role",
        404,
        ErrorType.NOT_FOUND
      );
    }

    return updatedCompany;
  }

  async leaveCompany(companyId: string, userId: string): Promise<void> {
    this.validateObjectId(companyId);
    this.validateObjectId(userId);

    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }

    // Prevent owner from leaving
    if (company.ownerId.toString() === userId) {
      throw new AppError(
        "Company owner cannot leave the company. Please transfer ownership first.",
        400,
        ErrorType.VALIDATION
      );
    }

    const memberIndex = company.members.findIndex(
      (member) => member.userId.toString() === userId
    );

    if (memberIndex === -1) {
      throw new AppError(
        "You are not a member of this company",
        404,
        ErrorType.NOT_FOUND
      );
    }

    // Remove member from company
    company.members.splice(memberIndex, 1);
    await company.save();

    // Remove user from all associated company projects
    await Project.updateMany(
      { companyId: companyId },
      {
        $pull: {
          "team.contractor": userId,
          "team.consultant": userId,
        },
      }
    );

    // Remove company from user's list
    const user = await User.findById(userId);
    if (user && user.companies) {
      user.companies = user.companies.filter(
        (compId) => compId.toString() !== companyId
      );
      if (user.companies.length === 0) {
        user.isIndividual = true; // Revert to individual if no other companies
      }
      await user.save();
    }
  }

  async getCompanyMembers(
    companyId: string,
    requestingUserId: string
  ): Promise<any[]> {
    this.validateObjectId(companyId);
    this.validateObjectId(requestingUserId);

    const company = await Company.findById(companyId).populate(
      "members.userId",
      "fullName email profilePicture"
    );

    if (!company) {
      throw new AppError("Company not found", 404, ErrorType.NOT_FOUND);
    }

    // Ensure the requesting user is a member of the company
    const isMember = company.members.some(
      (member: any) => member.userId._id.toString() === requestingUserId
    );

    if (!isMember) {
      throw new AppError(
        "You are not authorized to view this company's members",
        403,
        ErrorType.AUTHORIZATION
      );
    }

    return company.members;
  }

  async getPendingInvitations(companyId: string): Promise<any[]> {
    this.validateObjectId(companyId);
    const invitations = await CompanyInvitation.find({
      companyId,
      accepted: false,
      expired: false,
      expiresAt: { $gt: new Date() },
    }).lean();
    return invitations;
  }

  private async sendExistingUserInvitation(
    user: any,
    company: ICompany,
    invitation: any,
    inviterName: string
  ): Promise<void> {
    const invitationLink = `${process.env.FRONTEND_URL}/company/invitation/accept?token=${invitation.token}`;

    await notificationService.sendTemplateEmail(
      user.email,
      `Invitation to join ${company.name}`,
      "company-invitation",
      {
        userName: user.fullName || user.email,
        companyName: company.name,
        role: invitation.role,
        inviterName,
        acceptLink: invitationLink,
        expiryDays: "7",
        year: new Date().getFullYear().toString(),
      }
    );
  }

  private async sendNewUserInvitation(
    email: string,
    company: ICompany,
    invitation: any,
    inviterName: string
  ): Promise<void> {
    const registrationLink = `${process.env.FRONTEND_URL}/auth/register?companyInvitationToken=${invitation.token}`;

    await notificationService.sendTemplateEmail(
      email,
      `Invitation to join ${company.name}`,
      "company-invitation-new-user",
      {
        email,
        companyName: company.name,
        role: invitation.role,
        inviterName,
        registerLink: registrationLink,
        expiryDays: "7",
        year: new Date().getFullYear().toString(),
      }
    );
  }

  private async notifyCompanyAdmin(
    company: ICompany,
    user: any,
    role: string
  ): Promise<void> {
    const admin = await User.findById(company.ownerId);
    if (admin && admin.email) {
      await notificationService.sendTemplateEmail(
        admin.email,
        `New Member Joined: ${company.name}`,
        "company-member-joined",
        {
          adminName: admin.fullName || "Administrator",
          userName: user.fullName || user.email,
          userEmail: user.email,
          companyName: company.name,
          role: role,
          companyLink: `${process.env.FRONTEND_URL}/company/${company._id}`,
          year: new Date().getFullYear().toString(),
        }
      );
    }
  }
}

export const companyService = new CompanyService();
