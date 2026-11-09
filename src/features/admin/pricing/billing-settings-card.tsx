"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminBillingSettings } from "@/features/admin/lib/admin-billing-api";
import type { PlanDraft } from "@/features/admin/pricing/pricing-draft";
import type { PlanId } from "@/types/billing";

type Patch = (patch: Partial<AdminBillingSettings>) => void;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function IntInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <Input
      inputMode="numeric"
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

/** "7, 3, 1, 0" ↔ [7, 3, 1, 0]. Commits on blur so typing a trailing comma isn't fought. */
function NumberListInput({
  value,
  onChange,
}: {
  value: number[];
  onChange: (v: number[]) => void;
}) {
  const [text, setText] = React.useState(value.join(", "));
  const commit = () => {
    const parsed = text
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0);
    onChange([...new Set(parsed)].sort((a, b) => b - a));
  };
  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {children}
      </CardContent>
    </Card>
  );
}

export function BillingSettingsCards({
  settings,
  plans,
  onChange,
}: {
  settings: AdminBillingSettings;
  plans: PlanDraft[];
  onChange: Patch;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Section
        title="Trial, grace period & branding"
        description="New sign-ups get the trial plan for the trial days, then move to Free forever. A lapsed paid plan keeps working for the grace days."
      >
        <Field label="Trial length (days, 0 = no trial)">
          <IntInput
            value={settings.trialDays}
            onChange={(trialDays) => onChange({ trialDays })}
          />
        </Field>
        <Field label="Trial plan">
          <select
            className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
            value={settings.trialPlanId}
            onChange={(e) =>
              onChange({ trialPlanId: e.target.value as PlanId })
            }
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Grace period (days)">
          <IntInput
            value={settings.graceDays}
            onChange={(graceDays) => onChange({ graceDays })}
          />
        </Field>
        <Field label="Free-plan message footer" hint="Empty = off">
          <Input
            value={settings.brandingFooter}
            onChange={(e) => onChange({ brandingFooter: e.target.value })}
          />
        </Field>
      </Section>

      <Section
        title="Renewals, alerts & wallet"
        description="Renewal invoices are prepared ahead of time and reminders carry a login-free pay link."
      >
        <Field label="Create renewal invoice (days before end)">
          <IntInput
            value={settings.renewalInvoiceDays}
            onChange={(renewalInvoiceDays) => onChange({ renewalInvoiceDays })}
          />
        </Field>
        <Field
          label="Reminder days before end"
          hint="e.g. 7, 3, 1, 0 (0 = last day)"
        >
          <NumberListInput
            key={settings.reminderDays.join(",")}
            value={settings.reminderDays}
            onChange={(reminderDays) => onChange({ reminderDays })}
          />
        </Field>
        <Field label="Usage alerts at %" hint="e.g. 80, 100">
          <NumberListInput
            key={settings.usageAlertPercents.join(",")}
            value={settings.usageAlertPercents}
            onChange={(usageAlertPercents) =>
              onChange({
                usageAlertPercents: usageAlertPercents.filter(
                  (n) => n > 0 && n <= 100,
                ),
              })
            }
          />
        </Field>
        <Field label="Wallet top-up min / max (৳)">
          <div className="flex gap-2">
            <IntInput
              value={settings.walletMinTopup}
              onChange={(walletMinTopup) => onChange({ walletMinTopup })}
            />
            <IntInput
              value={settings.walletMaxTopup}
              onChange={(walletMaxTopup) => onChange({ walletMaxTopup })}
            />
          </div>
        </Field>
      </Section>
    </div>
  );
}
