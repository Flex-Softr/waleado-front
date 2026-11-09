"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchInvoice } from "@/features/billing/lib/billing-api";
import { ApiError } from "@/lib/api";
import { InvoiceDocument } from "@/features/billing/components/invoice-document";
import type { BillingInvoiceDetail } from "@/types/billing";

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

      <InvoiceDocument invoice={invoice} />
    </div>
  );
}
