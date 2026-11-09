"use client";

import * as React from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { fetchAdminBillingReport, type AdminBillingReport } from "@/features/admin/lib/admin-billing-api";
import { RevenueChart } from "@/features/admin/reports/revenue-chart";
import { ApiError } from "@/lib/api";
import { formatBdt, PLAN_IDS, PLAN_LABELS } from "@/types/billing";

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function AdminReportsClient() {
  const [report, setReport] = React.useState<AdminBillingReport | null>(null);

  React.useEffect(() => {
    fetchAdminBillingReport()
      .then(setReport)
      .catch((e) => toast.error("Could not load report", { description: e instanceof ApiError ? e.message : undefined }));
  }, []);

  if (!report) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalWorkspaces = PLAN_IDS.reduce((n, id) => n + (report.workspacesByPlan[id] ?? 0), 0);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        icon={BarChart3}
        title="Billing reports"
        description="Cash collected, recurring revenue and how sign-ups convert. Amounts in BDT."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="MRR"
          value={formatBdt(report.mrr)}
          sub={`${report.activePaidPeriods} running paid plans (monthly equivalent)`}
        />
        <StatTile
          label="Collected this month"
          value={formatBdt(report.cashThisMonth)}
          sub={`${report.paidInvoicesThisMonth} paid invoices, top-ups included`}
        />
        <StatTile
          label="Conversion (90 days)"
          value={`${report.conversion90d.rate}%`}
          sub={`${report.conversion90d.paid} of ${report.conversion90d.signups} new workspaces paid`}
        />
        <StatTile
          label="Lifetime deals (12 mo)"
          value={formatBdt(report.lifetimeRevenue)}
          sub={`${report.lifetimeSales} sold`}
        />
        <StatTile
          label="Customer wallets"
          value={formatBdt(report.walletBalanceTotal)}
          sub="Prepaid balance held for customers"
        />
        <StatTile
          label="Coupon discounts"
          value={formatBdt(report.coupons.totalDiscount)}
          sub={`${report.coupons.redemptions} redemptions`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Collected per month</CardTitle>
            <CardDescription className="text-xs">Last 12 months, gateway and manual payments</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <RevenueChart data={report.revenueByMonth} />
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Workspaces by plan</CardTitle>
            <CardDescription className="text-xs">{totalWorkspaces} workspaces in total</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {PLAN_IDS.map((id) => (
                  <tr key={id} className="border-b last:border-0">
                    <td className="py-2.5">{PLAN_LABELS[id]}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums">{report.workspacesByPlan[id] ?? 0}</td>
                    <td className="py-2.5 pl-3 text-right text-xs text-muted-foreground">
                      {report.lifetimeOwnersByPlan[id] ? `${report.lifetimeOwnersByPlan[id]} lifetime` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
