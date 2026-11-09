"use client";

import * as React from "react";
import { Copy, Loader2, ReceiptText, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { MarkPaidDialog } from "@/features/admin/invoices/mark-paid-dialog";
import {
  cancelAdminInvoice,
  listAdminInvoices,
  type AdminInvoiceFilters,
  type AdminInvoiceRow,
} from "@/features/admin/lib/admin-billing-api";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { useControlledPagination } from "@/hooks/use-pagination";
import { ApiError } from "@/lib/api";
import { formatBdt, type InvoiceKind, type InvoiceStatus } from "@/types/billing";

const STATUS_FILTERS: { value: InvoiceStatus | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const KIND_LABEL: Record<InvoiceKind, string> = {
  new: "New",
  renewal: "Renewal",
  upgrade: "Upgrade",
  topup: "Top-up",
};

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  unpaid: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  cancelled: "bg-muted text-muted-foreground",
};

type ListState = { key: string; rows: AdminInvoiceRow[]; total: number };

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function copyPayLink(token: string) {
  await navigator.clipboard.writeText(`${window.location.origin}/pay/${token}`);
  toast.success("Pay link copied");
}

export function AdminInvoicesClient() {
  const [filters, setFilters] = React.useState<AdminInvoiceFilters>({ page: 1, pageSize: 20 });
  const [searchText, setSearchText] = React.useState("");
  const [list, setList] = React.useState<ListState | null>(null);
  const [reloadTick, setReloadTick] = React.useState(0);
  const [markPaid, setMarkPaid] = React.useState<AdminInvoiceRow | null>(null);
  const [toCancel, setToCancel] = React.useState<AdminInvoiceRow | null>(null);

  const key = `${JSON.stringify(filters)}#${reloadTick}`;
  const reload = () => setReloadTick((t) => t + 1);

  React.useEffect(() => {
    let cancelled = false;
    listAdminInvoices(filters)
      .then((r) => !cancelled && setList({ key, rows: r.invoices, total: r.total }))
      .catch((e) => toast.error("Could not load invoices", { description: e instanceof ApiError ? e.message : undefined }));
    return () => {
      cancelled = true;
    };
  }, [filters, key]);

  const loading = list?.key !== key;
  const patch = (p: Partial<AdminInvoiceFilters>) => setFilters((f) => ({ ...f, page: 1, ...p }));
  const pagination = useControlledPagination({
    page: filters.page,
    pageSize: filters.pageSize,
    totalItems: list?.total ?? 0,
    onPageChange: (page) => setFilters((f) => ({ ...f, page })),
    onPageSizeChange: (pageSize) => patch({ pageSize }),
  });

  async function confirmCancel() {
    if (!toCancel) return;
    try {
      await cancelAdminInvoice(toCancel.id);
      toast.success(`Invoice ${toCancel.number} cancelled`);
      reload();
    } catch (e) {
      toast.error("Could not cancel", { description: e instanceof ApiError ? e.message : undefined });
      throw e;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        icon={ReceiptText}
        title="Invoices"
        description="Every plan and wallet invoice. Record manual payments or cancel stale invoices."
      >
        <div className="flex gap-1 rounded-lg border p-1">
          {STATUS_FILTERS.map((s) => (
            <Button
              key={s.label}
              size="sm"
              variant={filters.status === s.value ? "secondary" : "ghost"}
              onClick={() => patch({ status: s.value })}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            patch({ q: searchText.trim() || undefined });
          }}
        >
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Invoice, TrxID, workspace, email…"
            className="sm:w-64"
          />
          <Button type="submit" variant="secondary">
            <Search className="size-4" />
          </Button>
        </form>
      </AdminPageHeader>

      <Card className="overflow-hidden rounded-xl shadow-xs">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : list.rows.length === 0 ? (
            <div className="p-8">
              <ListEmptyState icon={ReceiptText} title="No invoices" description="Try another filter or search." />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Due / paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.rows.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <p className="font-mono text-xs font-medium">{inv.number}</p>
                        <p className="text-xs text-muted-foreground">{shortDate(inv.createdAt)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[180px] truncate text-sm font-medium">{inv.workspace.name}</p>
                        <p className="max-w-[180px] truncate text-xs text-muted-foreground">{inv.owner?.email ?? "—"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[220px] truncate text-sm">{inv.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {KIND_LABEL[inv.kind]}
                          {inv.couponCode ? ` · ${inv.couponCode}` : ""}
                          {inv.walletAmount > 0 ? ` · wallet ${formatBdt(inv.walletAmount)}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">{formatBdt(inv.total)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_CLASS[inv.status]}>{inv.status}</Badge>
                        {inv.status === "paid" ? (
                          <p className="mt-1 max-w-[140px] truncate text-xs text-muted-foreground">
                            {inv.gateway ?? "—"}
                            {inv.paymentRef ? ` · ${inv.paymentRef}` : ""}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {inv.status === "unpaid" ? (
                          <div className="flex justify-end gap-1">
                            {inv.payToken ? (
                              <Button size="sm" variant="ghost" title="Copy pay link" onClick={() => void copyPayLink(inv.payToken!)}>
                                <Copy className="size-4" />
                              </Button>
                            ) : null}
                            <Button size="sm" variant="outline" onClick={() => setMarkPaid(inv)}>
                              Mark paid
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setToCancel(inv)}>
                              Cancel
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t px-4 py-3">
                <TablePagination {...pagination} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <MarkPaidDialog invoice={markPaid} onClose={() => setMarkPaid(null)} onDone={reload} />
      <ConfirmDestructiveDialog
        open={toCancel !== null}
        onOpenChange={(open) => !open && setToCancel(null)}
        title={`Cancel invoice ${toCancel?.number ?? ""}?`}
        description="Its pay link stops working and any wallet money it reserved goes back to the customer's wallet."
        confirmLabel="Cancel invoice"
        onConfirm={confirmCancel}
      />
    </div>
  );
}
