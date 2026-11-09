import { apiJson } from "@/lib/api";
import type { PaymentGatewayId, PublicPayResponse } from "@/types/billing";

/** Login-free invoice payment: the signed token in the link is the only credential. */
export function fetchPayLink(token: string) {
  return apiJson<PublicPayResponse>(`/v1/public/pay/${encodeURIComponent(token)}`);
}

export function startPayLinkCheckout(token: string, gateway: PaymentGatewayId) {
  return apiJson<{ url: string } | { activated: true }>(`/v1/public/pay/${encodeURIComponent(token)}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gateway }),
  });
}
