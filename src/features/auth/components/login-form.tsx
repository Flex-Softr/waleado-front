"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";

import {
  AuthFieldLabel,
  AuthIconInput,
  AuthPasswordField,
} from "@/features/auth/components/auth-form-primitives";
import { GoogleBrandIcon } from "@/features/auth/components/google-brand-icon";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  buildGoogleOAuthStartUrl,
  forgotPasswordRequest,
  resetPasswordRequest,
} from "@/lib/auth-api";
import { isSafeInternalPath } from "@/lib/safe-redirect";

function homePathForRole(role?: string | null): string {
  return role === "ADMIN" ? "/admin" : "/";
}

type LoginMode = "signin" | "forgot" | "reset";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isBootstrapping } = useAuth();
  const resetToken = searchParams.get("resetToken") || searchParams.get("token");

  React.useEffect(() => {
    if (!isBootstrapping && user && !resetToken) {
      const next = searchParams.get("next");
      router.replace(
        isSafeInternalPath(next) ? next : homePathForRole(user.role)
      );
    }
  }, [isBootstrapping, user, router, searchParams, resetToken]);

  const [mode, setMode] = React.useState<LoginMode>(
    resetToken ? "reset" : "signin"
  );
  const [activeToken, setActiveToken] = React.useState<string | null>(resetToken);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [devResetUrl, setDevResetUrl] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (resetToken) {
      setActiveToken(resetToken);
      setMode("reset");
    }
  }, [resetToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "forgot") {
      await onForgotPassword();
      return;
    }
    if (mode === "reset") {
      await onResetPassword();
      return;
    }

    setPending(true);
    try {
      const session = await login(email, password);
      toast.success("Signed in");
      const next = searchParams.get("next");
      router.replace(
        isSafeInternalPath(next) ? next : homePathForRole(session.user.role)
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not sign in. Try again.";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  async function onForgotPassword() {
    setPending(true);
    setDevResetUrl(null);
    try {
      const out = await forgotPasswordRequest(email);
      if (out.resetUrl) {
        setDevResetUrl(out.resetUrl);
      }
      if (out.emailDelivered) {
        toast.success("Check your email", {
          description:
            "A password reset link has been sent to your email address.",
        });
      } else {
        toast.info("Password reset link ready", {
          description: out.resetUrl
            ? "Click the reset link below to set your new password."
            : "If that account exists, a password reset link has been processed.",
        });
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not request a password reset.";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  async function onResetPassword() {
    const effectiveToken = activeToken || resetToken;
    if (!effectiveToken) {
      toast.error("Reset link is missing a token.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      await resetPasswordRequest({ token: effectiveToken, password });
      toast.success("Password updated", {
        description: "You can sign in with your new password now.",
      });
      setPassword("");
      setConfirmPassword("");
      setActiveToken(null);
      setDevResetUrl(null);
      router.replace("/login");
      setMode("signin");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not reset your password.";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  const heading =
    mode === "forgot"
      ? "Reset password"
      : mode === "reset"
        ? "Set new password"
        : "Sign in";
  const subheading =
    mode === "forgot"
      ? "Enter your account email and we will send a password reset link."
      : mode === "reset"
        ? "Choose a new password for your Waleado account."
        : "Welcome back — use your Waleado account to open the dashboard.";

  return (
    <div className="w-full">
      <div className="mb-8 space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {heading}
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {subheading}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {mode !== "reset" ? (
          <div className="space-y-2">
            <AuthFieldLabel htmlFor="email">Email address</AuthFieldLabel>
            <AuthIconInput
              id="email"
              type="email"
              autoComplete="email"
              required
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
        ) : null}

        {mode !== "forgot" ? (
          <div className="space-y-2">
            <AuthFieldLabel htmlFor="password">
              {mode === "reset" ? "New password" : "Password"}
            </AuthFieldLabel>
            <AuthPasswordField
              id="password"
              autoComplete={mode === "reset" ? "new-password" : "current-password"}
              required
              minLength={mode === "reset" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === "reset" ? "At least 8 characters" : "Enter your password"
              }
            />
          </div>
        ) : null}

        {mode === "reset" ? (
          <div className="space-y-2">
            <AuthFieldLabel htmlFor="confirmPassword">
              Confirm password
            </AuthFieldLabel>
            <AuthPasswordField
              id="confirmPassword"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
            />
          </div>
        ) : null}

        {mode === "signin" ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm font-semibold text-primary hover:underline"
              onClick={() => {
                setDevResetUrl(null);
                setMode("forgot");
              }}
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-md shadow-sm hover:bg-primary/90"
        >
          {pending
            ? mode === "forgot"
              ? "Sending…"
              : mode === "reset"
                ? "Updating…"
                : "Signing in…"
            : mode === "forgot"
              ? "Send reset link"
              : mode === "reset"
                ? "Update password"
                : "Sign in"}
        </Button>
      </form>

      {devResetUrl ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Development reset link</p>
          <Link className="break-all underline" href={devResetUrl}>
            {devResetUrl}
          </Link>
        </div>
      ) : null}

      {mode !== "signin" ? (
        <button
          type="button"
          className="mt-5 w-full text-center text-sm font-semibold text-primary hover:underline"
          onClick={() => {
            setMode("signin");
            setPassword("");
            setConfirmPassword("");
            setDevResetUrl(null);
            if (resetToken) router.replace("/login");
          }}
        >
          Back to sign in
        </button>
      ) : null}

      {mode === "signin" ? (
        <>
          <div className="relative py-6">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span className="bg-white px-3 dark:bg-slate-950">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-slate-200/90 bg-white font-medium dark:border-slate-700 dark:bg-slate-950/50"
            onClick={() => {
              const next = searchParams.get("next");
              window.location.assign(
                buildGoogleOAuthStartUrl(isSafeInternalPath(next) ? next : null)
              );
            }}
          >
            <GoogleBrandIcon className="mr-2 size-5 shrink-0" />
            Continue with Google
          </Button>
        </>
      ) : null}

      {mode === "signin" ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href="/register"
            className="font-semibold text-primary hover:underline"
          >
            Create account
          </Link>
        </p>
      ) : null}
    </div>
  );
}
