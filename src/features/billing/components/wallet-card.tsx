"use client";

import * as React from "react";
import { Plus, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setWalletAutoRenew } from "@/features/billing/lib/billing-api";
import { WalletTopupDialog } from "@/features/billing/components/wallet-topup-dialog";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatBdt, type WalletSnapshot, type WalletTransactionType } from "@/types/billing";

const TX_LABEL: Record<WalletTransactionType, string> = {
  topup: "Top-up",
  invoice_payment: "Paid invoice",
  invoice_refund: "Refund",
  adjustment: "Adjustment",
};

export function WalletCard({
  wallet,
  canAutoRenew,
  onChanged,
}: {
  wallet: WalletSnapshot;
  /** Auto-renew only makes sense on a running timed plan. */
  canAutoRenew: boolean;
  onChanged: () => Promise<void>;
}) {
  const [topupOpen, setTopupOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function toggleAutoRenew(enabled: boolean) {
    setSaving(true);
    try {
      await setWalletAutoRenew(enabled);
      await onChanged();
      toast.success(enabled ? "Auto-renew is on" : "Auto-renew is off");
    } catch (e) {
      toast.error("Could not update auto-renew", { description: e instanceof ApiError ? e.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-full rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="size-5" />
          Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Balance</p>
            <p className="text-3xl font-extrabold">{formatBdt(wallet.balance)}</p>
          </div>
          <Button onClick={() => setTopupOpen(true)}>
            <Plus className="size-4" />
            Add funds
          </Button>
        </div>

        <label
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm",
            !canAutoRenew && !wallet.autoRenew && "opacity-60"
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={wallet.autoRenew}
            disabled={saving || (!canAutoRenew && !wallet.autoRenew)}
            onChange={(e) => void toggleAutoRenew(e.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 font-semibold">
              <RefreshCw className="size-3.5" />
              Auto-renew from wallet
            </span>
            <span className="text-muted-foreground">
              {canAutoRenew
                ? "Renews your plan a day before it ends if the balance covers it. We'll tell you if it doesn't."
                : "Available while a monthly or yearly plan is running."}
            </span>
          </span>
        </label>

        {wallet.transactions.length ? (
          <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
            {wallet.transactions.slice(0, 10).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-muted-foreground">
                  {TX_LABEL[t.type]}
                  {t.invoiceNumber ? ` · ${t.invoiceNumber}` : t.note ? ` · ${t.note}` : ""}
                </span>
                <span className={cn("font-semibold tabular-nums", t.amount > 0 ? "text-emerald-600" : "")}>
                  {t.amount > 0 ? "+" : "−"}
                  {formatBdt(Math.abs(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
        )}
      </CardContent>

      <WalletTopupDialog
        open={topupOpen}
        minTopup={wallet.minTopup}
        maxTopup={wallet.maxTopup}
        onClose={() => setTopupOpen(false)}
        onDone={onChanged}
      />
    </Card>
  );
}
