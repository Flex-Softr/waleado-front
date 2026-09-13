"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  Clock,
  CreditCard,
  Gem,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { BILLING_PLANS, isPaidPlan } from "@/config/plans";
import { useAuth } from "@/components/providers/auth-provider";
import { useSubscription } from "@/features/billing/subscription-context";
import type { PaymentGatewayId, PlanId } from "@/types/billing";
import { ApiError, apiJson } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CheckoutResponse =
  | { url: string; gateway?: string }
  | { demo: true; planId: PlanId };

export function BillingClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isExpiredQuery = searchParams.get("expired") === "1";
  const hasAccountPhone = Boolean(user?.phone && user.phone.trim());

  const {
    planId,
    refreshPlan,
    resetToFreeDemo,
    subscriptionStatus,
    currentPeriodEnd,
    paymentGateways,
    hydrated,
    isTrial,
    isTrialExpired,
    daysRemaining,
  } = useSubscription();
  const [loading, setLoading] = React.useState<PlanId | null>(null);
  const [resetting, setResetting] = React.useState(false);
  const [gateway, setGateway] = React.useState<PaymentGatewayId>("sslcommerz");
  const [customerPhone, setCustomerPhone] = React.useState("");

  const showExpiredBanner =
    user?.role !== "ADMIN" && (isTrialExpired || isExpiredQuery);

  const sslReady = paymentGateways.find((g) => g.id === "sslcommerz")?.configured;
  const canCheckoutPaid =
    gateway === "stripe" || (gateway === "sslcommerz" && sslReady);

  React.useEffect(() => {
    const ssl = paymentGateways.find((g) => g.id === "sslcommerz");
    const st = paymentGateways.find((g) => g.id === "stripe");
    if (ssl?.configured) setGateway("sslcommerz");
    else if (st?.configured) setGateway("stripe");
  }, [paymentGateways]);

  async function startUpgrade(target: PlanId) {
    if (!isPaidPlan(target)) return;
    if (gateway === "sslcommerz" && !sslReady) {
      toast.error("SSLCommerz not configured", {
        description:
          "Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD on the API (sandbox for testing).",
      });
      return;
    }

    let effectivePhone = "";
    if (hasAccountPhone) {
      effectivePhone = user!.phone!;
    } else if (customerPhone.trim()) {
      const raw = customerPhone.trim();
      const digits = raw.replace(/\D/g, "");
      if (digits.startsWith("880")) {
        effectivePhone = `+${digits}`;
      } else if (digits.startsWith("0")) {
        effectivePhone = `+880${digits.slice(1)}`;
      } else {
        effectivePhone = `+880${digits}`;
      }
    }

    setLoading(target);
    try {
      const out = await apiJson<CheckoutResponse>("/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: target,
          gateway,
          customerPhone:
            gateway === "sslcommerz" ? (effectivePhone || undefined) : undefined,
        }),
      });
      if ("url" in out && out.url) {
        window.location.href = out.url;
      } else if ("demo" in out && out.demo) {
        await refreshPlan();
        toast.success(`Plan upgraded to ${out.planId.toUpperCase()} (demo mode)`);
      } else {
        toast.error("Checkout failed", {
          description: "No checkout URL returned from server.",
        });
      }
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Checkout initialization failed";
      toast.error("Checkout failed", { description: msg });
    } finally {
      setLoading(null);
    }
  }

  async function onResetFree() {
    setResetting(true);
    try {
      await resetToFreeDemo();
      toast.message("Plan reset", {
        description: "Your workspace is on the Free plan.",
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not reset. Try again.";
      toast.error("Reset failed", { description: msg });
    } finally {
      setResetting(false);
    }
  }

  const periodLabel =
    currentPeriodEnd && !Number.isNaN(Date.parse(currentPeriodEnd))
      ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const anyGatewayReady = paymentGateways.some((g) => g.configured);
  const currentPlanName =
    user?.role === "ADMIN"
      ? "Admin Access"
      : planId === "free"
      ? isTrialExpired
        ? "Trial Expired"
        : "3-Day Trial"
      : planId === "pro"
      ? "Pro"
      : "Business";

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      {user?.role === "ADMIN" ? (
        <div className="flex items-start gap-3.5 rounded-xl border border-purple-500/40 bg-purple-500/10 p-4.5 text-purple-900 dark:border-purple-500/30 dark:bg-purple-500/15 dark:text-purple-200">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-purple-600 dark:text-purple-400" />
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-bold text-foreground dark:text-slate-100">
              Administrator Account — Full Access Active
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              You are signed in with a platform administrator account. All WhatsApp features, device connections, campaigns, and automation tools are fully unlocked without subscription restrictions or trial expiration.
            </p>
          </div>
        </div>
      ) : showExpiredBanner ? (
        <div className="flex items-start gap-3.5 rounded-xl border border-destructive/40 bg-destructive/10 p-4.5 text-destructive dark:border-destructive/50 dark:bg-destructive/15">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-bold text-foreground dark:text-slate-100">
              Your 3-Day Free Trial Has Expired
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Your trial period has concluded. To continue accessing your WhatsApp devices, live chats, automated campaigns, chatbot flows, and responder rules, please select a plan and upgrade below. Each account can only claim the 3-day trial once.
            </p>
          </div>
        </div>
      ) : isTrial ? (
        <div className="flex items-start gap-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4.5 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
          <Clock className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 space-y-1">
            <h4 className="text-sm font-bold text-foreground dark:text-slate-100">
              Free Trial Active — {daysRemaining != null ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining` : "3-day trial"}
            </h4>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              You are currently enjoying full access under your 3-day free trial. Once your trial ends, you will need an active subscription to access your dashboard. Upgrade below anytime to ensure uninterrupted service.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-12">
        <div className="relative min-h-[260px] overflow-hidden rounded-lg bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-600 px-6 py-7 text-white shadow-sm sm:px-8 xl:col-span-7">
          <div className="relative z-10 max-w-xl">
            <Badge className="mb-5 rounded-full border-white/25 bg-white/16 px-3 py-1 text-xs font-semibold text-white shadow-none">
              <Sparkles className="mr-1 size-3.5" />
              Billing control
            </Badge>
            <h2 className="max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Choose the plan that fits your messaging scale
            </h2>
            <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-white/86">
              Upgrade devices, message volume, automation, and support from one
              polished billing workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-lg bg-white/16 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase text-white/65">
                  Current plan
                </p>
                <p className="mt-1 text-xl font-extrabold">{currentPlanName}</p>
              </div>
              <div className="rounded-lg bg-white/16 px-4 py-3 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase text-white/65">
                  Status
                </p>
                <p className="mt-1 text-xl font-extrabold">
                  {isTrialExpired
                    ? "Expired"
                    : isTrial
                    ? `${daysRemaining ?? 3}d left`
                    : subscriptionStatus ?? "Active"}
                </p>
              </div>
              {periodLabel ? (
                <div className="rounded-lg bg-white/16 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase text-white/65">
                    Period end
                  </p>
                  <p className="mt-1 text-xl font-extrabold">{periodLabel}</p>
                </div>
              ) : null}
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-5 right-6 hidden w-[245px] sm:block">
            <div className="relative aspect-square">
              <div className="absolute inset-7 rounded-full border-[28px] border-white/20" />
              <div className="absolute inset-7 rounded-full border-[28px] border-transparent border-t-white/75 border-r-white/75 rotate-45" />
              <div className="absolute inset-20 flex items-center justify-center rounded-full bg-white/20 text-2xl font-extrabold backdrop-blur">
                {planId === "business" ? "100%" : planId === "pro" ? "70%" : "30%"}
              </div>
              <WalletCards className="absolute left-3 top-8 size-16 text-white/22" />
            </div>
          </div>
        </div>

        <Card className="rounded-lg border-0 bg-white shadow-sm dark:bg-slate-900 xl:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-foreground dark:text-slate-50">
              <CreditCard className="size-5 text-foreground" />
              Payment gateway
            </CardTitle>
            <CardDescription>
              Pick a provider before upgrading. SSLCommerz needs a contact
              phone; Stripe can run demo upgrades when keys are absent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
            {paymentGateways.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGateway(g.id)}
                className={cn(
                  "rounded-lg border-0 p-4 text-left shadow-[inset_0_0_0_1px_rgba(110,69,200,0.1)] transition-all",
                  gateway === g.id
                    ? "bg-muted ring-2 ring-ring/30"
                    : "bg-[#faf8ff] hover:bg-muted dark:bg-slate-950 dark:hover:bg-slate-800",
                  !g.configured && "opacity-70"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-foreground dark:text-slate-50">
                    {g.displayName}
                  </span>
                  {g.configured ? (
                    <Badge className="rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 shadow-none dark:bg-emerald-950 dark:text-emerald-300">
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs font-normal">
                      Not configured
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {g.description}
                </p>
              </button>
            ))}
          </div>
          {gateway === "sslcommerz" ? (
            hasAccountPhone ? (
              <div className="space-y-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    Contact phone (SSLCommerz)
                  </span>
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-100/60 text-[10px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                  >
                    From Profile
                  </Badge>
                </div>
                <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {user?.phone}
                </p>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80">
                  SSLCommerz payment receipts will be sent to your account phone.
                </p>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg bg-[#faf8ff] p-4 dark:bg-slate-950">
                <Label htmlFor="cus-phone" className="text-xs font-semibold">
                  Contact phone (SSLCommerz · Bangladesh)
                </Label>
                <div className="flex h-11 w-full items-stretch overflow-hidden rounded-lg border border-input bg-white shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-slate-900">
                  <span className="flex items-center border-r border-input bg-slate-50/80 px-3.5 text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    +880
                  </span>
                  <Input
                    id="cus-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="1712345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-full rounded-none border-0 bg-transparent px-3 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Required by SSLCommerz for receipts (e.g. 017XXXXXXXX).
                </p>
              </div>
            )
          ) : null}
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
              <strong className="font-semibold">Payments:</strong>{" "}
              {anyGatewayReady
                ? "A gateway is configured, so checkout can run below."
                : "Configure SSLCommerz and/or Stripe in the API .env to enable live checkouts."}
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {BILLING_PLANS.map((plan) => {
          const current = plan.id === planId;
          const isPaid = isPaidPlan(plan.id);

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-lg border-0 bg-white shadow-sm dark:bg-slate-900",
                plan.highlight && "overflow-visible",
                plan.highlight
                  ? "ring-2 ring-ring/30"
                  : "ring-1 ring-transparent"
              )}
            >
              {plan.highlight ? (
                <div className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-md">
                  <Sparkles className="size-3.5" />
                  Popular
                </div>
              ) : null}
              <CardHeader className="pb-2 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground dark:bg-slate-800 dark:text-muted-foreground">
                      {plan.id === "free" ? (
                        <ShieldCheck className="size-5" />
                      ) : plan.id === "pro" ? (
                        <Zap className="size-5" />
                      ) : (
                        <Gem className="size-5" />
                      )}
                    </span>
                    <CardTitle className="text-xl font-extrabold text-foreground dark:text-slate-50">
                      {plan.name}
                    </CardTitle>
                  </div>
                  {current ? (
                    <Badge
                      variant={
                        plan.id === "free" && isTrialExpired
                          ? "destructive"
                          : "secondary"
                      }
                      className="shrink-0 rounded-full font-semibold shadow-none"
                    >
                      {plan.id === "free"
                        ? isTrialExpired
                          ? "Trial Expired"
                          : "Trial Active"
                        : "Current"}
                    </Badge>
                  ) : plan.id === "free" ? (
                    user?.role === "ADMIN" ? null : (
                      <Badge variant="outline" className="shrink-0 rounded-full text-xs font-normal">
                        Trial Used
                      </Badge>
                    )
                  ) : null}
                </div>
                <CardDescription className="min-h-10">{plan.description}</CardDescription>
                <div className="pt-3">
                  <span className="text-4xl font-extrabold tracking-tight text-black dark:text-white">
                    {plan.priceLabel}
                  </span>
                  {plan.priceUsd != null && plan.priceUsd > 0 ? (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {" "}
                      / {plan.periodLabel}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {" "}
                      {plan.periodLabel}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3 pb-6">
                <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                        <Check className="size-3.5" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto flex flex-col gap-2 border-t border-border pt-5 dark:border-slate-800">
                {plan.id === "free" ? (
                  <Button type="button" variant="outline" className="h-11 w-full rounded-full" disabled>
                    {user?.role === "ADMIN"
                      ? "Not applicable (Admin)"
                      : isTrialExpired
                      ? "Trial Expired"
                      : current
                      ? "Current Trial"
                      : "Trial Already Used"}
                  </Button>
                ) : current ? (
                  <Button type="button" variant="outline" className="h-11 w-full rounded-full" disabled>
                    Your current plan
                  </Button>
                ) : !isPaid ? (
                  <Button type="button" variant="outline" className="h-11 w-full rounded-full" disabled>
                    Downgrade via support
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className={cn(
                      "h-11 w-full rounded-full font-bold",
                      plan.highlight &&
                        "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    )}
                    disabled={loading !== null || !hydrated || !canCheckoutPaid}
                    onClick={() => startUpgrade(plan.id)}
                  >
                    {loading === plan.id
                      ? "Redirecting…"
                      : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-lg border-0 bg-white shadow-sm dark:bg-slate-900">
        <CardContent className="flex flex-col gap-4 p-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <div className="flex gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground dark:bg-slate-800 dark:text-muted-foreground">
              <RotateCcw className="size-5" />
            </span>
            <div>
              <p className="font-bold text-foreground dark:text-slate-100">
                Cancel paid plan
              </p>
              <p className="mt-1 max-w-2xl">
                Reverts to the expired trial state. Available when no active Stripe subscription is blocking it, and
                when any SSLCommerz-paid period has ended.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 shrink-0 rounded-full"
            disabled={resetting || planId === "free"}
            onClick={() => void onResetFree()}
          >
            {resetting
              ? "Cancelling…"
              : planId === "free"
              ? "No Active Paid Plan"
              : "Cancel Paid Plan"}
          </Button>
        </CardContent>
      </Card>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
        <LockKeyhole className="size-3.5" />
        Secure hosted checkout. Questions?{" "}
        <Link href="/" className="font-medium text-primary hover:underline">
          Contact sales
        </Link>{" "}
        — prices exclude applicable taxes.
      </p>
    </div>
  );
}
