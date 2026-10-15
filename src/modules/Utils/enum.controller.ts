import { Request, Response } from "express";
import {
  ProjectType,
  ProjectStatus,
  ExpenseCategory,
  InvoiceStatus,
  InvoiceType,
  BudgetApprovalStatus,
  ReportingPeriod,
  GRNStatus,
  UnitOfMeasurement,
  PaymentTerms,
  PriorityLevel,
  ProjectStage,
  ProjectStageStatus,
  Department,
  UserRole,
  MembershipTier,
  RateType,
} from "../../types/enums";
import { successResponse } from "@/utils/response";

/**
 * Helper function to convert an enum to a key-value object
 * @param enumObj The enum object
 * @returns An object with enum keys and their corresponding values
 */
const enumToKeyValuePairs = (enumObj: any) => {
  const result: Record<string, string> = {};
  Object.keys(enumObj).forEach((key) => {
    // Filter out reverse mappings that TypeScript adds to enums
    if (isNaN(Number(key))) {
      result[key] = enumObj[key];
    }
  });
  return result;
};

export class EnumController {
  getAllEnums(_req: Request, res: Response) {
    const enums = {
      ProjectType: enumToKeyValuePairs(ProjectType),
      ProjectStatus: enumToKeyValuePairs(ProjectStatus),
      ExpenseCategory: enumToKeyValuePairs(ExpenseCategory),
      InvoiceStatus: enumToKeyValuePairs(InvoiceStatus),
      InvoiceType: enumToKeyValuePairs(InvoiceType),
      BudgetApprovalStatus: enumToKeyValuePairs(BudgetApprovalStatus),
      ReportingPeriod: enumToKeyValuePairs(ReportingPeriod),
      GRNStatus: enumToKeyValuePairs(GRNStatus),
      UnitOfMeasurement: enumToKeyValuePairs(UnitOfMeasurement),
      PaymentTerms: enumToKeyValuePairs(PaymentTerms),
      PriorityLevel: enumToKeyValuePairs(PriorityLevel),
      ProjectStage: enumToKeyValuePairs(ProjectStage),
      ProjectStageStatus: enumToKeyValuePairs(ProjectStageStatus),
      Department: enumToKeyValuePairs(Department),
      UserRole: enumToKeyValuePairs(UserRole),
      MembershipTier: enumToKeyValuePairs(MembershipTier),
      RateType: enumToKeyValuePairs(RateType),
    };

    return res
      .status(200)
      .json(successResponse(enums, "Enums fetched successfully"));
  }
}

export const enumController = new EnumController();
