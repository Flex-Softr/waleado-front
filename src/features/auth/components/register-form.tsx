"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, UserRound } from "lucide-react";
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
import { buildGoogleOAuthStartUrl } from "@/lib/auth-api";

export function RegisterForm() {
  const router = useRouter();
  const { register, user, isBootstrapping } = useAuth();

  React.useEffect(() => {
    if (!isBootstrapping && user) {
      router.replace("/");
    }
  }, [isBootstrapping, user, router]);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setPending(true);
    try {
      await register({
        email,
        password,
        name: name.trim() || undefined,
      });
      toast.success("Account created");
      router.replace("/");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Could not register. Try again.";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-8 space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Create account
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Get started with your free workspace today. Password: min. 8
          characters.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <AuthFieldLabel htmlFor="name">Full name</AuthFieldLabel>
          <AuthIconInput
            id="name"
            type="text"
            autoComplete="name"
            icon={UserRound}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
          />
        </div>
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
        <div className="space-y-2">
          <AuthFieldLabel htmlFor="password">Password</AuthFieldLabel>
          <AuthPasswordField
            id="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
          />
        </div>
        <div className="space-y-2">
          <AuthFieldLabel htmlFor="confirm-password">
            Confirm password
          </AuthFieldLabel>
          <AuthPasswordField
            id="confirm-password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
          />
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-md shadow-sm hover:bg-primary/90"
        >
          {pending ? "Creating…" : "Create account"}
        </Button>
      </form>

      <div className="relative py-6">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="bg-white px-3 dark:bg-slate-950">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl border-slate-200/90 bg-white font-medium dark:border-slate-700 dark:bg-slate-950/50"
        onClick={() => window.location.assign(buildGoogleOAuthStartUrl("/"))}
      >
        <GoogleBrandIcon className="mr-2 size-5 shrink-0" />
        Continue with Google
      </Button>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
