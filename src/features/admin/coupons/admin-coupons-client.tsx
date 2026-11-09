"use client";

import * as React from "react";
import { Loader2, Plus, TicketPercent } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { CouponFormDialog } from "@/features/admin/coupons/coupon-form-dialog";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  listAdminCoupons,
  updateAdminCoupon,
  type AdminCoupon,
  type AdminCouponInput,
} from "@/features/admin/lib/admin-billing-api";
import { ConfirmDestructiveDialog } from "@/features/shared/components/confirm-destructive-dialog";
import { ListEmptyState } from "@/features/shared/components/list-empty-state";
import { ApiError } from "@/lib/api";
import { cycleLabel, formatBdt } from "@/types/billing";

function discountText(c: AdminCoupon): string {
  return c.discountType === "PERCENT" ? `${c.discountValue}% off` : `${formatBdt(c.discountValue)} off`;
}

function scopeText(c: AdminCoupon): string {
  const plans = c.planIds.length ? c.planIds.join(", ") : "all plans";
  const cycles = c.cycles.length ? c.cycles.map(cycleLabel).join(", ") : "all cycles";
  return `${plans} · ${cycles}`;
}

function validityText(c: AdminCoupon): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (c.startsAt && c.expiresAt) return `${fmt(c.startsAt)} – ${fmt(c.expiresAt)}`;
  if (c.expiresAt) return `until ${fmt(c.expiresAt)}`;
  if (c.startsAt) return `from ${fmt(c.startsAt)}`;
  return "no end date";
}

function errorToast(title: string, e: unknown) {
  toast.error(title, { description: e instanceof ApiError ? e.message : undefined });
}

export function AdminCouponsClient() {
  const [coupons, setCoupons] = React.useState<AdminCoupon[] | null>(null);
  /** undefined = closed, null = creating, coupon = editing */
  const [editing, setEditing] = React.useState<AdminCoupon | null | undefined>(undefined);
  const [toDelete, setToDelete] = React.useState<AdminCoupon | null>(null);

  React.useEffect(() => {
    listAdminCoupons()
      .then((r) => setCoupons(r.coupons))
      .catch((e) => errorToast("Could not load coupons", e));
  }, []);

  async function save(input: AdminCouponInput) {
    try {
      const r = editing ? await updateAdminCoupon(editing.id, input) : await createAdminCoupon(input);
      setCoupons(r.coupons);
      toast.success(editing ? "Coupon saved" : `Coupon ${input.code.toUpperCase()} created`);
    } catch (e) {
      errorToast("Could not save coupon", e);
      throw e;
    }
  }

  async function remove() {
    if (!toDelete) return;
    try {
      const r = await deleteAdminCoupon(toDelete.id);
      setCoupons(r.coupons);
      toast.success(r.deleted ? "Coupon deleted" : "Coupon was used before, so it was deactivated instead");
    } catch (e) {
      errorToast("Could not delete coupon", e);
      throw e;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AdminPageHeader
        icon={TicketPercent}
        title="Coupons"
        description="Discount codes for campaigns and founding members. Share /register?coupon=CODE with new users or /billing?coupon=CODE with existing ones."
      >
        <Button onClick={() => setEditing(null)}>
          <Plus className="size-4" />
          New coupon
        </Button>
      </AdminPageHeader>

      <Card className="overflow-hidden rounded-xl shadow-xs">
        <CardContent className="p-0">
          {coupons === null ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : coupons.length === 0 ? (
            <div className="p-8">
              <ListEmptyState icon={TicketPercent} title="No coupons yet" description="Create one to run a campaign." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id} className={c.isActive ? undefined : "opacity-60"}>
                    <TableCell>
                      <p className="font-mono font-semibold">{c.code}</p>
                      <p className="max-w-[200px] truncate text-xs text-muted-foreground">{c.description ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {discountText(c)}
                        {c.duration === "FOREVER" ? (
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            Forever
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">{scopeText(c)}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.isActive ? validityText(c) : "Inactive"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {c.redemptions}
                      {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                      {c.totalDiscount > 0 ? (
                        <p className="text-xs text-muted-foreground">{formatBdt(c.totalDiscount)} given</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(c)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CouponFormDialog coupon={editing} onClose={() => setEditing(undefined)} onSubmit={save} />
      <ConfirmDestructiveDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete coupon ${toDelete?.code ?? ""}?`}
        description="Unused coupons are deleted. Coupons that were already used are deactivated so old invoices keep their history."
        confirmLabel="Delete"
        onConfirm={remove}
      />
    </div>
  );
}
