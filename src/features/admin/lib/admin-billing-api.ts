import { apiJson } from "@/lib/api";
import { qs } from "@/features/admin/lib/admin-api";
import type {
  BillingInvoice,
  InvoiceKind,
  InvoiceStatus,
  PaidPlanId,
  PlanId,
  PlanLimits,
  WalletTransaction,
} from "@/types/billing";

const json = { "Content-Type": "application/json" };

function send<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
) {
  return apiJson<T>(path, {
    method,
    headers: json,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Packages, prices and billing settings
// ---------------------------------------------------------------------------

export type AdminPrice = {
  id: string;
  months: number;
  isLifetime: boolean;
  amountBdt: number;
  compareAtBdt: number | null;
  amountUsd: number | null;
  label: string | null;
  isActive: boolean;
  saleCap: number | null;
  saleEndsAt: string | null;
  sold: number;
  remaining: number | null;
};

export type AdminPlan = {
  id: PlanId;
  name: string;
  tagline: string | null;
  isPublic: boolean;
  highlight: boolean;
  sortOrder: number;
  limits: PlanLimits;
  highlights: string[];
  prices: AdminPrice[];
};

export type AdminBillingSettings = {
  trialDays: number;
  trialPlanId: PlanId;
  graceDays: number;
  brandingFooter: string;
  /** Days before a plan ends that its renewal invoice is created. */
  renewalInvoiceDays: number;
  /** Days before the end on which reminders go out (0 = the last day). */
  reminderDays: number[];
  usageAlertPercents: number[];
  walletMinTopup: number;
  walletMaxTopup: number;
};

export type AdminBillingConfig = {
  settings: AdminBillingSettings;
  plans: AdminPlan[];
};

export type AdminPriceUpdate = {
  planId: PaidPlanId;
  months: number;
  amountBdt: number;
  compareAtBdt?: number | null;
  amountUsd?: number | null;
  label?: string | null;
  isActive: boolean;
  saleCap?: number | null;
  saleEndsAt?: string | null;
  remove?: boolean;
};

export type AdminPlanUpdate = Omit<AdminPlan, "prices" | "id"> & {
  planId: PlanId;
};

export function fetchAdminBillingConfig() {
  return apiJson<AdminBillingConfig>("/v1/admin/billing/config");
}

export function saveAdminBillingConfig(input: {
  settings?: AdminBillingSettings;
  plans?: AdminPlanUpdate[];
  prices?: AdminPriceUpdate[];
}) {
  return send<AdminBillingConfig>("/v1/admin/billing/config", "PUT", input);
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type AdminBillingReport = {
  revenueByMonth: { month: string; cash: number; invoices: number }[];
  cashThisMonth: number;
  paidInvoicesThisMonth: number;
  mrr: number;
  activePaidPeriods: number;
  workspacesByPlan: Record<PlanId, number>;
  lifetimeOwnersByPlan: Record<PlanId, number>;
  lifetimeSales: number;
  lifetimeRevenue: number;
  walletBalanceTotal: number;
  conversion90d: { signups: number; paid: number; rate: number };
  coupons: { redemptions: number; totalDiscount: number };
};

export function fetchAdminBillingReport() {
  return apiJson<AdminBillingReport>("/v1/admin/billing/report");
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

export type AdminInvoiceRow = BillingInvoice & {
  couponCode: string | null;
  note: string | null;
  workspace: { id: string; name: string };
  owner: { email: string; name: string | null } | null;
};

export type AdminInvoiceFilters = {
  page: number;
  pageSize: number;
  status?: InvoiceStatus;
  kind?: InvoiceKind;
  q?: string;
};

export function listAdminInvoices(filters: AdminInvoiceFilters) {
  return apiJson<{
    page: number;
    pageSize: number;
    total: number;
    invoices: AdminInvoiceRow[];
  }>(`/v1/admin/billing/invoices${qs(filters)}`);
}

export function markAdminInvoicePaid(
  id: string,
  input: { paymentRef: string; note?: string | null },
) {
  return send<{ invoice: BillingInvoice }>(
    `/v1/admin/billing/invoices/${id}/mark-paid`,
    "POST",
    input,
  );
}

export function cancelAdminInvoice(id: string) {
  return send<{ invoice: BillingInvoice }>(
    `/v1/admin/billing/invoices/${id}/cancel`,
    "POST",
  );
}

export type ManualInvoiceInput = {
  workspaceId: string;
  kind: "plan" | "topup";
  planId?: PaidPlanId;
  months?: number;
  amount: number;
  note?: string | null;
  /** When set, the invoice is recorded as already paid (e.g. bKash TrxID). */
  paymentRef?: string | null;
};

export function createManualInvoice(input: ManualInvoiceInput) {
  return send<{ invoice: BillingInvoice }>(
    "/v1/admin/billing/invoices",
    "POST",
    input,
  );
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export type CouponDiscountType = "PERCENT" | "FIXED";
export type CouponDuration = "ONCE" | "FOREVER";

export type AdminCouponInput = {
  code: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  duration: CouponDuration;
  /** Empty = every paid plan. */
  planIds: PaidPlanId[];
  /** Billing cycles in months (0 = lifetime); empty = every cycle. */
  cycles: number[];
  maxRedemptions: number | null;
  perWorkspaceLimit: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

export type AdminCoupon = AdminCouponInput & {
  id: string;
  createdAt: string;
  redemptions: number;
  totalDiscount: number;
};

type CouponList = { coupons: AdminCoupon[] };

export function listAdminCoupons() {
  return apiJson<CouponList>("/v1/admin/billing/coupons");
}

export function createAdminCoupon(input: AdminCouponInput) {
  return send<CouponList>("/v1/admin/billing/coupons", "POST", input);
}

export function updateAdminCoupon(id: string, input: AdminCouponInput) {
  return send<CouponList>(`/v1/admin/billing/coupons/${id}`, "PUT", input);
}

export function deleteAdminCoupon(id: string) {
  return send<CouponList & { deleted: boolean; deactivated: boolean }>(
    `/v1/admin/billing/coupons/${id}`,
    "DELETE",
  );
}

// ---------------------------------------------------------------------------
// One workspace's billing (wallet, extensions, audit)
// ---------------------------------------------------------------------------

export type WorkspaceBillingDetail = {
  walletBalance: number;
  autoRenew: boolean;
  lockedCoupon: string | null;
  walletTransactions: WalletTransaction[];
  audit: {
    id: string;
    action: string;
    detail: unknown;
    actorUserId: string | null;
    createdAt: string;
  }[];
};

export function fetchWorkspaceBilling(workspaceId: string) {
  return apiJson<WorkspaceBillingDetail>(
    `/v1/admin/billing/workspaces/${workspaceId}`,
  );
}

export function extendWorkspacePeriod(
  workspaceId: string,
  input: { days: number; reason: string },
) {
  return send<{ currentPeriodEnd: string }>(
    `/v1/admin/billing/workspaces/${workspaceId}/extend`,
    "POST",
    input,
  );
}

export function adjustWorkspaceWallet(
  workspaceId: string,
  input: { amount: number; note: string },
) {
  return send<{ balance: number }>(
    `/v1/admin/billing/workspaces/${workspaceId}/wallet`,
    "POST",
    input,
  );
}
