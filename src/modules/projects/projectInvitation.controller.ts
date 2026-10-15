import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { projectInvitationService } from "./projectInvitation.service";
import { successResponse } from "../../utils/response";
import { logger } from "../../utils/logger";

export class InvitationController {
  async createInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { projectId, email, role } = req.body;

      const invitation = await projectInvitationService.inviteToProject(
        projectId,
        email,
        role,
        req.user.id
      );

      res
        .status(201)
        .json(
          successResponse(
            { email: invitation.email, role: invitation.role },
            "Invitation sent successfully"
          )
        );
    } catch (error) {
      logger.error("Error creating invitation:", error);
      next(error);
    }
  }

  async acceptInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      const result = await projectInvitationService.acceptInvitation(
        token,
        req.user.id
      );

      res.json(
        successResponse(
          {
            projectId: result.project._id,
            projectName: result.project.name,
            role: result.role,
          },
          "You have successfully joined the project"
        )
      );
    } catch (error) {
      logger.error("Error accepting invitation:", error);
      next(error);
    }
  }

  async getPendingInvitations(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { projectId } = req.params;
      const invitations = await projectInvitationService.getPendingInvitations(
        projectId
      );
      res.json(
        successResponse(
          invitations,
          "Pending project invitations retrieved successfully"
        )
      );
    } catch (error) {
      logger.error("Error retrieving pending project invitations:", error);
      next(error);
    }
  }
}

export const invitationController = new InvitationController();
