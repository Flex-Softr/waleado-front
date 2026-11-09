import { apiJson } from "@/lib/api";
import type {
  AdminOverviewResponse,
  AdminPaymentsListResponse,
  AdminPaymentRow,
  AdminSubscriptionRow,
  AdminSubscriptionsListResponse,
  AdminUserRow,
  AdminUsersListResponse,
} from "@/types/admin-api";

export function qs(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export async function fetchAdminOverview() {
  return apiJson<AdminOverviewResponse>("/v1/admin/overview");
}

export async function listAdminUsers(input: {
  page: number;
  pageSize: number;
  q?: string;
}) {
  return apiJson<AdminUsersListResponse>(`/v1/admin/users${qs(input)}`);
}

export async function blockAdminUser(userId: string) {
  return apiJson<{ user: AdminUserRow }>(`/v1/admin/users/${userId}/block`, {
    method: "POST",
  });
}

export async function unblockAdminUser(userId: string) {
  return apiJson<{ user: AdminUserRow }>(`/v1/admin/users/${userId}/unblock`, {
    method: "POST",
  });
}

export async function createAdminManagedUser(input: {
  email: string;
  password: string;
  name?: string;
  role: "ADMIN" | "CUSTOMER";
}) {
  return apiJson<{ user: AdminUserRow }>("/v1/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function setAdminManagedUserRole(
  userId: string,
  role: "ADMIN" | "CUSTOMER",
) {
  return apiJson<{ user: AdminUserRow }>(`/v1/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
}

export async function deleteAdminManagedUser(userId: string) {
  return apiJson<{ id: string; email: string }>(`/v1/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export async function listAdminSubscriptions(input: {
  page: number;
  pageSize: number;
  q?: string;
  plan?: "free" | "starter" | "pro" | "business";
  excludeAdmin?: boolean;
}) {
  return apiJson<AdminSubscriptionsListResponse>(
    `/v1/admin/subscriptions${qs(input)}`,
  );
}

export async function updateAdminSubscription(
  workspaceId: string,
  body: {
    plan: "free" | "starter" | "pro" | "business";
    lifetime?: boolean;
    subscriptionStatus?: string | null;
    currentPeriodEnd?: string | null;
  },
) {
  return apiJson<{ subscription: AdminSubscriptionRow }>(
    `/v1/admin/subscriptions/${workspaceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function listAdminPayments(input: {
  page: number;
  pageSize: number;
  q?: string;
  status?: "pending" | "paid" | "failed" | "cancelled";
}) {
  return apiJson<AdminPaymentsListResponse>(`/v1/admin/payments${qs(input)}`);
}

export async function verifyAdminPayment(
  paymentId: string,
  opts?: { force?: boolean },
) {
  return apiJson<{ id: string; status: string; alreadyPaid?: boolean }>(
    `/v1/admin/payments/${paymentId}/verify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: opts?.force ?? false }),
    },
  );
}

export async function rejectAdminPayment(paymentId: string) {
  return apiJson<{ id: string; status: string }>(
    `/v1/admin/payments/${paymentId}/reject`,
    { method: "POST" },
  );
}

export type { AdminPaymentRow, AdminSubscriptionRow, AdminUserRow };
