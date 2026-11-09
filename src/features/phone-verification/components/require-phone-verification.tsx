"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { fetchPhoneVerification } from "@/features/phone-verification/lib/phone-verification-api";
import { PhoneVerificationCard } from "@/features/phone-verification/components/phone-verification-card";

type GateState = "checking" | "required" | "ok";

/**
 * Shows the WhatsApp OTP screen instead of the dashboard until the user has verified a number
 * (when the platform requires it). If the check itself fails we let the user in; the API still
 * enforces verification on protected actions.
 */
export function RequirePhoneVerification({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<GateState>("checking");

  React.useEffect(() => {
    let cancelled = false;
    fetchPhoneVerification()
      .then((s) => !cancelled && setState(s.required && !s.verified ? "required" : "ok"))
      .catch(() => !cancelled && setState("ok"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (state === "required") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <PhoneVerificationCard onVerified={() => setState("ok")} />
      </div>
    );
  }
  return <>{children}</>;
}
