"use client";

import * as React from "react";
import { Infinity as InfinityIcon, Loader2, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchAdminBillingConfig,
  fetchAdminBillingReport,
  saveAdminBillingConfig,
  type AdminBillingConfig,
  type AdminBillingReport,
} from "@/features/admin/lib/admin-billing-api";
import { BillingSettingsCards } from "@/features/admin/pricing/billing-settings-card";
import { PlanCountsRow } from "@/features/admin/pricing/plan-counts-row";
import { PlanEditorCard } from "@/features/admin/pricing/plan-editor-card";
import { PriceCell } from "@/features/admin/pricing/price-cell";
import {
  applyQuickFill,
  paidPlansOf,
  parseNumber,
  planUpdatesOf,
  priceKey,
  priceUpdatesOf,
  toDraft,
  type PlanDraft,
  type PriceDraft,
  type PricingDraft,
} from "@/features/admin/pricing/pricing-draft";
import { QuickFillCard } from "@/features/admin/pricing/quick-fill-card";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  BILLING_CYCLES,
  cycleLabel,
  LIFETIME_MONTHS,
  type PlanId,
  type PlanLimits,
} from "@/types/billing";

export function AdminPricingClient() {
  const [config, setConfig] = React.useState<AdminBillingConfig | null>(null);
  const [draft, setDraft] = React.useState<PricingDraft | null>(null);
  const [report, setReport] = React.useState<AdminBillingReport | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchAdminBillingConfig()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        setDraft(toDraft(cfg));
      })
      .catch((e) =>
        toast.error("Could not load pricing", {
          description: e instanceof ApiError ? e.message : undefined,
        }),
      );
    // The plan counts are nice-to-have context; the editor works without them.
    fetchAdminBillingReport()
      .then((r) => !cancelled && setReport(r))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = React.useMemo(
    () =>
      config && draft
        ? JSON.stringify(toDraft(config)) !== JSON.stringify(draft)
        : false,
    [config, draft],
  );

  if (!draft || !config) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const paidPlans = paidPlansOf(draft);
  const update = (fn: (d: PricingDraft) => PricingDraft) =>
    setDraft((d) => d && fn(d));

  const setPrice = (
    planId: PlanId,
    months: number,
    patch: Partial<PriceDraft>,
  ) =>
    update((d) => {
      const k = priceKey(planId, months);
      return {
        ...d,
        prices: { ...d.prices, [k]: { ...d.prices[k]!, ...patch } },
      };
    });

  const setPlan = (
    planId: PlanId,
    patch: (p: PlanDraft) => Partial<PlanDraft>,
  ) =>
    update((d) => ({
      ...d,
      plans: d.plans.map((p) => (p.id === planId ? { ...p, ...patch(p) } : p)),
    }));

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const cfg = await saveAdminBillingConfig({
        settings: draft.settings,
        plans: planUpdatesOf(draft),
        prices: priceUpdatesOf(draft),
      });
      setConfig(cfg);
      setDraft(toDraft(cfg));
      toast.success("Pricing saved", {
        description: "Changes are live on the pricing pages now.",
      });
    } catch (e) {
      toast.error("Could not save", {
        description: e instanceof ApiError ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-24">
      {report ? <PlanCountsRow report={report} plans={draft.plans} /> : null}

      <QuickFillCard
        onApply={(opts) => update((d) => applyQuickFill(d, opts))}
      />

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Prices (BDT)</CardTitle>
          <CardDescription>
            Tick a cycle to sell it. Leave the price empty to remove a cycle.
            Strike-through price and badge are optional; USD enables Stripe card
            payment for that price.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="w-32 border-b p-2 text-left text-xs uppercase text-muted-foreground">
                  Plan
                </th>
                {BILLING_CYCLES.map((m) => (
                  <th
                    key={m}
                    className="border-b p-2 text-left text-xs uppercase text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-1">
                      {m === LIFETIME_MONTHS ? (
                        <InfinityIcon className="size-3.5" />
                      ) : null}
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
                  {BILLING_CYCLES.map((m) => (
                    <PriceCell
                      key={m}
                      months={m}
                      monthly={parseNumber(
                        draft.prices[priceKey(p.id, 1)]!.amountBdt,
                      )}
                      value={draft.prices[priceKey(p.id, m)]!}
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
          <PlanEditorCard
            key={p.id}
            plan={p}
            onPlan={(patch) => setPlan(p.id, () => patch)}
            onLimit={(k, v) =>
              setPlan(p.id, (cur) => ({
                limits: { ...cur.limits, [k]: v } as PlanLimits,
              }))
            }
            onFeature={(f, on) =>
              setPlan(p.id, (cur) => ({
                limits: {
                  ...cur.limits,
                  features: { ...cur.limits.features, [f]: on },
                },
              }))
            }
          />
        ))}
      </div>

      <BillingSettingsCards
        settings={draft.settings}
        plans={draft.plans}
        onChange={(patch) =>
          update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
        }
      />

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur transition-transform",
          dirty ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3">
          <p className="text-sm font-medium">
            You have unsaved pricing changes.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDraft(toDraft(config))}
              disabled={saving}
            >
              <Undo2 className="size-4" />
              Discard
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save &amp; publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
