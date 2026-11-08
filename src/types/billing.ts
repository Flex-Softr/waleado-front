export type PlanId = "free" | "starter" | "pro" | "business";
export type PaidPlanId = Exclude<PlanId, "free">;

export const PLAN_IDS: PlanId[] = ["free", "starter", "pro", "business"];
export const PAID_PLAN_IDS: PaidPlanId[] = ["starter", "pro", "business"];

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as string[]).includes(value);
}

export function isPaidPlanId(value: string): value is PaidPlanId {
  return (PAID_PLAN_IDS as string[]).includes(value);
}

export type PaymentGatewayId = "stripe" | "sslcommerz";

export type PaymentGatewayMeta = {
  id: PaymentGatewayId;
  displayName: string;
  description: string;
  configured: boolean;
};

export function isPaymentGatewayId(value: string): value is PaymentGatewayId {
  return value === "stripe" || value === "sslcommerz";
}

export type PlanFeatureKey =
  | "ai"
  | "chatbot"
  | "api"
  | "groupGrabber"
  | "callResponder"
  | "bulkScheduling"
  | "removeBranding";

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

/** Count limits: number, or null for unlimited. */
export type PlanLimits = {
  devices: number | null;
  messagesPerDay: number | null;
  messagesPerMonth: number | null;
  contacts: number | null;
  bulkRecipientsPerCampaign: number | null;
  bulkMessageVariants: number;
  autoReplyRules: number | null;
  templates: number | null;
  chatbotFlows: number | null;
  features: PlanFeatures;
};

export type CountLimitKey = Exclude<keyof PlanLimits, "features" | "bulkMessageVariants">;

export const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  ai: "AI replies & rewrite",
  chatbot: "Chatbot flows",
  api: "API access",
  groupGrabber: "Group grabber",
  callResponder: "Call responder",
  bulkScheduling: "Scheduled campaigns",
  removeBranding: "No Waleado branding",
};

export const LIMIT_LABELS: Record<CountLimitKey, string> = {
  devices: "WhatsApp devices",
  messagesPerDay: "Messages / day",
  messagesPerMonth: "Messages / month",
  contacts: "Contacts",
  bulkRecipientsPerCampaign: "Recipients / campaign",
  autoReplyRules: "Auto-reply rules",
  templates: "Templates",
  chatbotFlows: "Chatbot flows",
};

/** months = 0 means lifetime. */
export const LIFETIME_MONTHS = 0;

export type PricingPrice = {
  months: number;
  isLifetime: boolean;
  amountBdt: number;
  compareAtBdt: number | null;
  amountUsd: number | null;
  perMonthBdt: number | null;
  label: string | null;
  saleCap: number | null;
  remaining: number | null;
  saleEndsAt: string | null;
  available: boolean;
};

export type PricingPlan = {
  id: PlanId;
  name: string;
  tagline: string | null;
  highlight: boolean;
  limits: PlanLimits;
  highlights: string[];
  prices: PricingPrice[];
};

export type PricingResponse = {
  currency: "BDT";
  trialDays: number;
  trialPlanId: PlanId;
  plans: PricingPlan[];
};

/** Where the current plan comes from. */
export type PlanSource = "admin" | "paid" | "grace" | "lifetime" | "trial" | "free";

export type BillingUsage = {
  devices: number;
  contacts: number;
  templates: number;
  autoReplyRules: number;
  chatbotFlows: number;
  messagesToday: number;
  messagesThisMonth: number;
};

export type BillingSnapshot = {
  planId: PlanId;
  planName: string;
  source: PlanSource;
  isLifetime: boolean;
  lifetimePlanId: PlanId | null;
  lifetimePlanName: string | null;
  billingMonths: number | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  inGrace: boolean;
  trial: { active: boolean; endsAt: string | null; daysRemaining: number | null };
  limits: PlanLimits;
  usage: BillingUsage;
  daysRemaining: number | null;
  stripeConfigured: boolean;
  stripePortalEligible: boolean;
  paymentGateways: PaymentGatewayMeta[];
};

export type InvoiceKind = "new" | "renewal" | "upgrade";

export type BillingQuote = {
  planId: PaidPlanId;
  planName: string;
  months: number;
  isLifetime: boolean;
  kind: InvoiceKind;
  subtotal: number;
  credit: number;
  total: number;
  currency: string;
  amountUsd: number | null;
  description: string;
  periodStart: string;
  periodEnd: string | null;
  bonusDays: number;
};

export type BillingInvoice = {
  id: string;
  number: string;
  planId: PlanId;
  months: number;
  isLifetime: boolean;
  cycle: string;
  kind: InvoiceKind;
  subtotal: number;
  credit: number;
  total: number;
  currency: string;
  status: "unpaid" | "paid" | "cancelled";
  gateway: string | null;
  description: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type BillingInvoiceDetail = BillingInvoice & {
  billedTo: {
    workspace: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

export type CheckoutResponse =
  | { url: string; gateway: PaymentGatewayId; invoice: BillingInvoice }
  | { activated: true; invoice: BillingInvoice };

/** Short label for a billing cycle. */
export function cycleLabel(months: number): string {
  if (months === LIFETIME_MONTHS) return "Lifetime";
  if (months === 1) return "Monthly";
  if (months === 12) return "Yearly";
  if (months % 12 === 0) return `${months / 12} years`;
  return `${months} months`;
}

/** Suffix after a price, e.g. "/month". */
export function cycleSuffix(months: number): string {
  if (months === LIFETIME_MONTHS) return "one-time";
  if (months === 1) return "/month";
  if (months === 12) return "/year";
  return `/${months} months`;
}

export function formatBdt(n: number): string {
  return `৳${Math.round(n).toLocaleString("en-US")}`;
}
