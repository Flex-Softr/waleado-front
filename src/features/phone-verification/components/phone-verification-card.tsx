"use client";

import * as React from "react";
import { Loader2, LogOut, MessageCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendPhoneOtp, verifyPhoneOtp } from "@/features/phone-verification/lib/phone-verification-api";
import { useCountdown } from "@/features/phone-verification/components/use-countdown";
import { ApiError } from "@/lib/api";
import { normalizeBdPhone } from "@/lib/bd-phone";

const RESEND_SECONDS = 60;

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError ? e.message : fallback;
}

/** Two steps: send a code to a WhatsApp number, then enter it. */
export function PhoneVerificationCard({ onVerified }: { onVerified: () => void }) {
  const { user, logout } = useAuth();
  const [phone, setPhone] = React.useState(user?.phone ?? "");
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [resendAt, setResendAt] = React.useState<number | null>(null);
  const resendIn = useCountdown(resendAt);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const normalized = normalizeBdPhone(phone);
    if (!normalized) return;
    setBusy(true);
    try {
      const out = await sendPhoneOtp(normalized);
      setSentTo(out.phone);
      setCode("");
      setResendAt(Date.now() + RESEND_SECONDS * 1000);
      toast.success("Code sent on WhatsApp");
    } catch (err) {
      const wait = err instanceof ApiError ? Number(err.details?.retryAfterSeconds) : NaN;
      if (Number.isFinite(wait)) setResendAt(Date.now() + wait * 1000);
      toast.error(errorMessage(err, "Could not send the code."));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await verifyPhoneOtp(code.trim());
      toast.success("WhatsApp number verified");
      onVerified();
    } catch (err) {
      toast.error(errorMessage(err, "Could not verify the code."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-5 flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        <MessageCircle className="size-5" />
      </div>
      <h1 className="text-xl font-bold">Verify your WhatsApp number</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {sentTo
          ? `We sent a 6-digit code to ${sentTo} on WhatsApp.`
          : "We'll send a one-time code on WhatsApp. This keeps accounts genuine and lets us reach you about billing."}
      </p>

      {sentTo ? (
        <form className="mt-6 space-y-4" onSubmit={verify}>
          <div className="space-y-1.5">
            <Label htmlFor="otp-code">Verification code</Label>
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              className="text-center text-lg tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Verify
          </Button>
          <div className="flex justify-between text-sm">
            <button type="button" className="text-muted-foreground hover:underline" onClick={() => setSentTo(null)}>
              Change number
            </button>
            <button
              type="button"
              className="font-medium text-emerald-700 hover:underline disabled:text-muted-foreground disabled:no-underline dark:text-emerald-400"
              disabled={busy || resendIn > 0}
              onClick={() => void send()}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </form>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={send}>
          <div className="space-y-1.5">
            <Label htmlFor="otp-phone">WhatsApp number</Label>
            <Input
              id="otp-phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || resendIn > 0 || !phone.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {resendIn > 0 ? `Send code (${resendIn}s)` : "Send code"}
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={() => void logout()}
        className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground hover:underline"
      >
        <LogOut className="size-3.5" />
        Sign out
      </button>
    </div>
  );
}
