import type { PlanId } from "@/types/billing";

export type BillingPlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly price in USD for display */
  priceUsd: number | null;
  /** e.g. "$29" or "Custom" */
  priceLabel: string;
  periodLabel: string;
  /** Env var name holding Stripe Price ID (monthly recurring) */
  stripePriceEnv?: string;
  highlight?: boolean;
  features: string[];
};

export const BILLING_PLANS: BillingPlanDefinition[] = [
  {
    id: "free",
    name: "3-Day Free Trial",
    description: "Full access to Waleado features for 3 days on your account.",
    priceUsd: 0,
    priceLabel: "$0",
    periodLabel: "3-day trial",
    features: [
      "1 WhatsApp session",
      "Full messaging capabilities",
      "Auto-reply, chatbot & templates",
      "One-time trial per account",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams and higher volume.",
    priceUsd: 29,
    priceLabel: "$29",
    periodLabel: "per month",
    stripePriceEnv: "STRIPE_PRICE_PRO_MONTHLY",
    highlight: true,
    features: [
      "5 WhatsApp sessions",
      "10,000 messages / month",
      "Bulk campaigns & chatbots",
      "Call responder & group tools",
      "Email support",
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "Scale with priority support and higher limits.",
    priceUsd: 79,
    priceLabel: "$79",
    periodLabel: "per month",
    stripePriceEnv: "STRIPE_PRICE_BUSINESS_MONTHLY",
    features: [
      "Unlimited sessions*",
      "50,000 messages / month",
      "Everything in Pro",
      "Dedicated success manager",
      "SLA & onboarding call",
    ],
  },
];

export function getPlanById(id: PlanId): BillingPlanDefinition | undefined {
  return BILLING_PLANS.find((p) => p.id === id);
}

export function isPaidPlan(id: PlanId): boolean {
  return id === "pro" || id === "business";
}
