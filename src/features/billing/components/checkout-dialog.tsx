"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { useSubscription } from "@/features/billing/subscription-context";
import { fetchQuote, startCheckout } from "@/features/billing/lib/billing-api";
import { ApiError } from "@/lib/api";
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
import { cn } from "@/lib/utils";
import {
  cycleLabel,
  formatBdt,
  type BillingQuote,
  type PaidPlanId,
  type PaymentGatewayId,
} from "@/types/billing";

function formatDate(iso: string | null): string {
  if (!iso) return "Never (lifetime)";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Normalises a Bangladeshi phone to +880… for SSLCommerz. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+880${digits.slice(1)}`;
  return `+880${digits}`;
}

const KIND_LABEL = { new: "New plan", renewal: "Renewal", upgrade: "Upgrade" } as const;

export function CheckoutDialog({
  target,
  onClose,
  onActivated,
}: {
  target: { planId: PaidPlanId; months: number } | null;
  onClose: () => void;
  onActivated: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { paymentGateways } = useSubscription();
  const targetKey = target ? `${target.planId}:${target.months}` : null;
  const [result, setResult] = React.useState<{
    key: string;
    quote: BillingQuote | null;
    error: string | null;
  } | null>(null);
  const [paying, setPaying] = React.useState(false);
  const [gatewayChoice, setGatewayChoice] = React.useState<PaymentGatewayId | null>(null);
  const [phone, setPhone] = React.useState("");
  const accountPhone = user?.phone?.trim() || "";

  React.useEffect(() => {
    if (!target || !targetKey) return;
    let cancelled = false;
    fetchQuote(target.planId, target.months)
      .then((q) => !cancelled && setResult({ key: targetKey, quote: q, error: null }))
      .catch(
        (e) =>
          !cancelled &&
          setResult({
            key: targetKey,
            quote: null,
            error: e instanceof ApiError ? e.message : "Could not price this plan.",
          })
      );
    return () => {
      cancelled = true;
    };
  }, [target, targetKey]);

  const current = result && result.key === targetKey ? result : null;
  const quote = current?.quote ?? null;
  const error = current?.error ?? null;
  const loading = target !== null && current === null;

  const sslReady = paymentGateways.some((g) => g.id === "sslcommerz" && g.configured);
  const stripeReady =
    paymentGateways.some((g) => g.id === "stripe" && g.configured) && quote?.amountUsd != null;
  const gateway: PaymentGatewayId =
    gatewayChoice ?? (!sslReady && stripeReady ? "stripe" : "sslcommerz");
  const setGateway = setGatewayChoice;

  async function pay() {
    if (!target || !quote) return;
    setPaying(true);
    try {
      const out = await startCheckout({
        planId: target.planId,
        months: target.months,
        gateway,
        customerPhone:
          gateway === "sslcommerz" ? accountPhone || normalizePhone(phone) || undefined : undefined,
      });
      if ("url" in out) {
        window.location.href = out.url;
        return;
      }
      toast.success(`${quote.planName} is active`, { description: `Invoice ${out.invoice.number}` });
      await onActivated();
      onClose();
    } catch (e) {
      toast.error("Checkout failed", { description: e instanceof ApiError ? e.message : undefined });
    } finally {
      setPaying(false);
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && !paying && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {quote ? `${quote.planName} — ${cycleLabel(quote.months)}` : "Checkout"}
          </DialogTitle>
          <DialogDescription>
            {quote ? KIND_LABEL[quote.kind] : "Calculating your price…"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>
        ) : quote ? (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-lg border p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium">{formatBdt(quote.subtotal)}</dd>
              </div>
              {quote.credit > 0 ? (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <dt>Credit from your current plan</dt>
                  <dd className="font-medium">−{formatBdt(Math.min(quote.credit, quote.subtotal))}</dd>
                </div>
              ) : null}
              {quote.bonusDays > 0 ? (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                  <dt>Extra days from leftover credit</dt>
                  <dd className="font-medium">+{quote.bonusDays} days</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <dt>Total today</dt>
                <dd>{formatBdt(quote.total)}</dd>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>{quote.kind === "renewal" ? "New end date" : "Active until"}</dt>
                <dd>{formatDate(quote.periodEnd)}</dd>
              </div>
            </dl>

            {quote.total > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "sslcommerz" as const, name: "bKash / Nagad / Card", sub: "SSLCommerz · BDT", ready: true },
                    {
                      id: "stripe" as const,
                      name: "International card",
                      sub: quote.amountUsd != null ? `Stripe · $${quote.amountUsd.toFixed(2)}` : "Stripe · not available",
                      ready: stripeReady,
                    },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      disabled={!g.ready}
                      onClick={() => setGateway(g.id)}
                      className={cn(
                        "rounded-lg border p-3 text-left text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50",
                        gateway === g.id && g.ready && "border-emerald-500 ring-2 ring-emerald-500/30"
                      )}
                    >
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.sub}</p>
                    </button>
                  ))}
                </div>
                {gateway === "sslcommerz" && !accountPhone ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="checkout-phone">Mobile number</Label>
                    <Input
                      id="checkout-phone"
                      inputMode="tel"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your credit covers the full price — nothing to pay.
              </p>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={paying}>
            Cancel
          </Button>
          <Button onClick={pay} disabled={!quote || paying}>
            {paying ? <Loader2 className="size-4 animate-spin" /> : null}
            {quote ? (quote.total > 0 ? `Pay ${formatBdt(quote.total)}` : "Activate") : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
