import Link from "next/link";

/** Minimal branded frame for the public payment pages (no dashboard, no login). */
export function PayShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-6 block text-center text-2xl font-extrabold tracking-tight text-emerald-700">
          Waleado
        </Link>
        <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-slate-500">Secure payment · SSLCommerz / Stripe</p>
      </div>
    </div>
  );
}
