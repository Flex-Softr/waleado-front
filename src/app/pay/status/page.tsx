import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { PayShell } from "@/features/pay/components/pay-shell";

const RESULTS = {
  success: { ok: true, title: "Payment received", text: "Thank you! Your invoice is paid and a receipt is on its way." },
  failed: { ok: false, title: "Payment failed", text: "Nothing was charged. Open the payment link again to retry." },
  cancelled: { ok: false, title: "Payment cancelled", text: "You cancelled the payment. Open the payment link again whenever you're ready." },
} as const;

/** Where gateways send people back after paying from a login-free link. */
export default async function PayStatusPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const { result } = await searchParams;
  const view = RESULTS[result as keyof typeof RESULTS] ?? RESULTS.failed;
  const Icon = view.ok ? CheckCircle2 : XCircle;
  return (
    <PayShell>
      <div className="text-center">
        <Icon className={`mx-auto size-12 ${view.ok ? "text-emerald-600" : "text-rose-500"}`} />
        <h1 className="mt-3 text-xl font-bold">{view.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{view.text}</p>
        <Link href="/billing" className="mt-6 inline-block text-sm text-slate-600 underline-offset-4 hover:underline">
          Go to my billing page
        </Link>
      </div>
    </PayShell>
  );
}
