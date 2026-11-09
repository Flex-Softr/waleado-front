import type {
  AdminBillingConfig,
  AdminBillingSettings,
  AdminPlan,
  AdminPlanUpdate,
  AdminPriceUpdate,
} from "@/features/admin/lib/admin-billing-api";
import { BILLING_CYCLES, LIFETIME_MONTHS, type PaidPlanId, type PlanId } from "@/types/billing";

/**
 * Editable copy of the pricing config. Inputs are kept as strings so admins can type freely;
 * they are parsed only when saving.
 */


export type PriceDraft = {
  amountBdt: string;
  compareAtBdt: string;
  amountUsd: string;
  label: string;
  isActive: boolean;
  saleCap: string;
  saleEndsAt: string;
  /** Row exists in the database. */
  exists: boolean;
  sold: number;
};

export type PlanDraft = Omit<AdminPlan, "prices"> & { highlightsText: string };
export type PaidPlanDraft = PlanDraft & { id: PaidPlanId };

export type PricingDraft = {
  settings: AdminBillingSettings;
  plans: PlanDraft[];
  prices: Record<string, PriceDraft>;
};

export type Rounding = "none" | "10" | "90";

export type QuickFillOptions = {
  /** Discount percent per cycle length (3, 6, 12 months). */
  discounts: Record<number, number>;
  lifetimeMultiplier: number;
  rounding: Rounding;
};

export const priceKey = (planId: PlanId, months: number) =>
  `${planId}:${months}`;

/** "" → null; otherwise the number, or null when it isn't one. */
export function parseNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const numberText = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : String(n);

export function paidPlansOf(draft: PricingDraft): PaidPlanDraft[] {
  return draft.plans.filter((p): p is PaidPlanDraft => p.id !== "free");
}

export function toDraft(cfg: AdminBillingConfig): PricingDraft {
  const prices: Record<string, PriceDraft> = {};
  for (const p of cfg.plans) {
    if (p.id === "free") continue;
    for (const m of BILLING_CYCLES) {
      const x = p.prices.find((y) => y.months === m);
      prices[priceKey(p.id, m)] = {
        amountBdt: numberText(x?.amountBdt),
        compareAtBdt: numberText(x?.compareAtBdt),
        amountUsd: numberText(x?.amountUsd),
        label: x?.label ?? "",
        isActive: x?.isActive ?? false,
        saleCap: numberText(x?.saleCap),
        saleEndsAt: x?.saleEndsAt ? x.saleEndsAt.slice(0, 10) : "",
        exists: Boolean(x),
        sold: x?.sold ?? 0,
      };
    }
  }
  return {
    settings: { ...cfg.settings },
    plans: cfg.plans.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      isPublic: p.isPublic,
      highlight: p.highlight,
      sortOrder: p.sortOrder,
      limits: p.limits,
      highlights: p.highlights,
      highlightsText: p.highlights.join("\n"),
    })),
    prices,
  };
}

/** Rounds a price for display: "90" ends with …90, "10" rounds to the nearest 10. */
function roundPrice(n: number, mode: Rounding): number {
  if (mode === "none") return Math.round(n);
  if (mode === "10") return Math.round(n / 10) * 10;
  return Math.max(90, Math.round((n + 10) / 100) * 100 - 10);
}

/** Fills the 3/6/12-month and lifetime prices of every plan from its monthly price. */
export function applyQuickFill(
  draft: PricingDraft,
  opts: QuickFillOptions,
): PricingDraft {
  const prices = { ...draft.prices };
  for (const p of paidPlansOf(draft)) {
    const monthly = parseNumber(prices[priceKey(p.id, 1)]!.amountBdt);
    if (monthly === null) continue;
    for (const m of [3, 6, 12]) {
      const pct = opts.discounts[m] ?? 0;
      const full = monthly * m;
      prices[priceKey(p.id, m)] = {
        ...prices[priceKey(p.id, m)]!,
        amountBdt: String(roundPrice(full * (1 - pct / 100), opts.rounding)),
        compareAtBdt: pct > 0 ? String(full) : "",
        label:
          m === 12 && pct >= 24
            ? `${Math.round((pct / 100) * 12)} months free`
            : pct > 0
              ? `Save ${pct}%`
              : "",
      };
    }
    const yearly = parseNumber(prices[priceKey(p.id, 12)]!.amountBdt);
    if (yearly !== null && opts.lifetimeMultiplier > 0) {
      prices[priceKey(p.id, LIFETIME_MONTHS)] = {
        ...prices[priceKey(p.id, LIFETIME_MONTHS)]!,
        // Lifetime prices look best as …,900 (৳49,900).
        amountBdt: String(
          Math.max(
            900,
            Math.round((yearly * opts.lifetimeMultiplier) / 1000) * 1000 - 100,
          ),
        ),
      };
    }
  }
  return { ...draft, prices };
}

/** Price rows to send: filled cells are upserted, emptied cells that existed are removed. */
export function priceUpdatesOf(draft: PricingDraft): AdminPriceUpdate[] {
  const updates: AdminPriceUpdate[] = [];
  for (const p of paidPlansOf(draft)) {
    for (const m of BILLING_CYCLES) {
      const x = draft.prices[priceKey(p.id, m)]!;
      const amount = parseNumber(x.amountBdt);
      if (amount === null) {
        if (x.exists)
          updates.push({
            planId: p.id,
            months: m,
            amountBdt: 0,
            isActive: false,
            remove: true,
          });
        continue;
      }
      updates.push({
        planId: p.id,
        months: m,
        amountBdt: amount,
        compareAtBdt: parseNumber(x.compareAtBdt),
        amountUsd: parseNumber(x.amountUsd),
        label: x.label.trim() || null,
        isActive: x.isActive,
        saleCap: m === LIFETIME_MONTHS ? parseNumber(x.saleCap) : null,
        saleEndsAt: x.saleEndsAt
          ? new Date(`${x.saleEndsAt}T23:59:59`).toISOString()
          : null,
      });
    }
  }
  return updates;
}

export function planUpdatesOf(draft: PricingDraft): AdminPlanUpdate[] {
  return draft.plans.map((plan) => ({
    planId: plan.id,
    name: plan.name,
    tagline: plan.tagline,
    isPublic: plan.isPublic,
    highlight: plan.highlight,
    sortOrder: plan.sortOrder,
    limits: plan.limits,
    highlights: plan.highlightsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  }));
}
