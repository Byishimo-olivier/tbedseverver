export enum PlanId {
  BASIC = "basic",
  PROFESSIONAL = "professional",
  ENTERPRISE = "enterprise",
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  features: {
    // Usage-based limits
    maxProjects: number;
    maxUsers: number;
    storageGB: number;
    // Boolean feature flags
    canCreateTenders: boolean;
    canAccessBidding: boolean;
    canCreateInvoices: boolean;
    hasAdvancedReporting: boolean;
    hasBudgetThresholdAlerts: boolean;
    hasApiAccess: boolean;
  };
}

export const plans: Record<PlanId, Plan> = {
  [PlanId.BASIC]: {
    id: PlanId.BASIC,
    name: "Basic",
    price: 500,
    features: {
      maxProjects: 3,
      maxUsers: 2,
      storageGB: 5,
      canCreateTenders: false,
      canAccessBidding: false,
      canCreateInvoices: false,
      hasAdvancedReporting: false,
      hasBudgetThresholdAlerts: false,
      hasApiAccess: false,
    },
  },
  [PlanId.PROFESSIONAL]: {
    id: PlanId.PROFESSIONAL,
    name: "Professional",
    price: 1500,
    features: {
      maxProjects: 15,
      maxUsers: 15,
      storageGB: 50,
      canCreateTenders: true,
      canAccessBidding: true,
      canCreateInvoices: true,
      hasAdvancedReporting: true,
      hasBudgetThresholdAlerts: true,
      hasApiAccess: false,
    },
  },
  [PlanId.ENTERPRISE]: {
    id: PlanId.ENTERPRISE,
    name: "Enterprise",
    price: -1, // Custom pricing
    features: {
      maxProjects: Infinity,
      maxUsers: Infinity,
      storageGB: Infinity,
      canCreateTenders: true,
      canAccessBidding: true,
      canCreateInvoices: true,
      hasAdvancedReporting: true,
      hasBudgetThresholdAlerts: true,
      hasApiAccess: true,
    },
  },
};

export const getPlanById = (planId: PlanId): Plan => {
  return plans[planId];
};