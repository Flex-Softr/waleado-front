"use client";

import * as React from "react";
import { Loader2, TicketPercent, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { useSubscription } from "@/features/billing/subscription-context";
import { fetchQuote, startCheckout } from "@/features/billing/lib/billing-api";
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
import { cycleLabel, formatBdt, type BillingQuote, type PaidPlanId, type PaymentGatewayId } from "@/types/billing";

function formatDate(iso: string | null): string {
  if (!iso) return "Never (lifetime)";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const KIND_LABEL: Record<BillingQuote["kind"], string> = {
  new: "New plan",
  renewal: "Renewal",
  upgrade: "Upgrade",
  topup: "Wallet top-up",
};

type QuoteState = { key: string; quote: BillingQuote | null; error: string | null };

function Row({ label, value, tone }: { label: string; value: string; tone?: "credit" | "total" | "muted" }) {
  return (
    <div
      className={
        tone === "total"
          ? "flex justify-between border-t pt-2 text-base font-bold"
          : tone === "credit"
          ? "flex justify-between text-emerald-700 dark:text-emerald-400"
          : tone === "muted"
          ? "flex justify-between text-xs text-muted-foreground"
          : "flex justify-between"
      }
    >
      <dt className={tone ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function CheckoutDialog({
  target,
  initialCoupon,
  onClose,
  onActivated,
}: {
  target: { planId: PaidPlanId; months: number } | null;
  /** Coupon code to try first (e.g. from a ?coupon= link). */
  initialCoupon?: string | null;
  onClose: () => void;
  onActivated: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { paymentGateways } = useSubscription();
  const [couponInput, setCouponInput] = React.useState(initialCoupon ?? "");
  const [appliedCoupon, setAppliedCoupon] = React.useState<string | null>(initialCoupon ?? null);
  const [useWallet, setUseWallet] = React.useState(true);
  const [state, setState] = React.useState<QuoteState | null>(null);
  const [paying, setPaying] = React.useState(false);
  const [gatewayChoice, setGatewayChoice] = React.useState<PaymentGatewayId | null>(null);
  const [phone, setPhone] = React.useState("");
  const accountPhone = user?.phone?.trim() || "";

  const quoteKey = target ? `${target.planId}:${target.months}:${appliedCoupon ?? ""}:${useWallet}` : null;

  React.useEffect(() => {
    if (!target || !quoteKey) return;
    let cancelled = false;
    fetchQuote(target.planId, target.months, { couponCode: appliedCoupon, useWallet })
      .then((quote) => !cancelled && setState({ key: quoteKey, quote, error: null }))
      .catch((e) => {
        if (cancelled) return;
        // A bad coupon shouldn't block checkout: drop it and price without it.
        if (e instanceof ApiError && e.code === "COUPON_INVALID") {
          toast.error(e.message);
          setAppliedCoupon(null);
          return;
        }
        setState({ key: quoteKey, quote: null, error: e instanceof ApiError ? e.message : "Could not price this plan." });
      });
    return () => {
      cancelled = true;
    };
  }, [target, quoteKey, appliedCoupon, useWallet]);

  const current = state && state.key === quoteKey ? state : null;
  const quote = current?.quote ?? null;
  const loading = target !== null && current === null;
  const stripeReady = paymentGateways.some((g) => g.id === "stripe" && g.configured);
  const gateway: PaymentGatewayId = gatewayChoice ?? "sslcommerz";

  async function pay() {
    if (!target || !quote) return;
    setPaying(true);
    try {
      const out = await startCheckout({
        planId: target.planId,
        months: target.months,
        couponCode: appliedCoupon,
        useWallet,
        gateway,
        customerPhone: gateway === "sslcommerz" ? accountPhone || normalizeBdPhone(phone) || undefined : undefined,
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

  const walletCanHelp = quote ? quote.walletAmount > 0 || !useWallet : false;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && !paying && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{quote ? `${quote.planName} — ${cycleLabel(quote.months)}` : "Checkout"}</DialogTitle>
          <DialogDescription>{quote ? KIND_LABEL[quote.kind] : "Calculating your price…"}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : current?.error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{current.error}</p>
        ) : quote ? (
          <div className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setAppliedCoupon(couponInput.trim() || null);
              }}
            >
              <div className="relative flex-1">
                <TicketPercent className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 uppercase"
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline">
                Apply
              </Button>
            </form>

            <dl className="space-y-2 rounded-lg border p-4 text-sm">
              <Row label="Price" value={formatBdt(quote.subtotal)} />
              {quote.discount > 0 && quote.coupon ? (
                <Row label={`Coupon ${quote.coupon.code} (${quote.coupon.description})`} value={`−${formatBdt(quote.discount)}`} tone="credit" />
              ) : null}
              {quote.credit > 0 ? (
                <Row
                  label="Credit from your current plan"
                  value={`−${formatBdt(Math.min(quote.credit, quote.subtotal - quote.discount))}`}
                  tone="credit"
                />
              ) : null}
              {quote.bonusDays > 0 ? <Row label="Extra days from leftover credit" value={`+${quote.bonusDays} days`} tone="credit" /> : null}
              {quote.walletAmount > 0 ? <Row label="Paid from wallet" value={`−${formatBdt(quote.walletAmount)}`} tone="credit" /> : null}
              <Row label="To pay now" value={formatBdt(quote.total)} tone="total" />
              <Row label={quote.kind === "renewal" ? "New end date" : "Active until"} value={formatDate(quote.periodEnd)} tone="muted" />
            </dl>

            {walletCanHelp ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
                <Wallet className="size-4 text-muted-foreground" />
                Use my wallet balance
              </label>
            ) : null}

            {quote.total > 0 ? (
              <PaymentMethodPicker
                value={gateway}
                onChange={setGatewayChoice}
                stripeEnabled={stripeReady}
                usdAmount={quote.amountUsd}
                phoneField={accountPhone ? undefined : { value: phone, onChange: setPhone }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to pay by card — your wallet or credit covers it.</p>
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
