import { Project } from "../projects/project.model";
import { Budget } from "../finance/models/budget.model";
import { Expense } from "../finance/models/expense.model";
import {
  CompanyUserRole,
  DocumentStatus,
  ProjectStageStatus,
  ProjectStatus,
  UserRole,
} from "@/types/enums";
import mongoose from "mongoose";
import { GRN } from "../finance/models/grn.model";
import { InventoryItem } from "../finance/models/inventory.model";
import { Upload } from "../file/upload.model";
import { MaterialRequest } from "../procurement/materialRequest.model";
import { PurchaseOrder } from "../procurement/purchaseOrder.model";
import { ProjectStageModel } from "../timeline/timeline.model";
import { projectService } from "../projects/project.service";
import { Company } from "../users/company/company.model";
import { Tender } from "../bidding/models/tender.model";
import { Bid } from "../bidding/models/bid.model";
import { TenderStatus, BidStatus } from "@/types/enums";

export class DashboardService {
  private async getProjectQuery(userId: string, companyId?: string) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  if (companyId) {
    // Fetch company to see if user is admin
    const company = await Company.findById(companyId).select("members");
    const isAdmin = company?.members.some(m => m.userId.toString() === userId && m.role === CompanyUserRole.ADMIN);

    // Admin: all company projects; others: only those they own or are on the team
    return isAdmin
      ? { companyId: new mongoose.Types.ObjectId(companyId) }
      : {
          companyId: new mongoose.Types.ObjectId(companyId),
          $or: [
            { createdBy: userObjectId },
            { "team.user": userObjectId },
          ],
        };
  }

