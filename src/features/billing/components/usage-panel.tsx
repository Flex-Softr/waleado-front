"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/features/billing/subscription-context";
import { cn } from "@/lib/utils";
import { FEATURE_LABELS, type PlanFeatureKey } from "@/types/billing";
import { Check, Gauge, X } from "lucide-react";

function UsageRow({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max === null ? 0 : max === 0 ? 100 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {used.toLocaleString("en-US")} / {max === null ? "Unlimited" : max.toLocaleString("en-US")}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            max === null ? "w-0" : pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: max === null ? undefined : `${pct}%` }}
        />
      </div>
    </div>
  );
}

const FEATURE_ORDER: PlanFeatureKey[] = [
  "ai",
  "chatbot",
  "api",
  "bulkScheduling",
  "groupGrabber",
  "callResponder",
  "removeBranding",
];

/** Current usage against the plan's limits, plus which features are on. */
export function UsagePanel() {
  const { limits, usage, hydrated } = useSubscription();
  if (!hydrated) return null;

  return (
    <Card className="h-full rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="size-5" />
          Usage this period
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {limits.messagesPerDay !== null ? (
            <UsageRow label="Messages today" used={usage.messagesToday} max={limits.messagesPerDay} />
          ) : null}
          {limits.messagesPerMonth !== null || limits.messagesPerDay === null ? (
            <UsageRow label="Messages this month" used={usage.messagesThisMonth} max={limits.messagesPerMonth} />
          ) : null}
          <UsageRow label="WhatsApp devices" used={usage.devices} max={limits.devices} />
          <UsageRow label="Contacts" used={usage.contacts} max={limits.contacts} />
          <UsageRow label="Templates" used={usage.templates} max={limits.templates} />
          <UsageRow label="Auto-reply rules" used={usage.autoReplyRules} max={limits.autoReplyRules} />
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Included features</p>
          <ul className="space-y-2 text-sm">
            {FEATURE_ORDER.map((f) => {
              const on = limits.features[f];
              return (
                <li key={f} className={cn("flex items-center gap-2", !on && "text-muted-foreground")}>
                  {on ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <X className="size-4 text-muted-foreground/60" />
                  )}
                  {FEATURE_LABELS[f]}
                </li>
              );
            })}
            <li className="flex items-center gap-2">
              <Check className="size-4 text-emerald-600" />
              {limits.bulkRecipientsPerCampaign === null
                ? "Unlimited recipients per campaign"
                : `Up to ${limits.bulkRecipientsPerCampaign.toLocaleString("en-US")} recipients per campaign`}
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
