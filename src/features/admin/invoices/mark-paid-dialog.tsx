"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markAdminInvoicePaid, type AdminInvoiceRow } from "@/features/admin/lib/admin-billing-api";
import { ApiError } from "@/lib/api";
import { formatBdt } from "@/types/billing";

/** Records a payment received outside the gateways (e.g. personal bKash) against an invoice. */
export function MarkPaidDialog({
  invoice,
  onClose,
  onDone,
}: {
  invoice: AdminInvoiceRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [paymentRef, setPaymentRef] = React.useState("");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    setBusy(true);
    try {
      await markAdminInvoicePaid(invoice.id, { paymentRef: paymentRef.trim(), note: note.trim() || null });
      toast.success(`Invoice ${invoice.number} marked paid`);
      setPaymentRef("");
      setNote("");
      onDone();
      onClose();
    } catch (err) {
      toast.error("Could not mark paid", { description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Mark {invoice?.number} as paid</DialogTitle>
            <DialogDescription>
              {invoice ? `${invoice.workspace.name} · ${formatBdt(invoice.total)}. ` : null}
              The plan or wallet is applied immediately and the customer gets a receipt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="mark-paid-ref">Payment reference (bKash TrxID, bank ref…)</Label>
            <Input id="mark-paid-ref" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mark-paid-note">Note (optional)</Label>
            <Input id="mark-paid-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !paymentRef.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Mark paid
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
