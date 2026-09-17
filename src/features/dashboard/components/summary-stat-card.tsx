import { Bot, FileText, Send, Zap } from "lucide-react";

import type { SummaryCardData } from "@/types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const summaryIcons = {
  reply: Zap,
  bulk: Send,
  bot: Bot,
  template: FileText,
} as const;

export function SummaryStatCard({ data }: { data: SummaryCardData }) {
  const Icon = summaryIcons[data.icon] ?? Send;

  return (
    <Card className="rounded-xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-2 pt-5">
        <CardTitle className="text-sm font-semibold text-card-foreground">
          {data.title}
        </CardTitle>
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted/80 text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent className="space-y-4 px-5 pb-5">
        <div className="grid gap-2.5 text-xs sm:text-sm">
          {data.rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-300"
            >
              <span className="text-slate-500 dark:text-slate-400">
                {row.label}
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {row.value}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-medium text-slate-500 sm:text-xs dark:text-slate-400">
            <span>Utilization</span>
            <span className="font-semibold text-foreground">{data.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(data.progress, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
