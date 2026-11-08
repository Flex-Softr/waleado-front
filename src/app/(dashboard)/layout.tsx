import { SubscriptionProvider } from "@/features/billing/subscription-context";
import { RequireSubscription } from "@/features/billing/components/require-subscription";
import { UpgradePromptListener } from "@/features/billing/components/upgrade-prompt";
import { ContactsProvider } from "@/features/contacts/contacts-provider";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { DashboardShell } from "@/features/layout/components/dashboard-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ContactsProvider>
        <SubscriptionProvider>
          <RequireSubscription>
            <DashboardShell>{children}</DashboardShell>
            <UpgradePromptListener />
          </RequireSubscription>
        </SubscriptionProvider>
      </ContactsProvider>
    </RequireAuth>
  );
}
