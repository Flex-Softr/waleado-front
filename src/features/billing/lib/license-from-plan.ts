import type { PlanId } from "@/types/billing";
import type { UserLicense } from "@/types/dashboard";

export type LicenseFromPlanOptions = {
  subscriptionStatus?: string | null;
  isTrial?: boolean;
  isTrialExpired?: boolean;
  daysRemaining?: number | null;
  isAdmin?: boolean;
};

/** Maps subscription plan and trial state to header / UI license copy */
export function licenseFromPlan(
  planId: PlanId,
  options?: LicenseFromPlanOptions
): UserLicense {
  if (options?.isAdmin) {
    return {
      tier: "enterprise",
      tierLabel: "Admin Access",
      statusLabel: "Active",
      statusVariant: "default",
      isUpgraded: true,
    };
  }

  if (planId === "pro") {
    return {
      tier: "extended",
      tierLabel: "Pro",
      statusLabel: "Active",
      statusVariant: "outline",
      daysRemaining: options?.daysRemaining ?? undefined,
      isUpgraded: true,
    };
  }

  if (planId === "business") {
    return {
      tier: "enterprise",
      tierLabel: "Business",
      statusLabel: "Active",
      statusVariant: "outline",
      daysRemaining: options?.daysRemaining ?? undefined,
      isUpgraded: true,
    };
  }

  // Free plan / 3-day trial
  if (options?.isTrialExpired) {
    return {
      tier: "trial",
      tierLabel: "Trial Expired",
      statusLabel: "Payment Required",
      statusVariant: "destructive",
      daysRemaining: 0,
      isUpgraded: false,
    };
  }

  const days = options?.daysRemaining != null ? options.daysRemaining : 3;
  return {
    tier: "trial",
    tierLabel: "3-Day Trial",
    statusLabel: `${days}d left`,
    statusVariant: "secondary",
    daysRemaining: days,
    isUpgraded: false,
  };
}
