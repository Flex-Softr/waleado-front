"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { useSubscription } from "@/features/billing/subscription-context";

/**
 * Waits for the billing snapshot before rendering the dashboard. Accounts are never
 * locked out anymore: when a trial or paid period ends the workspace continues on Free,
 * and individual features show an upgrade prompt instead.
 */
export function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { isBootstrapping: authBootstrapping } = useAuth();
  const { hydrated } = useSubscription();

  if (authBootstrapping || !hydrated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 className="size-8 animate-spin text-foreground dark:text-muted-foreground" />
        <p className="text-sm">Loading your plan…</p>
      </div>
    );
  }

  return <>{children}</>;
}
