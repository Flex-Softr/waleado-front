"use client";

import * as React from "react";
import { Check, Crown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cycleLabel,
  cycleSuffix,
  formatBdt,
  LIFETIME_MONTHS,
  PLAN_IDS,
  type PricingPlan,
  type PricingPrice,
} from "@/types/billing";

/** Position of a plan in the tier order (free < starter < pro < business). */
const rank = (planId: string) => PLAN_IDS.indexOf(planId as (typeof PLAN_IDS)[number]);

function priceFor(plan: PricingPlan, months: number): PricingPrice | undefined {
  return plan.prices.find((p) => p.months === months);
}

export function PlanCard(props: {
  plan: PricingPlan;
  cycle: number;
  focused: boolean;
  currentPlanId: string;
  source: string;
  lifetimePlanId: string | null;
  onChoose: (months: number) => void;
}) {
  const { plan, cycle } = props;
  const isFree = plan.id === "free";
  const price = isFree ? undefined : priceFor(plan, cycle);
  const isCurrent = props.currentPlanId === plan.id && props.source !== "trial";
  const ownsLifetime = props.lifetimePlanId === plan.id;
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (props.focused) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [props.focused]);

  let cta: { label: string; disabled: boolean } = { label: "Choose", disabled: false };
  if (isFree) {
    cta = { label: isCurrent ? "Current plan" : "Always included", disabled: true };
  } else if (!price) {
    cta = { label: `No ${cycleLabel(cycle).toLowerCase()} option`, disabled: true };
  } else if (!price.available) {
    cta = { label: price.remaining === 0 ? "Sold out" : "Offer ended", disabled: true };
  } else if (ownsLifetime && cycle === LIFETIME_MONTHS) {
    cta = { label: "Owned for life", disabled: true };
  } else if (ownsLifetime) {
    cta = { label: "Included in your lifetime plan", disabled: true };
  } else if (
    (props.source === "paid" || props.source === "grace") &&
    cycle !== LIFETIME_MONTHS &&
    rank(plan.id) < rank(props.currentPlanId)
  ) {
    cta = { label: "After your current plan ends", disabled: true };
  } else if (
    props.lifetimePlanId &&
    rank(plan.id) <= rank(props.lifetimePlanId)
  ) {
    cta = { label: "Included in your lifetime plan", disabled: true };
  } else if (isCurrent && cycle !== LIFETIME_MONTHS && (props.source === "paid" || props.source === "grace")) {
    cta = { label: "Renew / extend", disabled: false };
  } else if (cycle === LIFETIME_MONTHS) {
    cta = { label: "Get lifetime access", disabled: false };
  } else {
    cta = { label: `Choose ${plan.name}`, disabled: false };
  }

  const strike = price?.compareAtBdt && price.compareAtBdt > price.amountBdt ? price.compareAtBdt : null;

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all",
        plan.highlight && "border-emerald-500/60 ring-1 ring-emerald-500/40",
        props.focused && "ring-2 ring-amber-500",
        isCurrent && "bg-emerald-50/40 dark:bg-emerald-950/20"
      )}
    >
      {plan.highlight ? (
        <span className="absolute -top-3 left-5 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
          Most popular
        </span>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-lg font-bold">{plan.name}</h4>
          {plan.tagline ? <p className="text-sm text-muted-foreground">{plan.tagline}</p> : null}
        </div>
        {isCurrent || ownsLifetime ? (
          <Badge className="rounded-full bg-emerald-600 text-white">
            {ownsLifetime ? <Crown className="size-3" /> : <Check className="size-3" />}
            {ownsLifetime ? "Lifetime" : "Current"}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 min-h-[76px]">
        {isFree ? (
          <>
            <p className="text-3xl font-extrabold">৳0</p>
            <p className="text-sm text-muted-foreground">Free forever</p>
          </>
        ) : price ? (
          <>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold">{formatBdt(price.amountBdt)}</p>
              {strike ? (
                <p className="text-sm text-muted-foreground line-through">{formatBdt(strike)}</p>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {cycleSuffix(price.months)}
              {price.perMonthBdt && price.months > 1 ? ` · ${formatBdt(price.perMonthBdt)}/month` : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {price.label ? (
                <Badge variant="outline" className="border-emerald-500/50 text-emerald-700 dark:text-emerald-400">
                  {price.label}
                </Badge>
              ) : null}
              {price.isLifetime && price.remaining !== null && price.available ? (
                <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                  Only {price.remaining} left
                </Badge>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Not offered for this billing cycle.</p>
        )}
      </div>

      <ul className="mt-4 flex-1 space-y-2 text-sm">
        {plan.highlights.map((h) => (
          <li key={h} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <Button
        className="mt-5 w-full"
        variant={plan.highlight && !cta.disabled ? "default" : "outline"}
        disabled={cta.disabled}
        onClick={() => price && props.onChoose(price.months)}
      >
        {cta.label}
      </Button>
    </div>
  );
}
