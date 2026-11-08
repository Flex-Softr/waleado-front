import { RequireAuth } from "@/features/auth/components/require-auth";
import { InvoiceView } from "@/features/billing/components/invoice-view";

export default function InvoicePage() {
  return (
    <RequireAuth>
      <InvoiceView />
    </RequireAuth>
  );
}
