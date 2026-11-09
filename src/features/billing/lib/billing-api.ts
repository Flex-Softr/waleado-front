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
  WalletSnapshot,
} from "@/types/billing";

const json = { "Content-Type": "application/json" };

export type PurchaseOptions = {
  couponCode?: string | null;
  useWallet: boolean;
};

export function fetchBillingSnapshot() {
  return apiJson<BillingSnapshot>("/v1/billing");
}

export function fetchPricing() {
  return apiJson<PricingResponse>("/v1/billing/pricing");
}

export function fetchQuote(planId: PaidPlanId, months: number, options: PurchaseOptions) {
  return apiJson<BillingQuote>("/v1/billing/quote", {
    method: "POST",
    headers: json,
    body: JSON.stringify({ planId, months, ...options }),
  });
}

export function startCheckout(
  input: { planId: PaidPlanId; months: number; gateway: PaymentGatewayId; customerPhone?: string } & PurchaseOptions
) {
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

export function fetchWallet() {
  return apiJson<WalletSnapshot>("/v1/billing/wallet");
}

export function startWalletTopup(input: { amount: number; gateway: PaymentGatewayId; customerPhone?: string }) {
  return apiJson<CheckoutResponse>("/v1/billing/wallet/topup", {
    method: "POST",
    headers: json,
    body: JSON.stringify(input),
  });
}

export function setWalletAutoRenew(enabled: boolean) {
  return apiJson<{ autoRenew: boolean }>("/v1/billing/wallet/auto-renew", {
    method: "PUT",
    headers: json,
    body: JSON.stringify({ enabled }),
  });
}
