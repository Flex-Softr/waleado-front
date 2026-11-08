"use client";

import * as React from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { licenseFromPlan } from "@/features/billing/lib/license-from-plan";
import { fetchBillingSnapshot } from "@/features/billing/lib/billing-api";
import { apiJson } from "@/lib/api";
import {
  isPlanId,
  type BillingSnapshot,
  type BillingUsage,
  type CountLimitKey,
  type PaymentGatewayMeta,
  type PlanFeatureKey,
  type PlanId,
  type PlanLimits,
  type PlanSource,
} from "@/types/billing";
import type { UserLicense } from "@/types/dashboard";

const ALL_FEATURES_ON: PlanLimits["features"] = {
  ai: true,
  chatbot: true,
  api: true,
  groupGrabber: true,
  callResponder: true,
  bulkScheduling: true,
  removeBranding: true,
};

const UNLIMITED: PlanLimits = {
  devices: null,
  messagesPerDay: null,
  messagesPerMonth: null,
  contacts: null,
  bulkRecipientsPerCampaign: null,
  bulkMessageVariants: 50,
  autoReplyRules: null,
  templates: null,
  chatbotFlows: null,
  features: ALL_FEATURES_ON,
};

const EMPTY_USAGE: BillingUsage = {
  devices: 0,
  contacts: 0,
  templates: 0,
  autoReplyRules: 0,
  chatbotFlows: 0,
  messagesToday: 0,
  messagesThisMonth: 0,
};

type SubscriptionContextValue = {
  planId: PlanId;
  planName: string;
  /** admin | paid | grace | lifetime | trial | free */
  source: PlanSource;
  limits: PlanLimits;
  usage: BillingUsage;
  /** Full snapshot from the API (null until loaded). */
  snapshot: BillingSnapshot | null;
  license: UserLicense;
  /** True after auth + billing snapshot loaded (or skipped when logged out). */
  hydrated: boolean;
  hasFeature: (feature: PlanFeatureKey) => boolean;
  /** Remaining room under a count limit (null = unlimited). */
  remaining: (key: CountLimitKey) => number | null;
  isLifetime: boolean;
  inGrace: boolean;
  stripeConfigured: boolean;
  stripePortalEligible: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  isTrial: boolean;
  /** Always false now: when a trial ends the workspace moves to the Free plan. */
  isTrialExpired: boolean;
  /** Always true now that every workspace has at least the Free plan. */
  hasActiveSubscription: boolean;
  daysRemaining: number | null;
  /** Reload plan from API (after checkout, webhook delay, etc.). */
  refreshPlan: () => Promise<void>;
  /** Optimistic local update; prefer refreshPlan when server is source of truth. */
  setPlan: (plan: PlanId) => void;
  resetToFreeDemo: () => Promise<void>;
  /** Available payment providers (from API). */
  paymentGateways: PaymentGatewayMeta[];
};

const SubscriptionContext = React.createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapping: authBootstrapping, workspace } = useAuth();
  const [snapshot, setSnapshot] = React.useState<BillingSnapshot | null>(null);
  const [planOverride, setPlanOverride] = React.useState<PlanId | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  const isAdmin = user?.role === "ADMIN";

  const refreshPlan = React.useCallback(async () => {
    if (!user) {
      setSnapshot(null);
      return;
    }
    const data = await fetchBillingSnapshot();
    setPlanOverride(null);
    setSnapshot(data);
  }, [user]);

  React.useEffect(() => {
    if (authBootstrapping) return;
    let cancelled = false;
    (async () => {
      if (!user) {
        if (!cancelled) {
          setSnapshot(null);
          setHydrated(true);
        }
        return;
      }
      try {
        const data = await fetchBillingSnapshot();
        if (!cancelled) {
          setPlanOverride(null);
          setSnapshot(data);
        }
      } catch {
        if (!cancelled) setSnapshot(null);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authBootstrapping, user, workspace?.id]);

  const setPlan = React.useCallback((plan: PlanId) => {
    setPlanOverride(plan);
  }, []);

  const resetToFreeDemo = React.useCallback(async () => {
    await apiJson("/v1/billing/reset-to-free", { method: "POST" });
    await refreshPlan();
  }, [refreshPlan]);

  const value = React.useMemo<SubscriptionContextValue>(() => {
    const source: PlanSource = isAdmin ? "admin" : snapshot?.source ?? "free";
    const apiPlan = snapshot && isPlanId(snapshot.planId) ? snapshot.planId : "free";
    const planId: PlanId = isAdmin ? "business" : planOverride ?? apiPlan;
    const limits = isAdmin ? UNLIMITED : snapshot?.limits ?? UNLIMITED;
    const usage = snapshot?.usage ?? EMPTY_USAGE;
    const isTrial = source === "trial";
    const daysRemaining = isAdmin ? null : snapshot?.daysRemaining ?? null;

    const license = licenseFromPlan(planId, {
      planName: isAdmin ? "Admin Access" : snapshot?.planName,
      source,
      daysRemaining,
      isAdmin,
    });

    const usageFor: Partial<Record<CountLimitKey, number>> = {
      devices: usage.devices,
      contacts: usage.contacts,
      templates: usage.templates,
      autoReplyRules: usage.autoReplyRules,
      chatbotFlows: usage.chatbotFlows,
      messagesPerDay: usage.messagesToday,
      messagesPerMonth: usage.messagesThisMonth,
    };

    return {
      planId,
      planName: isAdmin ? "Admin" : snapshot?.planName ?? "Free",
      source,
      limits,
      usage,
      snapshot,
      license,
      hydrated,
      hasFeature: (f) => limits.features[f] === true,
      remaining: (key) => {
        const max = limits[key];
        if (max === null) return null;
        return Math.max(0, max - (usageFor[key] ?? 0));
      },
      isLifetime: Boolean(snapshot?.isLifetime),
      inGrace: Boolean(snapshot?.inGrace),
      stripeConfigured: Boolean(snapshot?.stripeConfigured),
      stripePortalEligible: Boolean(snapshot?.stripePortalEligible),
      subscriptionStatus: isAdmin ? "active" : snapshot?.subscriptionStatus ?? null,
      currentPeriodEnd: snapshot?.currentPeriodEnd ?? null,
      trialEndsAt: isAdmin ? null : snapshot?.trial.endsAt ?? null,
      isTrial,
      isTrialExpired: false,
      hasActiveSubscription: true,
      daysRemaining,
      refreshPlan,
      setPlan,
      resetToFreeDemo,
      paymentGateways: snapshot?.paymentGateways ?? [],
    };
  }, [isAdmin, snapshot, planOverride, hydrated, refreshPlan, setPlan, resetToFreeDemo]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const ctx = React.useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
