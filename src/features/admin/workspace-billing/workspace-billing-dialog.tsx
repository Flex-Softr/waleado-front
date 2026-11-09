"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchWorkspaceBilling, type WorkspaceBillingDetail } from "@/features/admin/lib/admin-billing-api";
import {
  ExtendPeriodForm,
  ManualPaymentForm,
  WalletAdjustForm,
} from "@/features/admin/workspace-billing/workspace-billing-forms";
import { ApiError } from "@/lib/api";
import { formatBdt } from "@/types/billing";

type Target = { workspaceId: string; name: string };

const AUDIT_LABEL: Record<string, string> = {
  "workspace.extend_period": "Period changed",
  "wallet.adjust": "Wallet adjusted",
  "invoice.mark_paid": "Invoice marked paid",
  "invoice.cancel": "Invoice cancelled",
  "invoice.create_manual": "Manual invoice",
};

/** The human part of an audit entry's detail (reason / note / payment ref), if any. */
function auditNote(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const d = detail as Record<string, unknown>;
  const text = d.reason ?? d.note ?? d.paymentRef;
  return typeof text === "string" ? text : null;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Wallet, coupons, manual payments and period corrections for one workspace. */
export function WorkspaceBillingDialog({
  target,
  onClose,
  onChanged,
}: {
  target: Target | null;
  onClose: () => void;
  /** Called after any change so the parent list can refresh (plan / period end). */
  onChanged: () => void;
}) {
  const [detail, setDetail] = React.useState<{ id: string; data: WorkspaceBillingDetail } | null>(null);
  const [tick, setTick] = React.useState(0);
  const workspaceId = target?.workspaceId ?? null;

  React.useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    fetchWorkspaceBilling(workspaceId)
      .then((data) => !cancelled && setDetail({ id: workspaceId, data }))
      .catch((e) => toast.error("Could not load billing", { description: e instanceof ApiError ? e.message : undefined }));
    return () => {
      cancelled = true;
    };
  }, [workspaceId, tick]);

  const data = detail && detail.id === workspaceId ? detail.data : null;
  const refresh = () => {
    setTick((t) => t + 1);
    onChanged();
  };

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{target?.name} — billing</DialogTitle>
          <DialogDescription>Every change here is written to the audit log below.</DialogDescription>
        </DialogHeader>

        {!data || !workspaceId ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">Wallet {formatBdt(data.walletBalance)}</Badge>
              <Badge variant="outline">Auto-renew {data.autoRenew ? "on" : "off"}</Badge>
              {data.lockedCoupon ? <Badge variant="outline">Forever coupon {data.lockedCoupon}</Badge> : null}
            </div>

            <ManualPaymentForm workspaceId={workspaceId} onDone={refresh} />
            <div className="grid gap-3 md:grid-cols-2">
              <ExtendPeriodForm workspaceId={workspaceId} onDone={refresh} />
              <WalletAdjustForm workspaceId={workspaceId} onDone={refresh} />
            </div>

            <section>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Wallet history</p>
              {data.walletTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No wallet activity.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {data.walletTransactions.map((t) => (
                    <li key={t.id} className="flex justify-between gap-3 py-1.5">
                      <span className="min-w-0 truncate">
                        {t.note ?? t.type}
                        <span className="ml-2 text-xs text-muted-foreground">{shortDate(t.createdAt)}</span>
                      </span>
                      <span className={t.amount >= 0 ? "text-emerald-700 dark:text-emerald-400" : undefined}>
                        {t.amount >= 0 ? "+" : "−"}
                        {formatBdt(Math.abs(t.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Audit log</p>
              {data.audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">No admin actions yet.</p>
              ) : (
                <ul className="divide-y text-sm">
                  {data.audit.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3 py-1.5">
                      <span className="min-w-0 truncate">
                        {AUDIT_LABEL[a.action] ?? a.action}
                        {auditNote(a.detail) ? (
                          <span className="ml-2 text-xs text-muted-foreground">{auditNote(a.detail)}</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">{shortDate(a.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
