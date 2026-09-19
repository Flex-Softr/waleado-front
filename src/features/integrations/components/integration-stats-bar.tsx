import * as React from "react";
import { INTEGRATION_STATS } from "@/features/integrations/data/integrations-data";

export function IntegrationStatsBar() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {INTEGRATION_STATS.map((stat, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-xs transition-all hover:border-border"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {stat.label}
          </p>
          <p className="mt-1 text-lg font-bold text-foreground sm:text-xl">
            {stat.value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/80 line-clamp-1">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  );
}
