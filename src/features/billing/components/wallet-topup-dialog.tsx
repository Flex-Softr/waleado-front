"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { startWalletTopup } from "@/features/billing/lib/billing-api";
import { PaymentMethodPicker } from "@/features/billing/components/payment-method-picker";
import { ApiError } from "@/lib/api";
import { normalizeBdPhone } from "@/lib/bd-phone";
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
import { formatBdt, type PaymentGatewayId } from "@/types/billing";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];

export function WalletTopupDialog({
  open,
  minTopup,
  maxTopup,
  onClose,
  onDone,
}: {
  open: boolean;
  minTopup: number;
  maxTopup: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [amount, setAmount] = React.useState("1000");
  const [gateway, setGateway] = React.useState<PaymentGatewayId>("sslcommerz");
  const [phone, setPhone] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const accountPhone = user?.phone?.trim() || "";
  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= minTopup && value <= maxTopup;

  async function submit() {
    setBusy(true);
    try {
      const out = await startWalletTopup({
        amount: value,
        gateway,
        customerPhone: gateway === "sslcommerz" ? accountPhone || normalizeBdPhone(phone) || undefined : undefined,
      });
      if ("url" in out) {
        window.location.href = out.url;
        return;
      }
      toast.success(`${formatBdt(value)} added to your wallet`);
      await onDone();
      onClose();
    } catch (e) {
      toast.error("Top-up failed", { description: e instanceof ApiError ? e.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add funds to wallet</DialogTitle>
          <DialogDescription>
            Use your balance for renewals and upgrades, or let it auto-renew your plan. Between {formatBdt(minTopup)} and{" "}
            {formatBdt(maxTopup)}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topup-amount">Amount (BDT)</Label>
            <Input id="topup-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_AMOUNTS.filter((a) => a >= minTopup && a <= maxTopup).map((a) => (
                <Button key={a} type="button" size="sm" variant="outline" onClick={() => setAmount(String(a))}>
                  {formatBdt(a)}
                </Button>
              ))}
            </div>
          </div>
          {/* Top-ups are in BDT, so only SSLCommerz applies. */}
          <PaymentMethodPicker
            value={gateway}
            onChange={setGateway}
            stripeEnabled={false}
            phoneField={accountPhone ? undefined : { value: phone, onChange: setPhone }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Add {valid ? formatBdt(value) : "funds"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
