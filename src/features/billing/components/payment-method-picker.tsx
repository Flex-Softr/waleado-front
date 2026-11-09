"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PaymentGatewayId } from "@/types/billing";

type Option = { id: PaymentGatewayId; name: string; sub: string; enabled: boolean };

/** Gateway choice (bKash/card via SSLCommerz, or Stripe in USD) plus the phone SSLCommerz needs. */
export function PaymentMethodPicker({
  value,
  onChange,
  stripeEnabled,
  usdAmount,
  phoneField,
}: {
  value: PaymentGatewayId;
  onChange: (g: PaymentGatewayId) => void;
  stripeEnabled: boolean;
  usdAmount?: number | null;
  /** Shown for SSLCommerz when we don't already know the payer's phone. */
  phoneField?: { value: string; onChange: (v: string) => void };
}) {
  const options: Option[] = [
    { id: "sslcommerz", name: "bKash / Nagad / Card", sub: "SSLCommerz · BDT", enabled: true },
    {
      id: "stripe",
      name: "International card",
      sub: stripeEnabled && usdAmount != null ? `Stripe · $${usdAmount.toFixed(2)}` : "Stripe · not available",
      enabled: stripeEnabled && usdAmount != null,
    },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={!o.enabled}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-lg border p-3 text-left text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50",
              value === o.id && o.enabled && "border-emerald-500 ring-2 ring-emerald-500/30"
            )}
          >
            <p className="font-semibold">{o.name}</p>
            <p className="text-xs text-muted-foreground">{o.sub}</p>
          </button>
        ))}
      </div>
      {value === "sslcommerz" && phoneField ? (
        <div className="space-y-1.5">
          <Label htmlFor="payment-phone">Mobile number</Label>
          <Input
            id="payment-phone"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            value={phoneField.value}
            onChange={(e) => phoneField.onChange(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
