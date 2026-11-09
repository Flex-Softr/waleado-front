import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import type { AdminBillingReport } from "@/features/admin/lib/admin-billing-api";
import type { PlanDraft } from "@/features/admin/pricing/pricing-draft";
import { formatBdt } from "@/types/billing";

/** How many workspaces are on each plan, for context while editing prices. */
export function PlanCountsRow({
  report,
  plans,
}: {
  report: AdminBillingReport;
  plans: PlanDraft[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {plans.map((p) => (
        <Card key={p.id} className="rounded-xl">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {p.name}
            </p>
            <p className="mt-1 text-2xl font-extrabold">
              {report.workspacesByPlan[p.id] ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              workspaces
              {report.lifetimeOwnersByPlan[p.id]
                ? ` · ${report.lifetimeOwnersByPlan[p.id]} lifetime`
                : ""}
            </p>
          </CardContent>
        </Card>
      ))}
      <Card className="rounded-xl">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Collected this month
          </p>
          <p className="mt-1 text-2xl font-extrabold">
            {formatBdt(report.cashThisMonth)}
          </p>
          <Link
            href="/admin/reports"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            {report.paidInvoicesThisMonth} paid invoices · full report
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
