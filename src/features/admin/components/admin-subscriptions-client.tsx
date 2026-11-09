"use client";

import * as React from "react";
import { CreditCard, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import {
  listAdminSubscriptions,
  updateAdminSubscription,
} from "@/features/admin/lib/admin-api";
import { WorkspaceBillingDialog } from "@/features/admin/workspace-billing/workspace-billing-dialog";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import type { AdminSubscriptionRow } from "@/types/admin-api";
import { ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { useControlledPagination } from "@/hooks/use-pagination";

type PlanId = "free" | "starter" | "pro" | "business";

/** Select value: plan id, optionally suffixed with ":lifetime". */
type PlanChoice = PlanId | `${Exclude<PlanId, "free">}:lifetime`;

const PLAN_CHOICES: { value: PlanChoice; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter (30 days)" },
  { value: "pro", label: "Pro (30 days)" },
  { value: "business", label: "Business (30 days)" },
  { value: "starter:lifetime", label: "Starter — lifetime" },
  { value: "pro:lifetime", label: "Pro — lifetime" },
  { value: "business:lifetime", label: "Business — lifetime" },
];

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function planBadgeClass(plan: PlanId) {
  if (plan === "business") {
    return "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200";
  }
  if (plan === "pro") {
    return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
}

export function AdminSubscriptionsClient() {
  const [q, setQ] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [planFilter, setPlanFilter] = React.useState<PlanId | "all">("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [total, setTotal] = React.useState(0);
  const [rows, setRows] = React.useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [planTarget, setPlanTarget] = React.useState<{
    row: AdminSubscriptionRow;
    plan: PlanId;
    lifetime: boolean;
  } | null>(null);
  const [billingTarget, setBillingTarget] = React.useState<AdminSubscriptionRow | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminSubscriptions({
        page,
        pageSize,
        q: search || undefined,
        plan: planFilter === "all" ? undefined : planFilter,
        excludeAdmin: true,
      });
      const filtered = data.subscriptions.filter(
        (sub) => sub.owner?.role !== "ADMIN"
      );
      setRows(filtered);
      setTotal(Math.max(0, data.total - (data.subscriptions.length - filtered.length)));
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not load subscriptions.";
      toast.error("Subscriptions load failed", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, planFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const pagination = useControlledPagination({
    page,
    pageSize,
    totalItems: total,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  async function confirmPlanChange() {
    if (!planTarget) return;
    try {
      await updateAdminSubscription(planTarget.row.workspaceId, {
        plan: planTarget.plan,
        lifetime: planTarget.lifetime,
      });
      toast.success("Subscription updated", {
        description: `${planTarget.row.name} → ${planTarget.plan.toUpperCase()}${planTarget.lifetime ? " (lifetime)" : ""}`,
      });
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not update subscription.";
      toast.error("Update failed", { description: msg });
      throw err;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
              <CreditCard className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Subscriptions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review workspace plans and override when needed.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={planFilter}
              onValueChange={(v) => {
                setPage(1);
                setPlanFilter((v as PlanId | "all") ?? "all");
              }}
              items={[
                { value: "all", label: "All plans" },
                { value: "free", label: "Free" },
                { value: "starter", label: "Starter" },
                { value: "pro", label: "Pro" },
                { value: "business", label: "Business" },
              ]}
            >
              <SelectTrigger className="w-full min-w-[140px] sm:w-[160px]">
                <SelectValue placeholder="Plan filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
            <form
              className="flex w-full max-w-md gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setSearch(q.trim());
              }}
            >
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search workspace or owner…"
              />
              <Button type="submit" variant="secondary">
                <Search className="size-4" />
                Search
              </Button>
            </form>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
              <p className="text-sm">Loading subscriptions…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8">
              <ListEmptyState
                icon={CreditCard}
                title="No subscriptions found"
                description="Try another filter or search term."
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Period end</TableHead>
                    <TableHead className="text-right">Set plan</TableHead>
                    <TableHead className="text-right">Billing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.workspaceId}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.owner ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm">
                              {row.owner.name || "—"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.owner.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={planBadgeClass(row.plan)}>
                          {row.plan.toUpperCase()}
                        </Badge>
                        {row.lifetimePlan ? (
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            Lifetime {row.lifetimePlan}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.subscriptionStatus || "—"}
                        {row.lastPaymentGateway
                          ? ` · ${row.lastPaymentGateway}`
                          : ""}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(row.currentPeriodEnd)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={(row.lifetimePlan === row.plan && row.plan !== "free"
                            ? `${row.plan}:lifetime`
                            : row.plan) as PlanChoice}
                          onValueChange={(v) => {
                            const choice = v as PlanChoice | null;
                            if (!choice) return;
                            const [plan, life] = choice.split(":") as [PlanId, string | undefined];
                            setPlanTarget({ row, plan, lifetime: life === "lifetime" });
                          }}
                          items={PLAN_CHOICES}
                        >
                          <SelectTrigger size="sm" className="ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PLAN_CHOICES.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setBillingTarget(row)}>
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t border-border px-4 py-3">
                <TablePagination {...pagination} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <WorkspaceBillingDialog
        target={billingTarget ? { workspaceId: billingTarget.workspaceId, name: billingTarget.name } : null}
        onClose={() => setBillingTarget(null)}
        onChanged={() => void load()}
      />

      <ConfirmDestructiveDialog
        open={!!planTarget}
        onOpenChange={(open) => {
          if (!open) setPlanTarget(null);
        }}
        title="Change subscription plan?"
        description={
          planTarget
            ? `Set “${planTarget.row.name}” from ${planTarget.row.plan.toUpperCase()} to ${planTarget.plan.toUpperCase()}${planTarget.lifetime ? " for life" : planTarget.plan === "free" ? " (removes any lifetime plan)" : " for 30 days"}.`
            : null
        }
        confirmLabel="Update plan"
        destructive={planTarget?.plan === "free"}
        onConfirm={confirmPlanChange}
      />
    </div>
  );
}
