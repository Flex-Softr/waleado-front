import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function IntegrationQuickConnectBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-3.5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Waleado Open API Ecosystem
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Connect any platform with standard Open API credentials
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            All Waleado integrations (including WHMCS and WordPress) communicate directly via our low-latency Open API. Messages are dispatched instantly using your default connected WhatsApp session.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/api-credentials"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "gap-1.5 font-semibold shadow-xs"
            )}
          >
            <KeyRound className="size-3.5" />
            Manage API Keys
          </Link>

          <Link
            href="/devices"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5 font-semibold"
            )}
          >
            <Smartphone className="size-3.5" />
            WhatsApp Devices
          </Link>

          <Link
            href="/api-docs"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="size-3.5" />
            Open API Docs
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
