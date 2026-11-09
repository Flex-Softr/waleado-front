"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Clock,
  Infinity as InfinityIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { useSubscription } from "@/features/billing/subscription-context";
import { fetchInvoices, fetchPricing, fetchWallet } from "@/features/billing/lib/billing-api";
import { WalletCard } from "@/features/billing/components/wallet-card";
import { InvoicesCard } from "@/features/billing/components/invoices-card";
import { PlanCard } from "@/features/billing/components/plan-card";
import { CheckoutDialog } from "@/features/billing/components/checkout-dialog";
import { UsagePanel } from "@/features/billing/components/usage-panel";
import { ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  cycleLabel,
  isPaidPlanId,
  LIFETIME_MONTHS,
  type BillingInvoice,
  type PaidPlanId,
  type PricingResponse,
  type WalletSnapshot,
} from "@/types/billing";

function formatDate(iso: string | null | undefined): string | null {
  if (!iso || Number.isNaN(Date.parse(iso))) return null;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Cycles offered by at least one paid plan, ordered monthly → lifetime. */
function availableCycles(pricing: PricingResponse | null): number[] {
  if (!pricing) return [];
  const set = new Set<number>();
  for (const p of pricing.plans) for (const x of p.prices) set.add(x.months);
  return [...set].sort((a, b) =>
    a === LIFETIME_MONTHS ? 1 : b === LIFETIME_MONTHS ? -1 : a - b
  );
}

/** Best "save X%" across plans for a cycle, from compare-at prices. */
function bestSaving(pricing: PricingResponse | null, months: number): number | null {
  if (!pricing || months === LIFETIME_MONTHS || months === 1) return null;
  let best = 0;
  for (const p of pricing.plans) {
    const x = p.prices.find((y) => y.months === months);
    if (x?.compareAtBdt && x.compareAtBdt > x.amountBdt) {
      best = Math.max(best, Math.round((1 - x.amountBdt / x.compareAtBdt) * 100));
    }
  }
  return best > 0 ? best : null;
}

const SOURCE_LABEL: Record<string, string> = {
  admin: "Admin",
  paid: "Active",
  grace: "Renewal due",
  lifetime: "Lifetime",
  trial: "Trial",
  free: "Free forever",
};

type BillingPageData = [
  PricingResponse,
  Awaited<ReturnType<typeof fetchInvoices>>,
  WalletSnapshot,
];

function loadBillingPageData(): Promise<BillingPageData> {
  return Promise.all([fetchPricing(), fetchInvoices(), fetchWallet()]);
}

function showLoadError(e: unknown) {
  toast.error("Could not load billing", { description: e instanceof ApiError ? e.message : undefined });
}

export function BillingClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const sub = useSubscription();
  const { planId, source, snapshot, refreshPlan, hydrated } = sub;
  const isAdmin = user?.role === "ADMIN";

  const [pricing, setPricing] = React.useState<PricingResponse | null>(null);
  const [invoices, setInvoices] = React.useState<BillingInvoice[]>([]);
  const [wallet, setWallet] = React.useState<WalletSnapshot | null>(null);
  const [cycle, setCycle] = React.useState<number | null>(null);
  const [target, setTarget] = React.useState<{ planId: PaidPlanId; months: number } | null>(null);
  const focusPlan = searchParams.get("plan");
  const focusMonths = searchParams.get("months");
  const couponParam = searchParams.get("coupon");
  const autoOpened = React.useRef(false);

  const applyData = React.useCallback(([p, inv, w]: BillingPageData) => {
    setPricing(p);
    setInvoices(inv.invoices);
    setWallet(w);
  }, []);

  const load = React.useCallback(
    () => loadBillingPageData().then(applyData).catch(showLoadError),
    [applyData]
  );

  React.useEffect(() => {
    let cancelled = false;
    loadBillingPageData()
      .then((data) => !cancelled && applyData(data))
      .catch((e) => !cancelled && showLoadError(e));
    return () => {
      cancelled = true;
    };
  }, [applyData]);

  // Coming from the landing page with a chosen plan + cycle: open its checkout once.
  React.useEffect(() => {
    if (autoOpened.current || !pricing || !focusPlan || focusMonths === null) return;
    if (!isPaidPlanId(focusPlan) || !/^\d+$/.test(focusMonths)) return;
    const months = Number(focusMonths);
    const plan = pricing.plans.find((p) => p.id === focusPlan);
    if (!plan?.prices.some((x) => x.months === months && x.available)) return;
    autoOpened.current = true;
    const t = setTimeout(() => setTarget({ planId: focusPlan, months }), 0);
    return () => clearTimeout(t);
  }, [pricing, focusPlan, focusMonths]);

  const cycles = availableCycles(pricing);
  // Default to yearly when offered (best value), otherwise the first cycle.
  const requestedCycle =
    focusMonths !== null && cycles.includes(Number(focusMonths)) ? Number(focusMonths) : null;
  const activeCycle = cycle ?? requestedCycle ?? (cycles.includes(12) ? 12 : cycles[0] ?? 1);

  // Payment return messages from the gateway redirect.
  React.useEffect(() => {
    const payment = searchParams.get("payment");
    const canceled = searchParams.get("canceled");
    if (!payment && !canceled) return;
    if (payment === "cancelled" || payment === "canceled" || canceled === "1") {
      toast.info("Payment cancelled", { description: "No charges were made." });
    } else if (payment === "failed" || payment === "expired") {
      toast.error("Payment was not completed", {
        description: "You can try again or choose another method.",
      });
    } else if (payment === "confirm_failed" || payment === "invalid" || payment === "unknown") {
      toast.error("We couldn't verify the payment", {
        description: "If money was deducted, contact support with your invoice number.",
      });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("payment");
    url.searchParams.delete("canceled");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [searchParams]);

  async function onActivated() {
    await Promise.all([refreshPlan(), load()]);
  }

  const periodEnd = formatDate(snapshot?.currentPeriodEnd);
  const trialEnd = formatDate(snapshot?.trial.endsAt);
  const graceEnd = formatDate(snapshot?.graceEndsAt);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <StatusBanner
        isAdmin={isAdmin}
        source={source}
        planName={sub.planName}
        trialDays={snapshot?.trial.daysRemaining ?? null}
        trialEnd={trialEnd}
        periodEnd={periodEnd}
        graceEnd={graceEnd}
        lifetimePlanName={snapshot?.lifetimePlanName ?? null}
      />

      <section className="grid gap-5 xl:grid-cols-12">
        <div className="relative overflow-hidden rounded-xl border border-emerald-900/30 bg-gradient-to-br from-slate-900 via-[#0b1c2d] to-[#043324] px-6 py-7 text-white shadow-md sm:px-8 xl:col-span-5">
          <Badge className="mb-4 rounded-full border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white shadow-none">
            <Sparkles className="mr-1 size-3.5" />
            Your plan
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {hydrated ? (isAdmin ? "Admin Access" : sub.planName) : "…"}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <HeroStat label="Status" value={SOURCE_LABEL[source] ?? source} />
            {source === "trial" && trialEnd ? <HeroStat label="Trial ends" value={trialEnd} /> : null}
            {(source === "paid" || source === "grace") && periodEnd ? (
              <HeroStat label={source === "grace" ? "Ended on" : "Renews / ends"} value={periodEnd} />
            ) : null}
            {snapshot?.lifetimePlanName ? (
              <HeroStat label="Owned for life" value={snapshot.lifetimePlanName} />
            ) : null}
          </div>
          <p className="mt-5 max-w-md text-sm text-white/75">
            Pay with bKash, Nagad, Rocket or card. Renew early and the new period starts when the
            current one ends — you never lose days.
          </p>
        </div>
        <div className="xl:col-span-7">
          <UsagePanel />
        </div>
      </section>

      {!isAdmin && pricing ? (
        <section className="space-y-5">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Choose a plan</h3>
              <p className="text-sm text-muted-foreground">
                Start free forever. Upgrade when you need more devices, messages and automation.
              </p>
            </div>
            {cycles.length > 1 ? (
              <div className="inline-flex flex-wrap rounded-lg border bg-muted/60 p-1">
                {cycles.map((m) => {
                  const save = bestSaving(pricing, m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setCycle(m)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all",
                        activeCycle === m
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {m === LIFETIME_MONTHS ? <InfinityIcon className="size-4" /> : null}
                      {cycleLabel(m)}
                      {save ? (
                        <span className="rounded-full bg-emerald-500/15 px-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          -{save}%
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pricing.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={activeCycle}
                focused={focusPlan === plan.id}
                currentPlanId={planId}
                source={source}
                lifetimePlanId={snapshot?.lifetimePlanId ?? null}
                onChoose={(months) =>
                  isPaidPlanId(plan.id) && setTarget({ planId: plan.id, months })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isAdmin ? (
        <section className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <InvoicesCard invoices={invoices} />
          </div>
          <div className="xl:col-span-4">
            {wallet ? (
              <WalletCard
                wallet={wallet}
                canAutoRenew={source === "paid" && (snapshot?.billingMonths ?? 0) > 0}
                onChanged={load}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <CheckoutDialog
        target={target}
        initialCoupon={couponParam}
        onClose={() => setTarget(null)}
        onActivated={onActivated}
      />
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/15 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase text-white/65">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
    </div>
  );
}

function StatusBanner(props: {
  isAdmin: boolean;
  source: string;
  planName: string;
  trialDays: number | null;
  trialEnd: string | null;
  periodEnd: string | null;
  graceEnd: string | null;
  lifetimePlanName: string | null;
}) {
  const box = "flex items-start gap-3.5 rounded-xl border p-4";
  if (props.isAdmin) {
    return (
      <div className={cn(box, "border-purple-500/40 bg-purple-500/10")}>
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-purple-600 dark:text-purple-400" />
        <div>
          <h4 className="text-sm font-bold">Administrator account — full access</h4>
          <p className="text-sm text-muted-foreground">
            Manage packages and prices from Admin → Pricing.
          </p>
        </div>
      </div>
    );
  }
  if (props.source === "trial") {
    return (
      <div className={cn(box, "border-amber-500/40 bg-amber-500/10")}>
        <Clock className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <h4 className="text-sm font-bold">
            {props.planName} trial — {props.trialDays ?? 0} day{props.trialDays === 1 ? "" : "s"} left
          </h4>
          <p className="text-sm text-muted-foreground">
            Enjoy every {props.planName} feature until {props.trialEnd ?? "the trial ends"}. After that you
            stay on the Free plan forever — nothing is deleted. Upgrade any time to keep the extra features.
          </p>
        </div>
      </div>
    );
  }
  if (props.source === "grace") {
    return (
      <div className={cn(box, "border-destructive/40 bg-destructive/10")}>
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <h4 className="text-sm font-bold">Your {props.planName} plan ended on {props.periodEnd}</h4>
          <p className="text-sm text-muted-foreground">
            It keeps working until {props.graceEnd}. Renew now to avoid moving to{" "}
            {props.lifetimePlanName ?? "the Free plan"}.
          </p>
        </div>
      </div>
    );
  }
  if (props.source === "free") {
    return (
      <div className={cn(box, "border-emerald-500/40 bg-emerald-500/10")}>
        <Sparkles className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <h4 className="text-sm font-bold">You&apos;re on the Free plan — free forever</h4>
          <p className="text-sm text-muted-foreground">
            Upgrade when you need more devices, more messages, AI or chatbots.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function BillingLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
