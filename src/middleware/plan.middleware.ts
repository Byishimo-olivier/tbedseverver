import { Response, NextFunction } from "express";
import { getPlanById, PlanId, Plan } from "@/config/plans";
import { Project } from "@/modules/projects/project.model";
import { AuthRequest } from "./auth.middleware";
import { AppError, ErrorType } from "@/utils/exceptions";
import { IUser, User } from "@/modules/users/user.model";
import { ICompany } from "@/modules/users/company/company.model";

type FeatureKey = keyof Plan["features"];
type ResourceType = "projects" | "users";

// Helper to get the active plan and the entity it belongs to
const getActivePlanAndEntity = async (req: AuthRequest): Promise<{ plan: Plan, entityName: string }> => {
    const now = new Date();
    let entity: (IUser | ICompany) & { trialEndsAt?: Date, trialEnds?: Date };
    let entityName: string;
    let basePlanId: PlanId;

    if (req.activeCompany) {
        entity = req.activeCompany;
        entityName = req.activeCompany.name;
        basePlanId = req.activeCompany.plan;
    } else {
        const user = await User.findById(req.user!.id);
        if (!user) throw new AppError("User not found.", 404, ErrorType.NOT_FOUND);
        entity = user;
        entityName = "your personal account";
        basePlanId = user.plan;
    }

    // Check for active trial
    const activeTrialEnds = entity.trialEndsAt || entity.trialEnds;
    if (activeTrialEnds && activeTrialEnds > now) {
        if (basePlanId === PlanId.BASIC) {
            const trialPlan = getPlanById(PlanId.ENTERPRISE);
            return { plan: { ...trialPlan, name: `${trialPlan.name} (Trial)` }, entityName };
        }
    }

    // If no active trial, return the entity's actual plan
    const plan = getPlanById(basePlanId);
    return { plan, entityName };
};

/**
 * Middleware to check if the active plan allows access to a specific feature.
 */
export const canAccessFeature = (feature: FeatureKey) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
        const { plan, entityName } = await getActivePlanAndEntity(req);

        if (plan.features[feature]) {
            return next();
        } else {
            return next(new AppError(
                `The current plan (${plan.name}) for ${entityName} does not support this feature. Please upgrade your plan.`,
                403,
                ErrorType.AUTHORIZATION
            ));
        }
    } catch (error) {
        next(error);
    }
  };
};

/**
 * Middleware to check if the usage of a resource is within the plan's limits.
 */
export const checkUsageLimit = (resource: ResourceType) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
        const { plan, entityName } = await getActivePlanAndEntity(req);

        const limitKeyMap: Record<ResourceType, FeatureKey> = {
            projects: "maxProjects",
            users: "maxUsers",
        };
        const limitKey = limitKeyMap[resource];
        const limit = plan.features[limitKey] as number;

        if (limit === Infinity) {
            return next(); // Unlimited usage
        }

        let currentUsage = 0;
        if (req.activeCompany) {
            if (resource === "projects") {
                currentUsage = await Project.countDocuments({ companyId: req.activeCompany.id });
            } else if (resource === "users") {
                currentUsage = req.activeCompany.members.length;
            }
        } else {
            if (resource === "projects") {
                currentUsage = await Project.countDocuments({ createdBy: req.user!.id, companyId: null });
            } else {
                // User limit check is not applicable for individual accounts
                return next();
            }
        }

        if (currentUsage < limit) {
            return next();
        } else {
            return next(new AppError(
                `You have reached the limit of ${limit} ${resource} for ${entityName} on the ${plan.name} plan. Please upgrade to add more.`,
                403,
                ErrorType.AUTHORIZATION
            ));
        }
    } catch (error) {
        next(error);
    }
  };
};