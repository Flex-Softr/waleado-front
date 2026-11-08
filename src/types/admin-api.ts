export type AdminOverviewResponse = {
  users: {
    total: number;
    customers: number;
    admins: number;
    blocked: number;
    newLast7Days: number;
  };
  workspaces: {
    total: number;
    paid: number;
    free: number;
  };
  payments: {
    pending: number;
    paid: number;
  };
};

export type AdminUserWorkspace = {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "pro" | "business";
  membershipRole: "OWNER" | "ADMIN" | "MEMBER";
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "CUSTOMER";
  blockedAt: string | null;
  createdAt: string;
  workspaces: AdminUserWorkspace[];
};

export type AdminUsersListResponse = {
  page: number;
  pageSize: number;
  total: number;
  users: AdminUserRow[];
};

export type AdminSubscriptionRow = {
  workspaceId: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "pro" | "business";
  lifetimePlan?: "free" | "starter" | "pro" | "business" | null;
  billingMonths?: number | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  lastPaymentGateway: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; email: string; name: string | null; role?: "ADMIN" | "CUSTOMER" | string } | null;
};

export type AdminSubscriptionsListResponse = {
  page: number;
  pageSize: number;
  total: number;
  subscriptions: AdminSubscriptionRow[];
};

export type AdminPaymentRow = {
  id: string;
  gateway: string;
  tranId: string;
  planId: string;
  amount: number;
  currency: string;
  status: string;
  sessionKey: string | null;
  valId: string | null;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    plan: "free" | "starter" | "pro" | "business";
  };
};

export type AdminPaymentsListResponse = {
  page: number;
  pageSize: number;
  total: number;
  payments: AdminPaymentRow[];
};
