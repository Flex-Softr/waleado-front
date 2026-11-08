"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { useSubscription } from "@/features/billing/subscription-context";
import type { PlanId } from "@/types/billing";
import { isPlanId } from "@/types/billing";
import { ApiError, apiJson } from "@/lib/api";
import { Button } from "@/components/ui/button";

type ConfirmResponse = {
  planId: PlanId;
  demo: boolean;
};

export function BillingSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const gateway = searchParams.get("gateway");
  const { setPlan, refreshPlan } = useSubscription();
  const [status, setStatus] = React.useState<"idle" | "syncing" | "done" | "error">(
    "idle"
  );

  React.useEffect(() => {
    if (gateway === "sslcommerz") {
      let cancelled = false;
      (async () => {
        setStatus("syncing");
        try {
          await refreshPlan();
          if (!cancelled) {
            toast.success("Payment received", {
              description:
                "Your workspace plan was updated after SSLCommerz checkout.",
            });
            setStatus("done");
          }
        } catch (err) {
          if (!cancelled) {
            setStatus("error");
            const msg =
              err instanceof ApiError ? err.message : "Could not refresh plan";
            toast.error("Could not sync plan", { description: msg });
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    if (!sessionId) {
      setStatus("done");
      return;
    }

    let cancelled = false;
    (async () => {
      setStatus("syncing");
      try {
        const data = await apiJson<ConfirmResponse>(
          `/v1/billing/confirm?session_id=${encodeURIComponent(sessionId)}`
        );

        if (cancelled) return;

        if (isPlanId(data.planId)) {
          setPlan(data.planId);
          await refreshPlan();
          toast.success("Payment confirmed", {
            description: "Your plan is now active.",
          });
        } else if (data.demo) {
          await refreshPlan();
          toast.message("Confirm via API", {
            description:
              "Stripe is not configured on the server; your plan comes from the workspace record.",
          });
        }
        setStatus("done");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          const msg =
            err instanceof ApiError ? err.message : "Confirmation failed";
          toast.error("Could not confirm payment", { description: msg });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId, gateway, setPlan, refreshPlan]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80">
        <CheckCircle2 className="size-9 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {status === "syncing"
            ? "Confirming your subscription…"
            : "You are all set"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {gateway === "sslcommerz"
            ? "SSLCommerz redirected back after payment; your plan is loaded from the API."
            : sessionId
              ? "Your workspace plan was synced from Stripe when possible."
              : "Return to billing to choose a plan, or open the dashboard."}
        </p>
      </div>
      <Button
        type="button"
        className="rounded-xl"
        onClick={() => router.push("/")}
      >
        Back to dashboard
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => router.push("/billing")}
      >
        View plans
      </Button>
      <Link
        href="/billing"
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        Manage billing
      </Link>
    </div>
  );
}
