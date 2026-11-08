import { apiJson } from "@/lib/api";
import type {
  BillingInvoice,
  BillingInvoiceDetail,
  BillingQuote,
  BillingSnapshot,
  CheckoutResponse,
  PaidPlanId,
  PaymentGatewayId,
  PricingResponse,
} from "@/types/billing";

const json = { "Content-Type": "application/json" };

export function fetchBillingSnapshot() {
  return apiJson<BillingSnapshot>("/v1/billing");
}

export function fetchPricing() {
  return apiJson<PricingResponse>("/v1/billing/pricing");
}

export function fetchQuote(planId: PaidPlanId, months: number) {
  return apiJson<BillingQuote>("/v1/billing/quote", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ planId, months }),
  });
}

export function startCheckout(input: {
  planId: PaidPlanId;
  months: number;
  gateway: PaymentGatewayId;
  customerPhone?: string;
}) {
  return apiJson<CheckoutResponse>("/v1/billing/checkout", {
    method: "POST",
    headers: json,
    body: JSON.stringify(input),
  });
}

export function fetchInvoices() {
  return apiJson<{ invoices: BillingInvoice[] }>("/v1/billing/invoices");
}

export function fetchInvoice(id: string) {
  return apiJson<{ invoice: BillingInvoiceDetail }>(`/v1/billing/invoices/${id}`);
}
