"use client";

import Link from "next/link";

import type { SystemStatus } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusCopy: Record<
  SystemStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  online: {
    label: "Online",
    dotClass: "bg-emerald-500 animate-pulse",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/80 dark:bg-emerald-950/70 dark:text-emerald-300",
  },
  offline: {
    label: "Offline",
    dotClass: "bg-rose-500",
    badgeClass:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/80 dark:bg-rose-950/70 dark:text-rose-300",
  },
  degraded: {
    label: "Degraded",
    dotClass: "bg-amber-500 animate-pulse",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/80 dark:bg-amber-950/70 dark:text-amber-300",
  },
};

type SystemStatusBarProps = {
  status: SystemStatus;
  lastUpdated: string;
  onRefresh?: () => void;
};

export function SystemStatusBar({
  status,
  lastUpdated,
  onRefresh,
}: SystemStatusBarProps) {
  const cfg = statusCopy[status] ?? statusCopy.degraded;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card px-4 py-2.5 text-xs shadow-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-semibold text-foreground">
          System Status:
        </span>
        <Badge
          variant="outline"
          className={`gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold sm:text-xs ${cfg.badgeClass}`}
        >
          <span className={`size-1.5 rounded-full ${cfg.dotClass}`} />
          {cfg.label}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Last updated · {lastUpdated}</span>
        <div className="flex items-center gap-3">
          <Button
            variant="link"
            className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
            nativeButton={false}
            render={<Link href="/billing" />}
          >
            License
          </Button>
          <span className="text-border">|</span>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs font-medium text-primary hover:underline"
            onClick={() => {
              if (onRefresh) {
                onRefresh();
                return;
              }
              window.location.reload();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