  // Individual projects (no companyId) where user is owner or team member
  return {
    companyId: null,
    $or: [
      { createdBy: userObjectId },
      { "team.user": userObjectId },
    ],
  };
}
  async getDashboardSummary(userId: string, companyId?: string): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    const projects = await Project.find(projectQuery);
    const projectIds = projects.map((p) => p._id);

    const totalProjects = projects.length;
    const projectsByStatus = {
      [ProjectStatus.IN_PROGRESS]: projects.filter(
        (p) => p.status === ProjectStatus.IN_PROGRESS
      ).length,
      [ProjectStatus.COMPLETED]: projects.filter(
        (p) => p.status === ProjectStatus.COMPLETED
      ).length,
      [ProjectStatus.PLANNING]: projects.filter(
        (p) => p.status === ProjectStatus.PLANNING
      ).length,
      [ProjectStatus.ON_HOLD]: projects.filter(
        (p) => p.status === ProjectStatus.ON_HOLD
      ).length,
      [ProjectStatus.CANCELLED]: projects.filter(
        (p) => p.status === ProjectStatus.CANCELLED
      ).length,
    };

    const budgets = await Budget.find({ projectId: { $in: projectIds } });
    const expenses = await Expense.find({ projectId: { $in: projectIds } });

    const totalBudget = budgets.reduce(
      (sum, budget) => sum + budget.totalPlannedBudget,
      0
    );
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const totalRemainingBudget = totalBudget - totalExpenses;
    const overallBudgetUtilization =
      totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

    return {
      totalProjects,
      projectsByStatus,
      financials: {
        totalBudget,
        totalExpenses,
        totalRemainingBudget,
        overallBudgetUtilization,
      },
    };
  }

  async getProjectsHealth(
    userId: string,
    companyId?: string,
    status?: ProjectStatus
  ): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    if (status) {
      (projectQuery as any).status = status;
    }

    const projects = await Project.find(projectQuery);
    if (projects.length === 0) {
      return {
        projects: [],
        overallHealthPercentage: "100.00",
      };
    }

    const projectIds = projects.map((p) => p._id);

    const [budgets, expenses] = await Promise.all([
      Budget.find({ projectId: { $in: projectIds } }),
      Expense.find({ projectId: { $in: projectIds } }),
    ]);

    const budgetsMap = new Map(budgets.map((b) => [b.projectId.toString(), b]));
    const expensesMap = new Map<string, number>();
    expenses.forEach((e) => {
      const projectId = e.projectId.toString();
      expensesMap.set(projectId, (expensesMap.get(projectId) || 0) + e.amount);
    });

    let totalHealthScore = 0;

    const projectsHealth = projects.map((project) => {
      const budget = budgetsMap.get(project._id.toString());
      const actualExpenses = expensesMap.get(project._id.toString()) || 0;
      const plannedBudget = budget?.totalPlannedBudget || 0;
      const remainingBudget = plannedBudget - actualExpenses;
      const budgetUtilization =
        plannedBudget > 0 ? (actualExpenses / plannedBudget) * 100 : 0;

      // Variance: Budgeted Cost of Work Performed (BCWP) - Actual Cost (AC)
      // BCWP = Total Budget * % Complete
      const bcwp = plannedBudget * (project.progress / 100);
      const variance = bcwp - actualExpenses;

      // Calculate individual project health score (0-100)
      let healthScore = 0;
      if (plannedBudget > 0) {
        // 50% weight for budget variance, 50% for progress
        const varianceHealth = Math.max(0, 1 + variance / plannedBudget); // Normalize variance
        healthScore =
          (Math.min(varianceHealth, 1.2) / 1.2) * 50 +
          (project.progress / 100) * 50;
      } else if (project.progress > 0) {
        healthScore = 100; // Progress without budget is considered healthy
      } else {
        healthScore = 100; // No budget, no progress, neutral health
      }
      totalHealthScore += healthScore;

      return {
        projectId: project._id,
        projectName: project.name,
        status: project.status,
        progress: project.progress,
        budget: plannedBudget,
        expenses: actualExpenses,
        remainingBudget,
        variance,
        budgetUtilization,
        healthScore: healthScore.toFixed(2),
      };
    });

    const overallHealthPercentage =
      projects.length > 0 ? totalHealthScore / projects.length : 100;

    return {
      projects: projectsHealth,
      overallHealthPercentage: overallHealthPercentage.toFixed(2),
    };
  }

  async getProcurementAnalytics(
    userId: string,
    companyId?: string
  ): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    const projects = await Project.find(projectQuery).select("_id");
    const projectIds = projects.map((p) => p._id);

    const [
      materialRequestCount,
      purchaseOrderCount,
      onTimeDeliveries,
      totalDeliveries,
    ] = await Promise.all([
      MaterialRequest.countDocuments({ projectId: { $in: projectIds } }),
      PurchaseOrder.countDocuments({ projectId: { $in: projectIds } }),
      GRN.countDocuments({
        projectId: { $in: projectIds },
        $expr: { $lte: ["$receivedDate", "$expectedDeliveryDate"] },
      }),
      GRN.countDocuments({
        projectId: { $in: projectIds },
        expectedDeliveryDate: { $exists: true },
      }),
    ]);

    const onTimeDeliveryPercentage =
      totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

    return {
      materialRequestCount,
      purchaseOrderCount,
      supplierPerformance: {
        onTimeDeliveryPercentage: onTimeDeliveryPercentage.toFixed(2),
      },
    };
  }

  async getDocumentWorkflowAnalytics(
    userId: string,
    companyId?: string
  ): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    const projects = await Project.find(projectQuery).select("_id");
    const projectIds = projects.map((p) => p._id.toString());

    if (projectIds.length === 0) {
      return {
        totalDocuments: 0,
        approved: 0,
        pending: 0,
        approvalRate: "0.00",
        averageApprovalTimeDays: "0.00",
      };
    }

    // Fetch all documents across all projects for the user/company
    let allDocuments: any[] = [];
    for (const projectId of projectIds) {
      const docs = await projectService.getProjectDocuments(
        projectId,
        UserRole.OWNER,
        {}
      );
      allDocuments = allDocuments.concat(docs);
    }

    let approved = 0;
    let pending = 0;
    const approvedDocIds: string[] = [];

    allDocuments.forEach((doc) => {
      if (doc.status === DocumentStatus.APPROVED) {
        approved++;
        // Collect the IDs of approved documents to fetch their timestamps
        if (doc._id) {
          approvedDocIds.push(doc._id.toString());
        }
      } else if (doc.status === DocumentStatus.PENDING) {
        pending++;
      }
    });

    let totalApprovalTime = 0;
    let approvedCountWithTime = 0;

    if (approvedDocIds.length > 0) {
      const approvedUploads = await Upload.find({
        _id: { $in: approvedDocIds },
        reviewedAt: { $exists: true },
      }).select("createdAt reviewedAt");

      approvedUploads.forEach((upload) => {
        if (upload.createdAt && upload.reviewedAt) {
          const timeDiff =
            upload.reviewedAt.getTime() - upload.createdAt.getTime();
          totalApprovalTime += timeDiff;
          approvedCountWithTime++;
        }
      });
    }

    const totalDocuments = approved + pending;
    const approvalRate =
      totalDocuments > 0 ? (approved / totalDocuments) * 100 : 0;
    const averageApprovalTimeDays =
      approvedCountWithTime > 0
        ? totalApprovalTime / approvedCountWithTime / (1000 * 60 * 60 * 24)
        : 0;

    return {
      totalDocuments,
      approved,
      pending,
      approvalRate: approvalRate.toFixed(2),
      averageApprovalTimeDays: averageApprovalTimeDays.toFixed(2),
    };
  }

  async getPerformanceMatrix(userId: string, companyId?: string): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    const projects = await Project.find(projectQuery).select("_id");
    const projectIds = projects.map((p) => p._id);

    // Stock Health
    const inventoryItems = await InventoryItem.find({
      projectId: { $in: projectIds },
    });
    const itemsBelowMinimum = inventoryItems.filter(
      (item) => item.currentStock < item.minimumStock
    ).length;
    const stockHealthPercentage =
      inventoryItems.length > 0
        ? ((inventoryItems.length - itemsBelowMinimum) /
            inventoryItems.length) *
          100
        : 100;

    // On-time delivery (re-using logic from procurement analytics)
    const [onTimeDeliveries, totalDeliveries] = await Promise.all([
      GRN.countDocuments({
        projectId: { $in: projectIds },
        $expr: { $lte: ["$receivedDate", "$expectedDeliveryDate"] },
      }),
      GRN.countDocuments({
        projectId: { $in: projectIds },
        expectedDeliveryDate: { $exists: true },
      }),
    ]);
    const onTimeDeliveryPercentage =
      totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;

    // Simplified risk score and predicted completion
    const riskScore =
      100 - (stockHealthPercentage + onTimeDeliveryPercentage) / 2;

    return {
      riskScore: riskScore.toFixed(2),
      onTimeDeliveryPercentage: onTimeDeliveryPercentage.toFixed(2),
      stockHealthPercentage: stockHealthPercentage.toFixed(2),
      predictedCompletionDate: "N/A", // This requires a more complex predictive model
    };
  }

  async getTimelineTrends(userId: string, companyId?: string): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    const projects = await Project.find(projectQuery).select("_id progress");

    if (projects.length === 0) {
      return {
        totalStages: 0,
        completedStages: 0,
        averageProgress: 0,
        averageDelayDays: 0,
      };
    }

    const projectIds = projects.map((p) => p._id);

    const stages = await ProjectStageModel.find({
      projectId: { $in: projectIds },
    });

    const totalStages = stages.length;
    const completedStages = stages.filter(
      (s) => s.status === ProjectStageStatus.COMPLETED
    ).length;

    const totalProgress = projects.reduce((sum, p) => sum + p.progress, 0);
    const averageProgress =
      projects.length > 0 ? totalProgress / projects.length : 0;

    const now = new Date();
    let totalDelayDays = 0;
    let delayedStagesCount = 0;

    stages.forEach((stage) => {
      if (
        stage.status !== ProjectStageStatus.COMPLETED &&
        stage.endDate < now
      ) {
        const delay = now.getTime() - stage.endDate.getTime();
        totalDelayDays += delay / (1000 * 60 * 60 * 24);
        delayedStagesCount++;
      }
    });

    const averageDelayDays =
      delayedStagesCount > 0 ? totalDelayDays / delayedStagesCount : 0;

    return {
      totalStages,
      completedStages,
      averageProgress: averageProgress.toFixed(2),
      averageDelayDays: averageDelayDays.toFixed(2),
    };
  }

  async getAdvancedAnalytics(userId: string, companyId?: string): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    const projects = await Project.find(projectQuery);

    if (projects.length === 0) {
      return {
        budgetEfficiencyPercentage: "0.00",
        costVariancePercentage: "0.00",
        procurementVelocityPercentage: "0.00",
        procurementVelocity: {
          percentage: "0.00",
          moneySaved: "0.00",
        },
        projectsOnTrackPercentage: "100.00",
      };
    }

    const projectIds = projects.map((p) => p._id);

    const [budgets, expenses, materialRequests, purchaseOrders] =
      await Promise.all([
        Budget.find({ projectId: { $in: projectIds } }),
        Expense.find({ projectId: { $in: projectIds } }),
        MaterialRequest.find({ projectId: { $in: projectIds } }),
        PurchaseOrder.find({ projectId: { $in: projectIds } }),
      ]);

    // --- Financial Metrics ---
    const totalBudget = budgets.reduce(
      (sum, budget) => sum + budget.totalPlannedBudget,
      0
    );
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const averageProgress =
      projects.reduce((sum, p) => sum + p.progress, 0) / projects.length;

    const earnedValue = totalBudget * (averageProgress / 100);
    const costVariance = earnedValue - totalExpenses;

    const budgetEfficiencyPercentage =
      totalExpenses > 0 ? (earnedValue / totalExpenses) * 100 : 0;
    const costVariancePercentage =
      totalBudget > 0 ? (costVariance / totalBudget) * 100 : 0;

    // --- Procurement Velocity ---
    const totalEstimatedCost = materialRequests.reduce(
      (sum, mr) =>
        sum +
        mr.materialDetails.reduce(
          (itemSum, item) => itemSum + (item.quantity * (item.estimatedCost || 0)),
          0
        ),
      0
    );
    const totalActualCost = purchaseOrders.reduce(
      (sum, po) => sum + po.totalCost,
      0
    );
    const moneySaved = totalEstimatedCost - totalActualCost;
    const procurementVelocityPercentage =
      totalEstimatedCost > 0 ? (moneySaved / totalEstimatedCost) * 100 : 0;

    // --- Projects on Track ---
    const onTrackProjects = projects.filter((p) => {
      const projectBudget = budgets.find(
        (b) => b.projectId.toString() === p._id.toString()
      );
      if (!projectBudget) return true; // Cannot determine, assume on track

      const projectExpenses = expenses
        .filter((e) => e.projectId.toString() === p._id.toString())
        .reduce((sum, e) => sum + e.amount, 0);

      const budgetBurnRate =
        projectBudget.totalPlannedBudget > 0
          ? (projectExpenses / projectBudget.totalPlannedBudget) * 100
          : 0;
      // "On track" if progress is ahead of or close to budget burn rate
      return p.progress >= budgetBurnRate - 10;
    }).length;

    const projectsOnTrackPercentage =
      projects.length > 0 ? (onTrackProjects / projects.length) * 100 : 100;

    return {
      budgetEfficiencyPercentage: budgetEfficiencyPercentage.toFixed(2),
      costVariancePercentage: costVariancePercentage.toFixed(2),
      procurementVelocityPercentage: procurementVelocityPercentage.toFixed(2),
      procurementVelocity: {
        percentage: procurementVelocityPercentage.toFixed(2),
        moneySaved: moneySaved.toFixed(2),
      },
      projectsOnTrackPercentage: projectsOnTrackPercentage.toFixed(2),
    };
  }

  async getBiddingAnalytics(userId: string, companyId?: string): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    const projects = await Project.find(projectQuery).select("_id");
    const projectIds = projects.map((p) => p._id);

    const [tenders, bids] = await Promise.all([
      Tender.find({ projectId: { $in: projectIds } }),
      Bid.find({ projectId: { $in: projectIds } }),
    ]);

    const totalTenders = tenders.length;
    const activeTenders = tenders.filter(
      (t) => t.status === TenderStatus.PUBLISHED
    ).length;

    const totalBids = bids.length;
    
    // Average bids per tender
    const avgBidsPerTender = totalTenders > 0 ? (totalBids / totalTenders) : 0;
    
    // Awards / success rate (Tenders that have awarded bids)
    const awardedBids = bids.filter((b) => b.status === BidStatus.AWARDED).length;

    return {
      totalTenders,
      activeTenders,
      totalBids,
      awardedBids,
      avgBidsPerTender: avgBidsPerTender.toFixed(2),
    };
  }

  async getCashFlow(
    userId: string,
    companyId?: string,
    period: "monthly" | "weekly" = "monthly"
  ): Promise<any> {
    const projectQuery = await this.getProjectQuery(userId, companyId);
    const projects = await Project.find(projectQuery).select("_id");
    const projectIds = projects.map((p) => p._id);

    const expenses = await Expense.find({
      projectId: { $in: projectIds },
    }).sort({ date: 1 });

    const cashFlowData: { [key: string]: number } = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      let key: string;
      if (period === "monthly") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
        )}`;
      } else {
        // Weekly
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split("T")[0];
      }
      cashFlowData[key] = (cashFlowData[key] || 0) + expense.amount;
    });

    const labels = Object.keys(cashFlowData).sort();
    const data = labels.map((label) => cashFlowData[label]);

    return {
      labels,
      datasets: [{ label: "Expenses", data }],
    };
  }
}

export const dashboardService = new DashboardService();
