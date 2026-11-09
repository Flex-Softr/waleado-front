import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  numberText,
  parseNumber,
  type PlanDraft,
} from "@/features/admin/pricing/pricing-draft";
import {
  FEATURE_LABELS,
  LIMIT_LABELS,
  type CountLimitKey,
  type PlanFeatureKey,
} from "@/types/billing";

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

export function PlanEditorCard({
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
            <Input
              value={plan.name}
              onChange={(e) => onPlan({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tagline</Label>
            <Input
              value={plan.tagline ?? ""}
              onChange={(e) => onPlan({ tagline: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={plan.isPublic}
              onChange={(e) => onPlan({ isPublic: e.target.checked })}
            />
            Show on pricing pages
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={plan.highlight}
              onChange={(e) => onPlan({ highlight: e.target.checked })}
            />
            &ldquo;Most popular&rdquo;
          </label>
          <label className="flex items-center gap-2">
            Order
            <Input
              className="h-8 w-16"
              inputMode="numeric"
              value={String(plan.sortOrder)}
              onChange={(e) =>
                onPlan({ sortOrder: Number(e.target.value) || 0 })
              }
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Limits (empty = unlimited)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {LIMIT_KEYS.map((k) => (
              <label
                key={k}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="text-muted-foreground">{LIMIT_LABELS[k]}</span>
                <Input
                  className="h-8 w-28 text-right"
                  inputMode="numeric"
                  placeholder="∞"
                  value={numberText(plan.limits[k])}
                  onChange={(e) => onLimit(k, parseNumber(e.target.value))}
                />
              </label>
            ))}
            <label className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                Message variations / campaign
              </span>
              <Input
                className="h-8 w-28 text-right"
                inputMode="numeric"
                value={String(plan.limits.bulkMessageVariants)}
                onChange={(e) =>
                  onLimit(
                    "bulkMessageVariants",
                    Math.max(1, Number(e.target.value) || 1),
                  )
                }
              />
            </label>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Features
          </p>
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
          <Label className="text-xs">
            Bullet points on pricing card (one per line)
          </Label>
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
