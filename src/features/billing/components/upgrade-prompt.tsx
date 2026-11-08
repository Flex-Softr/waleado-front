"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscription } from "@/features/billing/subscription-context";
import { PLAN_UPGRADE_EVENT, type PlanUpgradeEventDetail } from "@/lib/api";
import { isPlanId, type PlanId } from "@/types/billing";

const PLAN_NAMES: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

/**
 * Listens for plan-limit errors from any API action and offers an upgrade.
 * Mounted once inside the dashboard shell.
 */
export function UpgradePromptListener() {
  const { refreshPlan } = useSubscription();
  const [detail, setDetail] = React.useState<PlanUpgradeEventDetail | null>(null);

  React.useEffect(() => {
    const onEvent = (e: Event) => {
      const d = (e as CustomEvent<PlanUpgradeEventDetail>).detail;
      if (!d) return;
      setDetail(d);
      // Usage numbers likely changed; keep the plan snapshot fresh.
      void refreshPlan().catch(() => {});
    };
    window.addEventListener(PLAN_UPGRADE_EVENT, onEvent);
    return () => window.removeEventListener(PLAN_UPGRADE_EVENT, onEvent);
  }, [refreshPlan]);

  const required = detail?.details?.requiredPlan;
  const requiredPlan = typeof required === "string" && isPlanId(required) ? required : null;
  const locked = detail?.code === "PLAN_FEATURE_LOCKED";

  return (
    <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            {locked ? <Lock className="size-5" /> : <Sparkles className="size-5" />}
          </div>
          <DialogTitle>{locked ? "Upgrade to unlock this" : "You've reached your plan limit"}</DialogTitle>
          <DialogDescription>{detail?.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDetail(null)}>
            Not now
          </Button>
          <Button
            render={
              <Link
                href={requiredPlan ? `/billing?plan=${requiredPlan}` : "/billing"}
                onClick={() => setDetail(null)}
              />
            }
          >
            {requiredPlan ? `See ${PLAN_NAMES[requiredPlan]} plan` : "See plans"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Wraps a page that needs a plan feature. Shows an upgrade card instead of the page
 * when the current plan does not include it.
 */
export function FeatureGate({
  feature,
  title,
  description,
  children,
}: {
  feature: Parameters<ReturnType<typeof useSubscription>["hasFeature"]>[0];
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { hasFeature, hydrated, planName } = useSubscription();
  if (!hydrated || hasFeature(feature)) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
        <Lock className="size-6" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description} It is not included in your {planName} plan.
      </p>
      <Button render={<Link href="/billing" />}>
        <Sparkles className="size-4" />
        See plans
      </Button>
    </div>
  );
}
