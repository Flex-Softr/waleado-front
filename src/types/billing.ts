export type PlanId = "free" | "starter" | "pro" | "business";
export type PaidPlanId = Exclude<PlanId, "free">;

export const PLAN_IDS: PlanId[] = ["free", "starter", "pro", "business"];
export const PAID_PLAN_IDS: PaidPlanId[] = ["starter", "pro", "business"];

/** Default display names (admins can rename plans; use the catalog name when you have it). */
export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

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

/** Billing cycles the product sells, in months (0 = lifetime). */
export const BILLING_CYCLES = [1, 3, 6, 12, LIFETIME_MONTHS];

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

export type InvoiceKind = "new" | "renewal" | "upgrade" | "topup";

export type BillingQuote = {
  planId: PaidPlanId;
  planName: string;
  months: number;
  isLifetime: boolean;
  kind: InvoiceKind;
  /** List price. */
  subtotal: number;
  /** Coupon discount. */
  discount: number;
  coupon: { code: string; description: string } | null;
  /** Credit from the plan being replaced. */
  credit: number;
  /** Paid from the wallet. */
  walletAmount: number;
  /** Left to pay through a gateway. */
  total: number;
  currency: string;
  amountUsd: number | null;
  description: string;
  periodStart: string;
  periodEnd: string | null;
  bonusDays: number;
};

export type InvoiceStatus = "unpaid" | "paid" | "cancelled";

export type BillingInvoice = {
  id: string;
  number: string;
  planId: PlanId | null;
  months: number;
  isLifetime: boolean;
  cycle: string;
  kind: InvoiceKind;
  subtotal: number;
  discount: number;
  credit: number;
  walletAmount: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  gateway: string | null;
  paymentRef: string | null;
  description: string;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
  /** Present while unpaid: token for the login-free pay page (/pay/:token). */
  payToken: string | null;
};

export type BillingInvoiceDetail = BillingInvoice & {
  couponCode: string | null;
  billedTo: {
    workspace: string;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
};

export type WalletTransactionType = "topup" | "invoice_payment" | "invoice_refund" | "adjustment";

export type WalletTransaction = {
  id: string;
  amount: number;
  balanceAfter: number;
  type: WalletTransactionType;
  invoiceNumber: string | null;
  note: string | null;
  createdAt: string;
};

export type WalletSnapshot = {
  balance: number;
  autoRenew: boolean;
  minTopup: number;
  maxTopup: number;
  transactions: WalletTransaction[];
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

/** What the login-free pay page (/pay/:token) gets about an invoice. */
export type PublicPayInvoice = {
  number: string;
  description: string;
  status: InvoiceStatus;
  subtotal: number;
  discount: number;
  couponCode: string | null;
  credit: number;
  walletAmount: number;
  total: number;
  amountUsd: number | null;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  workspace: string;
};

export type PublicPayResponse = {
  invoice: PublicPayInvoice;
  gateways: PaymentGatewayMeta[];
};
