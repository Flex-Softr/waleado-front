"use client";

import * as React from "react";
import { Infinity as InfinityIcon, Loader2, Save, Undo2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchAdminBillingConfig,
  fetchAdminBillingStats,
  saveAdminBillingConfig,
  type AdminBillingConfig,
  type AdminBillingSettings,
  type AdminBillingStats,
  type AdminPlan,
} from "@/features/admin/lib/admin-api";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  cycleLabel,
  FEATURE_LABELS,
  formatBdt,
  LIFETIME_MONTHS,
  LIMIT_LABELS,
  type CountLimitKey,
  type PaidPlanId,
  type PlanFeatureKey,
  type PlanId,
  type PlanLimits,
} from "@/types/billing";

/** Billing cycles shown as columns (months; 0 = lifetime). */
const CYCLES = [1, 3, 6, 12, LIFETIME_MONTHS];

type PriceDraft = {
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

type PlanDraft = Omit<AdminPlan, "prices"> & { highlightsText: string };

type Draft = {
  settings: AdminBillingSettings;
  plans: PlanDraft[];
  prices: Record<string, PriceDraft>;
};

const key = (planId: PlanId, months: number) => `${planId}:${months}`;
const num = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

function toDraft(cfg: AdminBillingConfig): Draft {
  const prices: Record<string, PriceDraft> = {};
  for (const p of cfg.plans) {
    if (p.id === "free") continue;
    for (const m of CYCLES) {
      const x = p.prices.find((y) => y.months === m);
      prices[key(p.id, m)] = {
        amountBdt: str(x?.amountBdt),
        compareAtBdt: str(x?.compareAtBdt),
        amountUsd: str(x?.amountUsd),
        label: x?.label ?? "",
        isActive: x?.isActive ?? false,
        saleCap: str(x?.saleCap),
        saleEndsAt: x?.saleEndsAt ? x.saleEndsAt.slice(0, 10) : "",
        exists: Boolean(x),
        sold: x?.sold ?? 0,
      };
    }
  }
  return {
    settings: { ...cfg.settings },
    plans: cfg.plans.map((plan) => {
      const rest: Partial<AdminPlan> = { ...plan };
      delete rest.prices;
      return { ...(rest as Omit<AdminPlan, "prices">), highlightsText: plan.highlights.join("\n") };
    }),
    prices,
  };
}

/** Rounds a price for display: "90" style ends with …90, "10" to nearest 10. */
function roundPrice(n: number, mode: "none" | "10" | "90"): number {
  if (mode === "none") return Math.round(n);
  if (mode === "10") return Math.round(n / 10) * 10;
  return Math.max(90, Math.round((n + 10) / 100) * 100 - 10);
}

export function AdminPricingClient() {
  const [config, setConfig] = React.useState<AdminBillingConfig | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [stats, setStats] = React.useState<AdminBillingStats | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAdminBillingConfig(), fetchAdminBillingStats()])
      .then(([cfg, st]) => {
        if (cancelled) return;
        setConfig(cfg);
        setDraft(toDraft(cfg));
        setStats(st);
      })
      .catch((e) =>
        toast.error("Could not load pricing", { description: e instanceof ApiError ? e.message : undefined })
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = React.useMemo(
    () => (config && draft ? JSON.stringify(toDraft(config)) !== JSON.stringify(draft) : false),
    [config, draft]
  );

  if (!draft || !config) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const paidPlans = draft.plans.filter((p) => p.id !== "free") as (PlanDraft & { id: PaidPlanId })[];

  const setPrice = (planId: PlanId, months: number, patch: Partial<PriceDraft>) =>
    setDraft((d) => d && { ...d, prices: { ...d.prices, [key(planId, months)]: { ...d.prices[key(planId, months)]!, ...patch } } });

  const setPlan = (planId: PlanId, patch: Partial<PlanDraft>) =>
    setDraft((d) => d && { ...d, plans: d.plans.map((p) => (p.id === planId ? { ...p, ...patch } : p)) });

  const setLimit = (planId: PlanId, k: CountLimitKey | "bulkMessageVariants", value: number | null) =>
    setDraft(
      (d) =>
        d && {
          ...d,
          plans: d.plans.map((p) => (p.id === planId ? { ...p, limits: { ...p.limits, [k]: value } as PlanLimits } : p)),
        }
    );

  const setFeature = (planId: PlanId, f: PlanFeatureKey, on: boolean) =>
    setDraft(
      (d) =>
        d && {
          ...d,
          plans: d.plans.map((p) =>
            p.id === planId ? { ...p, limits: { ...p.limits, features: { ...p.limits.features, [f]: on } } } : p
          ),
        }
    );

  async function save() {
    if (!draft) return;
    const prices = [];
    for (const p of paidPlans) {
      for (const m of CYCLES) {
        const x = draft.prices[key(p.id, m)]!;
        const amount = num(x.amountBdt);
        if (amount === null) {
          if (x.exists) prices.push({ planId: p.id, months: m, amountBdt: 0, isActive: false, remove: true });
          continue;
        }
        prices.push({
          planId: p.id,
          months: m,
          amountBdt: amount,
          compareAtBdt: num(x.compareAtBdt),
          amountUsd: num(x.amountUsd),
          label: x.label.trim() || null,
          isActive: x.isActive,
          saleCap: m === LIFETIME_MONTHS ? num(x.saleCap) : null,
          saleEndsAt: x.saleEndsAt ? new Date(`${x.saleEndsAt}T23:59:59`).toISOString() : null,
        });
      }
    }
    setSaving(true);
    try {
      const cfg = await saveAdminBillingConfig({
        settings: draft.settings,
        plans: draft.plans.map((plan) => ({
          planId: plan.id,
          name: plan.name,
          tagline: plan.tagline,
          isPublic: plan.isPublic,
          highlight: plan.highlight,
          sortOrder: plan.sortOrder,
          limits: plan.limits,
          highlights: plan.highlightsText.split("\n").map((line) => line.trim()).filter(Boolean),
        })),
        prices,
      });
      setConfig(cfg);
      setDraft(toDraft(cfg));
      toast.success("Pricing saved", { description: "Changes are live on the pricing pages now." });
    } catch (e) {
      toast.error("Could not save", { description: e instanceof ApiError ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-24">
      {stats ? <StatsRow stats={stats} plans={draft.plans} /> : null}

      <QuickFill
        onApply={(opts) =>
          setDraft((d) => {
            if (!d) return d;
            const prices = { ...d.prices };
            for (const p of paidPlans) {
              const monthly = num(prices[key(p.id, 1)]!.amountBdt);
              if (monthly === null) continue;
              for (const m of [3, 6, 12]) {
                const pct = opts.discounts[m] ?? 0;
                const full = monthly * m;
                prices[key(p.id, m)] = {
                  ...prices[key(p.id, m)]!,
                  amountBdt: String(roundPrice(full * (1 - pct / 100), opts.rounding)),
                  compareAtBdt: pct > 0 ? String(full) : "",
                  label: m === 12 && pct >= 24 ? `${Math.round((pct / 100) * 12)} months free` : pct > 0 ? `Save ${pct}%` : "",
                };
              }
              const yearly = num(prices[key(p.id, 12)]!.amountBdt);
              if (yearly !== null && opts.lifetimeMultiplier > 0) {
                prices[key(p.id, LIFETIME_MONTHS)] = {
                  ...prices[key(p.id, LIFETIME_MONTHS)]!,
                  // Lifetime prices look best as …,900 (৳49,900).
                  amountBdt: String(Math.max(900, Math.round((yearly * opts.lifetimeMultiplier) / 1000) * 1000 - 100)),
                };
              }
            }
            return { ...d, prices };
          })
        }
      />

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Prices (BDT)</CardTitle>
          <CardDescription>
            Tick a cycle to sell it. Leave the price empty to remove a cycle. Strike-through price and badge are optional;
            USD enables Stripe card payment for that price.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="w-32 border-b p-2 text-left text-xs uppercase text-muted-foreground">Plan</th>
                {CYCLES.map((m) => (
                  <th key={m} className="border-b p-2 text-left text-xs uppercase text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {m === LIFETIME_MONTHS ? <InfinityIcon className="size-3.5" /> : null}
                      {cycleLabel(m)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paidPlans.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="border-b p-2 font-semibold">{p.name}</td>
                  {CYCLES.map((m) => (
                    <PriceCell
                      key={m}
                      months={m}
                      monthly={num(draft.prices[key(p.id, 1)]!.amountBdt)}
                      value={draft.prices[key(p.id, m)]!}
                      onChange={(patch) => setPrice(p.id, m, patch)}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        {draft.plans.map((p) => (
          <PlanEditor
            key={p.id}
            plan={p}
            onPlan={(patch) => setPlan(p.id, patch)}
            onLimit={(k, v) => setLimit(p.id, k, v)}
            onFeature={(f, on) => setFeature(p.id, f, on)}
          />
        ))}
      </div>

      <SettingsCard
        settings={draft.settings}
        plans={draft.plans}
        onChange={(patch) => setDraft((d) => d && { ...d, settings: { ...d.settings, ...patch } })}
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur transition-transform",
          dirty ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <p className="text-sm font-medium">You have unsaved pricing changes.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDraft(toDraft(config))} disabled={saving}>
              <Undo2 className="size-4" />
              Discard
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save &amp; publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsRow({ stats, plans }: { stats: AdminBillingStats; plans: PlanDraft[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {plans.map((p) => (
        <Card key={p.id} className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{p.name}</p>
            <p className="mt-1 text-2xl font-extrabold">{stats.workspacesByPlan[p.id] ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              workspaces{stats.lifetimeByPlan[p.id] ? ` · ${stats.lifetimeByPlan[p.id]} lifetime` : ""}
            </p>
          </CardContent>
        </Card>
      ))}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Revenue this month</p>
          <p className="mt-1 text-2xl font-extrabold">{formatBdt(stats.revenueThisMonth)}</p>
          <p className="text-xs text-muted-foreground">{stats.paidInvoicesThisMonth} paid invoices</p>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickFill({
  onApply,
}: {
  onApply: (opts: { discounts: Record<number, number>; lifetimeMultiplier: number; rounding: "none" | "10" | "90" }) => void;
}) {
  const [d3, setD3] = React.useState("10");
  const [d6, setD6] = React.useState("15");
  const [d12, setD12] = React.useState("25");
  const [mult, setMult] = React.useState("2.2");
  const [rounding, setRounding] = React.useState<"none" | "10" | "90">("90");
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="size-5" />
          Quick fill from monthly price
        </CardTitle>
        <CardDescription>
          Set each plan&apos;s monthly price below, then fill the longer cycles with a discount in one click. Review and
          save.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
        {[
          ["3 months off %", d3, setD3],
          ["6 months off %", d6, setD6],
          ["Yearly off %", d12, setD12],
          ["Lifetime = yearly ×", mult, setMult],
        ].map(([label, value, set]) => (
          <div key={label as string} className="space-y-1">
            <Label className="text-xs">{label as string}</Label>
            <Input
              className="w-28"
              inputMode="decimal"
              value={value as string}
              onChange={(e) => (set as (v: string) => void)(e.target.value)}
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label className="text-xs">Rounding</Label>
          <select
            className="h-9 rounded-md border bg-transparent px-2 text-sm"
            value={rounding}
            onChange={(e) => setRounding(e.target.value as "none" | "10" | "90")}
          >
            <option value="90">Ends with 90 (৳2,690)</option>
            <option value="10">Nearest 10</option>
            <option value="none">No rounding</option>
          </select>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            onApply({
              discounts: { 3: Number(d3) || 0, 6: Number(d6) || 0, 12: Number(d12) || 0 },
              lifetimeMultiplier: Number(mult) || 0,
              rounding,
            })
          }
        >
          <Wand2 className="size-4" />
          Fill prices
        </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PriceCell({
  months,
  monthly,
  value,
  onChange,
}: {
  months: number;
  monthly: number | null;
  value: PriceDraft;
  onChange: (patch: Partial<PriceDraft>) => void;
}) {
  const amount = num(value.amountBdt);
  const perMonth = amount !== null && months > 1 ? Math.round(amount / months) : null;
  const saving =
    amount !== null && monthly && months > 1 ? Math.round((1 - amount / (monthly * months)) * 100) : null;
  const isLifetime = months === LIFETIME_MONTHS;
  const capNum = num(value.saleCap);
  return (
    <td className={cn("border-b p-2", !value.isActive && "opacity-60")}>
      <div className="w-[170px] space-y-1.5">
        <label className="flex items-center gap-2 text-xs font-medium">
          <input type="checkbox" checked={value.isActive} onChange={(e) => onChange({ isActive: e.target.checked })} />
          Selling
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
          <Input
            className="pl-6 font-semibold"
            inputMode="decimal"
            placeholder="Price"
            value={value.amountBdt}
            onChange={(e) => onChange({ amountBdt: e.target.value })}
          />
        </div>
        <p className="h-4 text-[11px] text-muted-foreground">
          {perMonth ? `${formatBdt(perMonth)}/mo` : ""}
          {saving !== null && saving > 0 ? ` · ${saving}% off` : ""}
          {isLifetime && monthly && amount ? ` · ${(amount / (monthly * 12)).toFixed(1)}× yearly list` : ""}
        </p>
        <Input
          className="h-8 text-xs"
          inputMode="decimal"
          placeholder="Strike-through ৳"
          value={value.compareAtBdt}
          onChange={(e) => onChange({ compareAtBdt: e.target.value })}
        />
        <Input
          className="h-8 text-xs"
          placeholder="Badge (e.g. Save 25%)"
          value={value.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
        <Input
          className="h-8 text-xs"
          inputMode="decimal"
          placeholder="USD (optional)"
          value={value.amountUsd}
          onChange={(e) => onChange({ amountUsd: e.target.value })}
        />
        {isLifetime ? (
          <>
            <Input
              className="h-8 text-xs"
              inputMode="numeric"
              placeholder="Max sales (empty = no limit)"
              value={value.saleCap}
              onChange={(e) => onChange({ saleCap: e.target.value })}
            />
            <Input
              className="h-8 text-xs"
              type="date"
              title="Stop selling after this date"
              value={value.saleEndsAt}
              onChange={(e) => onChange({ saleEndsAt: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Sold {value.sold}
              {capNum !== null ? ` · ${Math.max(0, capNum - value.sold)} left` : ""}
            </p>
          </>
        ) : null}
      </div>
    </td>
  );
}

const LIMIT_KEYS: CountLimitKey[] = [
  "devices",
  "messagesPerDay",
  "messagesPerMonth",
  "contacts",
  "bulkRecipientsPerCampaign",
  "autoReplyRules",
  "templates",
  "chatbotFlows",
];

const FEATURE_KEYS: PlanFeatureKey[] = [
  "ai",
  "chatbot",
  "api",
  "bulkScheduling",
  "groupGrabber",
  "callResponder",
  "removeBranding",
];

function PlanEditor({
  plan,
  onPlan,
  onLimit,
  onFeature,
}: {
  plan: PlanDraft;
  onPlan: (patch: Partial<PlanDraft>) => void;
  onLimit: (k: CountLimitKey | "bulkMessageVariants", v: number | null) => void;
  onFeature: (f: PlanFeatureKey, on: boolean) => void;
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {plan.name}
          <Badge variant="outline" className="font-mono text-[10px] uppercase">
            {plan.id}
          </Badge>
          {!plan.isPublic ? <Badge variant="secondary">Hidden</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Name</Label>
            <Input value={plan.name} onChange={(e) => onPlan({ name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tagline</Label>
            <Input value={plan.tagline ?? ""} onChange={(e) => onPlan({ tagline: e.target.value })} />
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={plan.isPublic} onChange={(e) => onPlan({ isPublic: e.target.checked })} />
            Show on pricing pages
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={plan.highlight} onChange={(e) => onPlan({ highlight: e.target.checked })} />
            &ldquo;Most popular&rdquo;
          </label>
          <label className="flex items-center gap-2">
            Order
            <Input
              className="h-8 w-16"
              inputMode="numeric"
              value={String(plan.sortOrder)}
              onChange={(e) => onPlan({ sortOrder: Number(e.target.value) || 0 })}
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Limits (empty = unlimited)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LIMIT_KEYS.map((k) => (
              <label key={k} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{LIMIT_LABELS[k]}</span>
                <Input
                  className="h-8 w-28 text-right"
                  inputMode="numeric"
                  placeholder="∞"
                  value={str(plan.limits[k])}
                  onChange={(e) => onLimit(k, num(e.target.value))}
                />
              </label>
            ))}
            <label className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">Message variations / campaign</span>
              <Input
                className="h-8 w-28 text-right"
                inputMode="numeric"
                value={String(plan.limits.bulkMessageVariants)}
                onChange={(e) => onLimit("bulkMessageVariants", Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Features</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {FEATURE_KEYS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={plan.limits.features[f]}
                  onChange={(e) => onFeature(f, e.target.checked)}
                />
                {FEATURE_LABELS[f]}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Bullet points on pricing card (one per line)</Label>
          <Textarea
            rows={5}
            value={plan.highlightsText}
            onChange={(e) => onPlan({ highlightsText: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsCard({
  settings,
  plans,
  onChange,
}: {
  settings: AdminBillingSettings;
  plans: PlanDraft[];
  onChange: (patch: Partial<AdminBillingSettings>) => void;
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle>Trial, grace period &amp; branding</CardTitle>
        <CardDescription>
          New sign-ups get the trial plan for the trial days, then move to Free forever. A lapsed paid plan keeps working
          for the grace days.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <Label className="text-xs">Trial length (days, 0 = no trial)</Label>
          <Input
            inputMode="numeric"
            value={String(settings.trialDays)}
            onChange={(e) => onChange({ trialDays: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Trial plan</Label>
          <select
            className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
            value={settings.trialPlanId}
            onChange={(e) => onChange({ trialPlanId: e.target.value as PlanId })}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grace period (days)</Label>
          <Input
            inputMode="numeric"
            value={String(settings.graceDays)}
            onChange={(e) => onChange({ graceDays: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Free-plan bulk message footer (empty = off)</Label>
          <Input value={settings.brandingFooter} onChange={(e) => onChange({ brandingFooter: e.target.value })} />
        </div>
      </CardContent>
    </Card>
  );
}
