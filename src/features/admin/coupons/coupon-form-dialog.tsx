"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AdminCoupon,
  AdminCouponInput,
  CouponDiscountType,
  CouponDuration,
} from "@/features/admin/lib/admin-billing-api";
import { cn } from "@/lib/utils";
import { BILLING_CYCLES, cycleLabel, PAID_PLAN_IDS, PLAN_LABELS, type PaidPlanId } from "@/types/billing";


type FormState = {
  code: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: string;
  duration: CouponDuration;
  planIds: PaidPlanId[];
  cycles: number[];
  maxRedemptions: string;
  perWorkspaceLimit: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function toForm(c: AdminCoupon | null): FormState {
  return {
    code: c?.code ?? "",
    description: c?.description ?? "",
    discountType: c?.discountType ?? "PERCENT",
    discountValue: c ? String(c.discountValue) : "",
    duration: c?.duration ?? "ONCE",
    planIds: c?.planIds ?? [],
    cycles: c?.cycles ?? [],
    maxRedemptions: c?.maxRedemptions ? String(c.maxRedemptions) : "",
    perWorkspaceLimit: String(c?.perWorkspaceLimit ?? 1),
    startsAt: dateInput(c?.startsAt ?? null),
    expiresAt: dateInput(c?.expiresAt ?? null),
    isActive: c?.isActive ?? true,
  };
}

function toInput(f: FormState): AdminCouponInput {
  return {
    code: f.code.trim(),
    description: f.description.trim() || null,
    discountType: f.discountType,
    discountValue: Number(f.discountValue),
    duration: f.duration,
    planIds: f.planIds,
    cycles: f.cycles,
    maxRedemptions: f.maxRedemptions.trim() ? Number(f.maxRedemptions) : null,
    perWorkspaceLimit: Number(f.perWorkspaceLimit) || 1,
    startsAt: f.startsAt ? new Date(`${f.startsAt}T00:00:00`).toISOString() : null,
    expiresAt: f.expiresAt ? new Date(`${f.expiresAt}T23:59:59`).toISOString() : null,
    isActive: f.isActive,
  };
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium",
        active ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "text-muted-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Create or edit a coupon. `coupon === undefined` means closed, `null` means "new". */
export function CouponFormDialog({
  coupon,
  onClose,
  onSubmit,
}: {
  coupon: AdminCoupon | null | undefined;
  onClose: () => void;
  onSubmit: (input: AdminCouponInput) => Promise<void>;
}) {
  const open = coupon !== undefined;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {/* Keyed so the form starts fresh for each coupon. */}
        {open ? <CouponForm key={coupon?.id ?? "new"} coupon={coupon} onClose={onClose} onSubmit={onSubmit} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function CouponForm({
  coupon,
  onClose,
  onSubmit,
}: {
  coupon: AdminCoupon | null;
  onClose: () => void;
  onSubmit: (input: AdminCouponInput) => Promise<void>;
}) {
  const [form, setForm] = React.useState(() => toForm(coupon));
  const [busy, setBusy] = React.useState(false);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(toInput(form));
      onClose();
    } catch {
      // The parent shows the error; keep the form open for fixing.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{coupon ? `Edit ${coupon.code}` : "New coupon"}</DialogTitle>
        <DialogDescription>
          &ldquo;Forever&rdquo; coupons stay on the workspace and discount every renewal — good for founding members.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code">
          <Input
            className="font-mono uppercase"
            value={form.code}
            onChange={(e) => set({ code: e.target.value.toUpperCase() })}
            placeholder="FOUNDER50"
            required
          />
        </Field>
        <Field label="Internal note">
          <Input value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </Field>
        <Field label="Discount">
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              value={form.discountValue}
              onChange={(e) => set({ discountValue: e.target.value })}
              required
            />
            <select
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
              value={form.discountType}
              onChange={(e) => set({ discountType: e.target.value as CouponDiscountType })}
            >
              <option value="PERCENT">%</option>
              <option value="FIXED">৳ off</option>
            </select>
          </div>
        </Field>
        <Field label="Applies to">
          <select
            className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
            value={form.duration}
            onChange={(e) => set({ duration: e.target.value as CouponDuration })}
          >
            <option value="ONCE">First payment only</option>
            <option value="FOREVER">Every renewal (forever)</option>
          </select>
        </Field>
      </div>

      <Field label="Plans" hint="None selected = all paid plans">
        <div className="flex flex-wrap gap-2">
          {PAID_PLAN_IDS.map((id) => (
            <Chip key={id} active={form.planIds.includes(id)} onClick={() => set({ planIds: toggle(form.planIds, id) })}>
              {PLAN_LABELS[id]}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Billing cycles" hint="None selected = every cycle">
        <div className="flex flex-wrap gap-2">
          {BILLING_CYCLES.map((m) => (
            <Chip key={m} active={form.cycles.includes(m)} onClick={() => set({ cycles: toggle(form.cycles, m) })}>
              {cycleLabel(m)}
            </Chip>
          ))}
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Total uses" hint="Empty = unlimited">
          <Input inputMode="numeric" value={form.maxRedemptions} onChange={(e) => set({ maxRedemptions: e.target.value })} />
        </Field>
        <Field label="Uses per workspace">
          <Input
            inputMode="numeric"
            value={form.perWorkspaceLimit}
            onChange={(e) => set({ perWorkspaceLimit: e.target.value })}
          />
        </Field>
        <Field label="Starts">
          <Input type="date" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
        </Field>
        <Field label="Expires">
          <Input type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
        Active
      </label>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {coupon ? "Save" : "Create coupon"}
        </Button>
      </DialogFooter>
    </form>
  );
}
