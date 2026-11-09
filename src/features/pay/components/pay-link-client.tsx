"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PaymentMethodPicker } from "@/features/billing/components/payment-method-picker";
import { PayShell } from "@/features/pay/components/pay-shell";
import { fetchPayLink, startPayLinkCheckout } from "@/features/pay/lib/public-pay-api";
import { ApiError } from "@/lib/api";
import { formatBdt, type PaymentGatewayId, type PublicPayInvoice, type PublicPayResponse } from "@/types/billing";

type LoadState = { data: PublicPayResponse } | { error: string } | null;

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between border-t pt-2 text-base font-bold" : "flex justify-between"}>
      <dt className={strong ? undefined : "text-slate-500"}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function InvoiceSummary({ invoice }: { invoice: PublicPayInvoice }) {
  const credit = Math.min(invoice.credit, invoice.subtotal - invoice.discount);
  return (
    <dl className="space-y-2 rounded-lg border p-4 text-sm">
      <Line label={invoice.description} value={formatBdt(invoice.subtotal)} />
      {invoice.discount > 0 ? (
        <Line label={invoice.couponCode ? `Coupon ${invoice.couponCode}` : "Discount"} value={`−${formatBdt(invoice.discount)}`} />
      ) : null}
      {credit > 0 ? <Line label="Credit from current plan" value={`−${formatBdt(credit)}`} /> : null}
      {invoice.walletAmount > 0 ? <Line label="Paid from wallet" value={`−${formatBdt(invoice.walletAmount)}`} /> : null}
      <Line label={invoice.status === "paid" ? "Paid" : "Amount due"} value={formatBdt(invoice.total)} strong />
    </dl>
  );
}

/** Pays one invoice from a reminder link without logging in. */
export function PayLinkClient() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = React.useState<LoadState>(null);
  const [gateway, setGateway] = React.useState<PaymentGatewayId>("sslcommerz");
  const [paying, setPaying] = React.useState(false);
  const [activated, setActivated] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchPayLink(token)
      .then((data) => !cancelled && setState({ data }))
      .catch((e) => !cancelled && setState({ error: e instanceof ApiError ? e.message : "This payment link is not valid." }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function pay() {
    setPaying(true);
    try {
      const out = await startPayLinkCheckout(token, gateway);
      if ("url" in out) {
        window.location.href = out.url;
        return;
      }
      setActivated(true);
    } catch (e) {
      toast.error("Could not start payment", { description: e instanceof ApiError ? e.message : undefined });
    } finally {
      setPaying(false);
    }
  }

  if (state === null) {
    return (
      <PayShell>
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      </PayShell>
    );
  }
  if ("error" in state) {
    return (
      <PayShell>
        <p className="text-center text-sm text-slate-600">{state.error}</p>
      </PayShell>
    );
  }

  const { invoice, gateways } = state.data;
  const paid = invoice.status === "paid" || activated;
  const stripeEnabled = gateways.some((g) => g.id === "stripe");

  return (
    <PayShell>
      <p className="text-xs font-semibold uppercase text-slate-500">Invoice {invoice.number}</p>
      <h1 className="mt-1 text-xl font-bold">{invoice.workspace}</h1>

      <div className="mt-5 space-y-5">
        <InvoiceSummary invoice={invoice} />

        {paid ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="size-5 shrink-0" />
            This invoice is paid. Thank you!
          </div>
        ) : invoice.status === "unpaid" && gateways.length === 0 ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Online payment is not available right now. Please contact support to pay this invoice.
          </p>
        ) : invoice.status === "unpaid" ? (
          <>
            <PaymentMethodPicker
              value={gateway}
              onChange={setGateway}
              stripeEnabled={stripeEnabled}
              usdAmount={invoice.amountUsd}
            />
            <Button className="w-full" size="lg" onClick={pay} disabled={paying}>
              {paying ? <Loader2 className="size-4 animate-spin" /> : null}
              {invoice.total > 0 ? `Pay ${formatBdt(invoice.total)}` : "Confirm"}
            </Button>
          </>
        ) : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            This invoice is {invoice.status} — a newer invoice may have replaced it. Open your billing page to see what is due.
          </p>
        )}

        <p className="text-center text-sm">
          <Link href="/billing" className="text-slate-600 underline-offset-4 hover:underline">
            Go to my billing page
          </Link>
        </p>
      </div>
    </PayShell>
  );
}
