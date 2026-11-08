"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchInvoice } from "@/features/billing/lib/billing-api";
import { ApiError } from "@/lib/api";
import { cycleLabel, formatBdt, type BillingInvoiceDetail } from "@/types/billing";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

/** Printable invoice (no dashboard chrome, so "Print → Save as PDF" looks clean). */
export function InvoiceView() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = React.useState<BillingInvoiceDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!params?.id) return;
    fetchInvoice(params.id)
      .then((r) => setInvoice(r.invoice))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Invoice not found"));
  }, [params?.id]);

  if (error) {
    return <p className="p-10 text-center text-sm text-muted-foreground">{error}</p>;
  }
  if (!invoice) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const paid = invoice.status === "paid";
  const credit = Math.min(invoice.credit, invoice.subtotal);

  return (
    <div className="min-h-screen bg-muted/40 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Button variant="ghost" render={<Link href="/billing" />}>
          <ArrowLeft className="size-4" />
          Back to billing
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / Save PDF
        </Button>
      </div>

      <article className="mx-auto max-w-3xl rounded-xl border bg-white p-8 text-slate-900 shadow-sm sm:p-12 print:rounded-none print:border-0 print:shadow-none">
        <header className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <p className="text-2xl font-extrabold tracking-tight text-emerald-700">Waleado</p>
            <p className="text-sm text-slate-500">WhatsApp automation · waleado.app</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xl font-bold">INVOICE</p>
            <p className="font-mono text-sm">{invoice.number}</p>
            <p
              className={
                "mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase " +
                (paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")
              }
            >
              {invoice.status}
            </p>
          </div>
        </header>

        <section className="mt-10 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Billed to</p>
            <p className="font-semibold">{invoice.billedTo.name ?? invoice.billedTo.workspace}</p>
            <p>{invoice.billedTo.workspace}</p>
            {invoice.billedTo.email ? <p>{invoice.billedTo.email}</p> : null}
            {invoice.billedTo.phone ? <p>{invoice.billedTo.phone}</p> : null}
          </div>
          <div className="sm:text-right">
            <p>
              <span className="text-slate-500">Issued: </span>
              {fmt(invoice.createdAt)}
            </p>
            {invoice.paidAt ? (
              <p>
                <span className="text-slate-500">Paid: </span>
                {fmt(invoice.paidAt)}
              </p>
            ) : null}
            {invoice.gateway ? (
              <p>
                <span className="text-slate-500">Method: </span>
                <span className="capitalize">{invoice.gateway}</span>
              </p>
            ) : null}
          </div>
        </section>

        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left">
              <th className="py-2">Description</th>
              <th className="py-2">Period</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-3">
                <p className="font-semibold">{invoice.description}</p>
                <p className="text-xs text-slate-500">{cycleLabel(invoice.months)}</p>
              </td>
              <td className="py-3">
                {invoice.isLifetime
                  ? "Lifetime"
                  : invoice.periodStart
                  ? `${fmt(invoice.periodStart)} – ${fmt(invoice.periodEnd)}`
                  : "Starts on payment"}
              </td>
              <td className="py-3 text-right">{formatBdt(invoice.subtotal)}</td>
            </tr>
          </tbody>
        </table>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd>{formatBdt(invoice.subtotal)}</dd>
          </div>
          {credit > 0 ? (
            <div className="flex justify-between">
              <dt className="text-slate-500">Credit from previous plan</dt>
              <dd>−{formatBdt(credit)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-bold">
            <dt>Total ({invoice.currency})</dt>
            <dd>{formatBdt(invoice.total)}</dd>
          </div>
        </dl>

        <footer className="mt-12 border-t pt-4 text-xs text-slate-500">
          Thank you for using Waleado. Questions about this invoice? Reply to your receipt email or contact support.
        </footer>
      </article>
    </div>
  );
}
