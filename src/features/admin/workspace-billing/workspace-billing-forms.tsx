"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  adjustWorkspaceWallet,
  createManualInvoice,
  extendWorkspacePeriod,
} from "@/features/admin/lib/admin-billing-api";
import { ActionForm } from "@/features/admin/workspace-billing/action-form";
import { BILLING_CYCLES, cycleLabel, formatBdt, PAID_PLAN_IDS, PLAN_LABELS, type PaidPlanId } from "@/types/billing";

type FormProps = { workspaceId: string; onDone: () => void };

const selectClass = "h-9 rounded-md border bg-transparent px-2 text-sm";

export function ExtendPeriodForm({ workspaceId, onDone }: FormProps) {
  const [days, setDays] = React.useState("");
  const [reason, setReason] = React.useState("");
  const n = Number(days);
  return (
    <ActionForm
      title="Extend or shorten the paid period"
      hint="Negative days shorten it. Use for compensation or corrections."
      submitLabel="Apply"
      canSubmit={Number.isInteger(n) && n !== 0 && reason.trim().length >= 3}
      onSubmit={async () => {
        const r = await extendWorkspacePeriod(workspaceId, { days: n, reason: reason.trim() });
        setDays("");
        setReason("");
        onDone();
        return `Now runs until ${new Date(r.currentPeriodEnd).toLocaleDateString()}`;
      }}
    >
      <div className="flex gap-2">
        <Input className="w-24" inputMode="numeric" placeholder="Days" value={days} onChange={(e) => setDays(e.target.value)} />
        <Input placeholder="Reason (kept in the audit log)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </ActionForm>
  );
}

export function WalletAdjustForm({ workspaceId, onDone }: FormProps) {
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const n = Number(amount);
  return (
    <ActionForm
      title="Adjust wallet"
      hint="Positive adds credit, negative removes it. Not a payment — no invoice is created."
      submitLabel="Adjust"
      canSubmit={Number.isFinite(n) && n !== 0 && note.trim().length >= 3}
      onSubmit={async () => {
        const r = await adjustWorkspaceWallet(workspaceId, { amount: n, note: note.trim() });
        setAmount("");
        setNote("");
        onDone();
        return `Wallet balance is now ${formatBdt(r.balance)}`;
      }}
    >
      <div className="flex gap-2">
        <Input className="w-28" inputMode="decimal" placeholder="± ৳" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </ActionForm>
  );
}

/** Records money received outside the gateways (bKash personal, bank) as a paid invoice. */
export function ManualPaymentForm({ workspaceId, onDone }: FormProps) {
  const [kind, setKind] = React.useState<"plan" | "topup">("plan");
  const [planId, setPlanId] = React.useState<PaidPlanId>("pro");
  const [months, setMonths] = React.useState(1);
  const [amount, setAmount] = React.useState("");
  const [paymentRef, setPaymentRef] = React.useState("");
  const n = Number(amount);
  return (
    <ActionForm
      title="Record a manual payment"
      hint="Creates a paid invoice and applies it (plan or wallet top-up). The customer gets a receipt."
      submitLabel="Record payment"
      canSubmit={n > 0 && paymentRef.trim().length > 0}
      onSubmit={async () => {
        const { invoice } = await createManualInvoice({
          workspaceId,
          kind,
          ...(kind === "plan" ? { planId, months } : {}),
          amount: n,
          paymentRef: paymentRef.trim(),
        });
        setAmount("");
        setPaymentRef("");
        onDone();
        return `Invoice ${invoice.number} recorded`;
      }}
    >
      <div className="flex flex-wrap gap-2">
        <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as "plan" | "topup")}>
          <option value="plan">Plan</option>
          <option value="topup">Wallet top-up</option>
        </select>
        {kind === "plan" ? (
          <>
            <select className={selectClass} value={planId} onChange={(e) => setPlanId(e.target.value as PaidPlanId)}>
              {PAID_PLAN_IDS.map((id) => (
                <option key={id} value={id}>
                  {PLAN_LABELS[id]}
                </option>
              ))}
            </select>
            <select className={selectClass} value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {BILLING_CYCLES.map((m) => (
                <option key={m} value={m}>
                  {cycleLabel(m)}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Input className="w-28" inputMode="decimal" placeholder="৳ received" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder="bKash TrxID / reference" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
      </div>
    </ActionForm>
  );
}
