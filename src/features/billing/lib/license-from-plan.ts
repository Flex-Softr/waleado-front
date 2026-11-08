import type { PlanId, PlanSource } from "@/types/billing";
import type { UserLicense } from "@/types/dashboard";

export type LicenseFromPlanOptions = {
  planName?: string;
  source?: PlanSource;
  daysRemaining?: number | null;
  isAdmin?: boolean;
};

const DEFAULT_NAMES: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

/** Maps the current plan to header / banner copy. */
export function licenseFromPlan(planId: PlanId, options?: LicenseFromPlanOptions): UserLicense {
  if (options?.isAdmin) {
    return {
      tier: "enterprise",
      tierLabel: "Admin Access",
      statusLabel: "Active",
      statusVariant: "default",
      isUpgraded: true,
    };
  }

  const name = options?.planName || DEFAULT_NAMES[planId];
  const days = options?.daysRemaining ?? undefined;
  const tier = planId === "business" ? "enterprise" : planId === "free" ? "trial" : "extended";

  switch (options?.source) {
    case "trial":
      return {
        tier: "trial",
        tierLabel: `${name} Trial`,
        statusLabel: days != null ? `${days}d left` : "Trial",
        statusVariant: "secondary",
        daysRemaining: days,
        isUpgraded: false,
      };
    case "lifetime":
      return {
        tier,
        tierLabel: name,
        statusLabel: "Lifetime",
        statusVariant: "outline",
        isUpgraded: true,
      };
    case "grace":
      return {
        tier,
        tierLabel: name,
        statusLabel: "Renew now",
        statusVariant: "destructive",
        daysRemaining: 0,
        isUpgraded: true,
      };
    case "paid":
      return {
        tier,
        tierLabel: name,
        statusLabel: days != null ? `${days}d left` : "Active",
        statusVariant: "outline",
        daysRemaining: days,
        isUpgraded: true,
      };
    default:
      return {
        tier: "trial",
        tierLabel: "Free",
        statusLabel: "Free forever",
        statusVariant: "secondary",
        isUpgraded: false,
      };
  }
}
