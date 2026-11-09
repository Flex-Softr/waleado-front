import { cycleLabel, formatBdt, type BillingInvoiceDetail } from "@/types/billing";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function periodText(invoice: BillingInvoiceDetail): string {
  if (invoice.kind === "topup") return "—";
  if (invoice.isLifetime) return "Lifetime";
  if (invoice.periodStart) return `${fmt(invoice.periodStart)} – ${fmt(invoice.periodEnd)}`;
  return "Starts on payment";
}

/** The invoice itself, styled for print. Shared by the account invoice page and the public pay page. */
export function InvoiceDocument({ invoice }: { invoice: BillingInvoiceDetail }) {
  const paid = invoice.status === "paid";
  const credit = Math.min(invoice.credit, invoice.subtotal - invoice.discount);

  return (
    <article className="mx-auto max-w-3xl rounded-xl border bg-white p-6 text-slate-900 shadow-sm sm:p-12 print:rounded-none print:border-0 print:shadow-none">
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
          {invoice.paymentRef ? (
            <p>
              <span className="text-slate-500">Reference: </span>
              <span className="font-mono">{invoice.paymentRef}</span>
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
              <p className="text-xs text-slate-500">
                {invoice.kind === "topup" ? "Wallet top-up" : cycleLabel(invoice.months)}
              </p>
            </td>
            <td className="py-3">{periodText(invoice)}</td>
            <td className="py-3 text-right">{formatBdt(invoice.subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5 text-sm">
        <SummaryRow label="Subtotal" value={formatBdt(invoice.subtotal)} />
        {invoice.discount > 0 ? (
          <SummaryRow
            label={invoice.couponCode ? `Coupon ${invoice.couponCode}` : "Discount"}
            value={`−${formatBdt(invoice.discount)}`}
          />
        ) : null}
        {credit > 0 ? <SummaryRow label="Credit from previous plan" value={`−${formatBdt(credit)}`} /> : null}
        {invoice.walletAmount > 0 ? (
          <SummaryRow label="Paid from wallet" value={`−${formatBdt(invoice.walletAmount)}`} />
        ) : null}
        <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base font-bold">
          <dt>
            {paid ? "Paid" : "Amount due"} ({invoice.currency})
          </dt>
          <dd>{formatBdt(invoice.total)}</dd>
        </div>
      </dl>

      <footer className="mt-12 border-t pt-4 text-xs text-slate-500">
        Thank you for using Waleado. Questions about this invoice? Reply to your receipt email or contact support.
      </footer>
    </article>
  );
}
