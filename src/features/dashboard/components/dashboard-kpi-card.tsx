import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ContactRound,
  DollarSign,
  Gauge,
  Megaphone,
  MessageCircle,
  Minus,
  Send,
  Smartphone,
  Users,
} from "lucide-react";

import type { DashboardKpiCardData } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const KPI_ICONS: Record<DashboardKpiCardData["iconKey"], LucideIcon> = {
  users: Users,
  revenue: DollarSign,
  messages: MessageCircle,
  delivery: Send,
  sessions: Smartphone,
  response: Gauge,
  contacts: ContactRound,
  campaigns: Megaphone,
};

const KPI_ICON_STYLES: Record<
  DashboardKpiCardData["iconKey"],
  { bg: string; text: string }
> = {
  sessions: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  messages: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
  },
  delivery: {
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  users: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400",
  },
  contacts: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  campaigns: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
  },
  revenue: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  response: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
  },
};

type DashboardKpiCardProps = {
  data: DashboardKpiCardData;
  className?: string;
};

function resolveTrend(
  data: DashboardKpiCardData
): "positive" | "negative" | "neutral" {
  if (data.trend) return data.trend;
  if (data.trendPositive === false) return "negative";
  if (data.trendPositive === true) return "positive";
  return "neutral";
}

export function DashboardKpiCard({ data, className }: DashboardKpiCardProps) {
  const Icon = KPI_ICONS[data.iconKey] ?? MessageCircle;
  const style = KPI_ICON_STYLES[data.iconKey] ?? KPI_ICON_STYLES.messages;
  const trend = resolveTrend(data);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md",
        className
      )}
    >
      <CardContent className="flex h-full flex-col justify-between p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
              style.bg,
              style.text
            )}
          >
            <Icon className="size-4.5" strokeWidth={2.2} />
          </div>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 rounded-md border-0 px-2 py-0.5 text-[11px] font-medium sm:text-xs",
              trend === "positive" &&
                "bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300",
              trend === "negative" &&
                "bg-rose-50 font-semibold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300",
              trend === "neutral" &&
                "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300"
            )}
          >
            {trend === "positive" ? (
              <ArrowUpRight className="size-3" />
            ) : trend === "negative" ? (
              <ArrowDownRight className="size-3" />
            ) : (
              <Minus className="size-3 opacity-70" />
            )}
            {data.changeLabel}
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {data.label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {data.value}
          </p>
        </div>

        <div className="border-t border-border/40 pt-2.5">
          <p className="truncate text-xs text-muted-foreground">
            {data.period}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
