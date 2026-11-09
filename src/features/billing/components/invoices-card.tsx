"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/use-pagination";
import { formatBdt, type BillingInvoice } from "@/types/billing";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Amount shown per row: what the item cost after discounts, however it was paid (card or wallet). */
function rowAmount(inv: BillingInvoice): number {
  return inv.kind === "topup" ? inv.subtotal : inv.total + inv.walletAmount;
}

export function InvoicesCard({ invoices }: { invoices: BillingInvoice[] }) {
  const pagination = usePagination({ totalItems: invoices.length });
  const pageRows = pagination.slice(invoices);

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="size-5" />
          Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Invoice</th>
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">Description</th>
                    <th className="py-2 pr-3 text-right font-semibold">Amount</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 font-mono text-xs whitespace-nowrap">{inv.number}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{shortDate(inv.paidAt ?? inv.createdAt)}</td>
                      <td className="py-2.5 pr-3">{inv.description}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold whitespace-nowrap">
                        {formatBdt(rowAmount(inv))}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge
                          variant={inv.status === "paid" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="space-x-3 py-2.5 text-right whitespace-nowrap">
                        {inv.payToken ? (
                          <Link href={`/pay/${inv.payToken}`} className="text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400">
                            Pay now
                          </Link>
                        ) : null}
                        <Link href={`/invoice/${inv.id}`} target="_blank" rel="noopener" className="text-sm font-medium underline-offset-4 hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination {...pagination} className="mt-2 bg-transparent px-0 sm:px-0" />
          </>
        )}
      </CardContent>
    </Card>
  );
}
